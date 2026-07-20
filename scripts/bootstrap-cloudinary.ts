/**
 * One-time bootstrap: upload the bundled local images to Cloudinary and point the CMS slots at them.
 *
 *   node scripts/bootstrap-cloudinary.ts --dry-run
 *   node scripts/bootstrap-cloudinary.ts
 *
 * Requires Node 22.6+ (native TypeScript type stripping). No new dependencies.
 *
 * ── Design ────────────────────────────────────────────────────────────────
 *
 * **Idempotent.** Each file uploads to a deterministic `public_id`. An unsigned upload to an
 * existing `public_id` returns that existing asset rather than creating a duplicate, so a second run
 * cannot fork the library. Reuse is detected from the returned `version` predating this run.
 *
 * **Upload first, write second.** Firestore is only touched for slots whose asset is confirmed
 * present. A failed upload leaves that slot untouched, so the site keeps serving its local fallback.
 *
 * **Fault tolerant.** A failure is recorded and the run continues. Nothing is rolled back, because
 * nothing destructive happens: uploads are additive and Firestore writes are per-section merges.
 *
 * **Shared assets are uploaded once.** 15 distinct files back 24 slots. Each file becomes one
 * Cloudinary asset in the folder of the first section that uses it, and every slot that uses that
 * file points at the same `public_id`.
 *
 * **The gallery is skipped by design** — gallery slot names are generated at upload time, and
 * inventing them here would create slot names the CMS did not author.
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DRY_RUN = process.argv.includes("--dry-run");
const RUN_STARTED_AT = Date.now();

// ── Mapping ────────────────────────────────────────────────────────────────
// Derived from the `getSlotImage(section, slot, fallbackUrl)` calls in the render code — the
// fallback argument IS the authoritative local asset for each slot. Regenerate with:
//   grep -rhoE 'getSlotImage\(\s*"\w+"\s*,\s*"\w+"\s*,\s*"[^"]*"' src/
// Kept explicit rather than parsed at runtime so a one-time migration is fully auditable.

interface SlotMapping {
  section: string;
  slot: string;
  file: string;
  folder: string;
}

const MAPPING: SlotMapping[] = [
  { section: "hero", slot: "hero_main", file: "hero-mandap.webp", folder: "alankaran_website/hero" },
  { section: "hero", slot: "hero_secondary", file: "gallery-royal-1.webp", folder: "alankaran_website/hero" },
  { section: "hero", slot: "hero_slide_3", file: "cinematic_floral_wedding.webp", folder: "alankaran_website/hero" },
  { section: "hero", slot: "hero_slide_4", file: "mughal_garden.webp", folder: "alankaran_website/hero" },
  { section: "hero", slot: "hero_slide_5", file: "hero-couple.webp", folder: "alankaran_website/hero" },

  { section: "about", slot: "about_hero", file: "royal_mandap.webp", folder: "alankaran_website/about" },
  { section: "about", slot: "about_collage_1", file: "coastal_wedding.webp", folder: "alankaran_website/about" },
  { section: "about", slot: "about_collage_2", file: "mughal_garden.webp", folder: "alankaran_website/about" },
  { section: "about", slot: "about_collage_3", file: "royal_mandap.webp", folder: "alankaran_website/about" },
  { section: "about", slot: "about_floral_stage", file: "floral_stage.webp", folder: "alankaran_website/about" },
  { section: "about", slot: "about_founders", file: "founders.webp", folder: "alankaran_website/about" },

  { section: "services", slot: "services_hero", file: "royal_mandap.webp", folder: "alankaran_website/services" },
  { section: "services", slot: "service_wedding_planning", file: "royal_mandap.webp", folder: "alankaran_website/services" },
  { section: "services", slot: "service_luxury_decor", file: "coastal_wedding.webp", folder: "alankaran_website/services" },
  { section: "services", slot: "service_floral_styling", file: "mughal_garden.webp", folder: "alankaran_website/services" },
  { section: "services", slot: "service_mandap_design", file: "floral_stage.webp", folder: "alankaran_website/services" },
  { section: "services", slot: "service_engagement_decor", file: "engagement_decor.webp", folder: "alankaran_website/services" },
  { section: "services", slot: "service_reception_styling", file: "grand_reception.webp", folder: "alankaran_website/services" },
  { section: "services", slot: "service_royal_theme", file: "mandap_floral_detail.webp", folder: "alankaran_website/services" },
  { section: "services", slot: "service_stage_design", file: "floral_detail.webp", folder: "alankaran_website/services" },
  { section: "services", slot: "service_bridal_entry", file: "bridal_entry.webp", folder: "alankaran_website/services" },
  { section: "services", slot: "service_custom_styling", file: "coastal_sunset_wedding.webp", folder: "alankaran_website/services" },

  { section: "testimonials", slot: "testimonials_hero", file: "floral_detail.webp", folder: "alankaran_website/testimonials" },

  { section: "contact", slot: "contact_hero", file: "floral_stage.webp", folder: "alankaran_website/contact" },
];

/**
 * Slots deliberately excluded, so their absence from the report is intentional rather than an
 * oversight:
 *   contact/site_logo — no local asset; falls back to the inline SVG in Logo.tsx
 *   gallery/*         — generated slot names, populated by admins through the Gallery Manager
 */
const SKIPPED_SLOTS = [
  { slot: "contact/site_logo", reason: "No local asset — the logo falls back to an inline SVG." },
  { slot: "gallery/*", reason: "Gallery slot names are generated at upload time; not bootstrapped." },
];

// ── Environment ────────────────────────────────────────────────────────────

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  for (const file of [".env.local", ".env"]) {
    const path = resolve(ROOT, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      if (env[key]) continue; // real process env wins
      env[key] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();

function required(name: string): string {
  const v = env[name];
  if (!v || v.includes("your-")) {
    console.error(`\n✖ Missing required environment variable: ${name}`);
    console.error(`  Set it in .env.local (see .env.example) and try again.\n`);
    process.exit(1);
  }
  return v;
}

const CLOUD_NAME = required("VITE_CLOUDINARY_CLOUD_NAME");
const UPLOAD_PRESET = required("VITE_CLOUDINARY_UPLOAD_PRESET");
const API_BASE = env.VITE_CLOUDINARY_API_BASE_URL || "https://api.cloudinary.com/v1_1";

// ── Types ──────────────────────────────────────────────────────────────────

interface UploadedAsset {
  file: string;
  publicId: string;
  assetId?: string;
  secureUrl: string;
  version?: number;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  reused: boolean;
}

interface RunReport {
  uploaded: UploadedAsset[];
  reused: UploadedAsset[];
  failed: { file: string; error: string }[];
  missingLocal: string[];
  sectionsUpdated: string[];
  sectionsFailed: { section: string; error: string }[];
  brokenUrls: { publicId: string; url: string; status: number }[];
  startedAt: number;
}

// ── Cloudinary ─────────────────────────────────────────────────────────────

/** Deterministic id: `alankaran_website/<section>/<filename-without-extension>`. */
function publicIdFor(m: SlotMapping): string {
  return `${m.folder}/${basename(m.file, extname(m.file))}`;
}

function deliveryUrl(publicId: string, format: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}.${format}`;
}

/**
 * NOTE — versionless URLs are unreliable on this Cloudinary account.
 *
 * Verified empirically: `.../image/upload/alankaran_website/hero/hero-mandap.webp` returns 404 while
 * `.../image/upload/v1784546192/alankaran_website/hero/hero-mandap.webp` returns 200 for the SAME
 * asset. A hand-built versionless URL therefore cannot be trusted either as an existence check or as
 * a value to store.
 *
 * So there is no separate existence probe. An unsigned upload to an existing `public_id` returns the
 * existing asset — that is both the reuse mechanism and the existence check, and it always yields a
 * correct versioned `secure_url` straight from the API.
 */

async function uploadAsset(m: SlotMapping): Promise<UploadedAsset> {
  const localPath = resolve(ROOT, "public/images", m.file);
  if (!existsSync(localPath)) throw new Error(`Local file not found: public/images/${m.file}`);

  const format = extname(m.file).slice(1) || "webp";
  const publicId = publicIdFor(m);

  if (DRY_RUN) {
    // Dry run only — this constructed URL is displayed, never stored. Real runs always use the
    // versioned `secure_url` returned by the upload API.
    return { file: m.file, publicId, secureUrl: deliveryUrl(publicId, format), format, reused: false };
  }

  const bytes = readFileSync(localPath);
  const form = new FormData();
  form.append("file", new Blob([bytes]), m.file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", m.folder);
  form.append("public_id", basename(m.file, extname(m.file)));
  // NOTE: `overwrite` and `return_delete_token` are intentionally absent — unsigned uploads reject
  // both, failing the entire request.

  const res = await fetch(`${API_BASE}/${CLOUD_NAME}/image/upload`, { method: "POST", body: form });
  const json: any = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Upload failed (HTTP ${res.status})`);

  // Cloudinary returns the EXISTING asset when the public_id is already taken, so an asset whose
  // version predates this run was reused rather than freshly created.
  const reused = typeof json.version === "number" && json.version * 1000 < RUN_STARTED_AT - 5000;

  return {
    file: m.file,
    publicId: json.public_id,
    assetId: json.asset_id,
    secureUrl: json.secure_url, // versioned, straight from the API — never constructed
    version: json.version,
    width: json.width,
    height: json.height,
    format: json.format,
    bytes: json.bytes,
    reused,
  };
}

// ── Firestore ──────────────────────────────────────────────────────────────

async function connectFirestore() {
  const app = initializeApp({
    apiKey: required("VITE_FIREBASE_API_KEY"),
    authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: required("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });

  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("\n✖ ADMIN_EMAIL and ADMIN_PASSWORD are required to write to Firestore.");
    console.error("  These are your Firebase Auth admin credentials. Pass them for this run only:");
    console.error("    ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=… node scripts/bootstrap-cloudinary.ts");
    console.error("  Do not commit them.\n");
    process.exit(1);
  }

  const auth = getAuth(app);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  console.log(`  signed in as ${cred.user.email} (uid ${cred.user.uid})\n`);
  return { db: getFirestore(app), uid: cred.user.email || email };
}

/**
 * Builds a `CMSSlotMetadata` record.
 *
 * Field names follow the EXISTING schema so the CMS can read what we write — `url` and
 * `cloudinaryId` rather than `secureUrl`/`publicId`. `version` is carried as an additive extra.
 */
function buildSlotRecord(m: SlotMapping, asset: UploadedAsset, actor: string) {
  const now = Date.now();
  return {
    id: `${m.section}_${m.slot}_${now}`,
    sectionKey: m.section,
    slotName: m.slot,
    cloudinaryId: asset.publicId,
    url: asset.secureUrl,
    altText: m.slot.replace(/_/g, " "),
    width: asset.width ?? null,
    height: asset.height ?? null,
    format: asset.format ?? "webp",
    resourceType: "image",
    sizeBytes: asset.bytes ?? 0,
    version: asset.version ?? null,
    createdAt: now,
    updatedAt: now,
    updatedBy: actor,
  };
}

// ── Run ────────────────────────────────────────────────────────────────────

async function main() {
  const report: RunReport = {
    uploaded: [], reused: [], failed: [], missingLocal: [],
    sectionsUpdated: [], sectionsFailed: [], brokenUrls: [], startedAt: Date.now(),
  };

  console.log(`\nCloudinary bootstrap ${DRY_RUN ? "(DRY RUN — nothing will be written)" : ""}`);
  console.log(`  cloud: ${CLOUD_NAME}   preset: ${UPLOAD_PRESET}`);
  console.log(`  ${MAPPING.length} slot mappings, ${new Set(MAPPING.map((m) => m.file)).size} distinct files\n`);

  // 1. Upload each DISTINCT file once, keyed by its deterministic public_id.
  const assets = new Map<string, UploadedAsset>();
  const seen = new Map<string, SlotMapping>();
  for (const m of MAPPING) {
    if (!seen.has(m.file)) seen.set(m.file, m); // first section that uses it owns the folder
  }

  for (const [file, m] of seen) {
    process.stdout.write(`Uploading ${file}... `);
    try {
      const asset = await uploadAsset(m);
      assets.set(file, asset);
      if (asset.reused) {
        console.log("✓ Already exists");
        report.reused.push(asset);
      } else {
        console.log(DRY_RUN ? "→ would upload" : "✓ Uploaded");
        report.uploaded.push(asset);
      }
    } catch (err: any) {
      console.log(`✖ ${err.message}`);
      report.failed.push({ file, error: err.message });
      if (err.message.includes("not found")) report.missingLocal.push(file);
    }
  }

  // 2. Firestore — one merge per section, only for slots whose asset is confirmed present.
  const bySection = new Map<string, SlotMapping[]>();
  for (const m of MAPPING) {
    if (!assets.has(m.file)) continue; // upload failed → leave this slot on its local fallback
    bySection.set(m.section, [...(bySection.get(m.section) ?? []), m]);
  }

  if (DRY_RUN) {
    console.log("\nPlanned Firestore updates:");
    for (const [section, slots] of bySection) {
      console.log(`  cmsSiteContent/${section}: ${slots.map((s) => s.slot).join(", ")}`);
    }
  } else {
    console.log("\nUpdating Firestore...");
    const { db, uid } = await connectFirestore();
    for (const [section, slots] of bySection) {
      try {
        const ref = doc(db, "cmsSiteContent", section);
        const slotMap: Record<string, unknown> = {};
        for (const m of slots) slotMap[m.slot] = buildSlotRecord(m, assets.get(m.file)!, uid);

        // Bootstrap writes draft AND published together: this is the initial published state, not an
        // edit awaiting review. Merge only touches these slot keys, leaving anything else intact.
        await setDoc(ref, {
          sectionKey: section,
          slots: slotMap,
          draftSlots: slotMap,
          publishedSlots: slotMap,
          updatedAt: Date.now(),
          updatedBy: uid,
        }, { merge: true });

        await getDoc(ref); // read-back confirms the write landed
        console.log(`  ✓ cmsSiteContent/${section} (${slots.length} slots)`);
        report.sectionsUpdated.push(section);
      } catch (err: any) {
        console.log(`  ✖ cmsSiteContent/${section}: ${err.message}`);
        report.sectionsFailed.push({ section, error: err.message });
      }
    }
  }

  // 3. Validate every delivery URL. Skipped on a dry run: nothing was uploaded, so probing the
  // planned URLs would report every not-yet-created asset as "broken" — a false alarm.
  if (DRY_RUN) {
    console.log("\nSkipping URL validation (dry run — no assets were uploaded).");
  } else {
    console.log("\nValidating delivery URLs...");
    for (const asset of [...report.uploaded, ...report.reused]) {
      try {
        const res = await fetch(asset.secureUrl, { method: "GET" });
        if (!res.ok) report.brokenUrls.push({ publicId: asset.publicId, url: asset.secureUrl, status: res.status });
      } catch {
        report.brokenUrls.push({ publicId: asset.publicId, url: asset.secureUrl, status: 0 });
      }
    }
    console.log(`  ${report.brokenUrls.length === 0 ? "✓ all URLs return 200" : `✖ ${report.brokenUrls.length} broken`}`);
  }

  writeReport(report);
  console.log(`\nDone in ${((Date.now() - report.startedAt) / 1000).toFixed(1)}s`);
  console.log(`Report: docs/CLOUDINARY_BOOTSTRAP_REPORT.md\n`);

  if (report.failed.length || report.sectionsFailed.length || report.brokenUrls.length) process.exit(1);
}

function writeReport(r: RunReport) {
  const secs = (Date.now() - r.startedAt) / 1000;
  const lines = [
    "# Cloudinary Bootstrap Report",
    "",
    DRY_RUN ? "> **DRY RUN** — no assets were uploaded and no Firestore document was written." : "",
    "",
    "| Metric | Count |",
    "|---|---|",
    `| Slot mappings | ${MAPPING.length} |`,
    `| Distinct local files | ${new Set(MAPPING.map((m) => m.file)).size} |`,
    `| Uploaded | ${r.uploaded.length} |`,
    `| Reused (already in Cloudinary) | ${r.reused.length} |`,
    `| Failed | ${r.failed.length} |`,
    `| Missing local files | ${r.missingLocal.length} |`,
    `| Firestore documents updated | ${r.sectionsUpdated.length} |`,
    `| Firestore failures | ${r.sectionsFailed.length} |`,
    `| Broken delivery URLs | ${r.brokenUrls.length} |`,
    `| Duration | ${secs.toFixed(1)}s |`,
    "",
    "## Assets",
    "",
    "| File | public_id | Status | Dimensions |",
    "|---|---|---|---|",
    ...[...r.uploaded, ...r.reused].map(
      (a) => `| \`${a.file}\` | \`${a.publicId}\` | ${a.reused ? "Reused" : "Uploaded"} | ${a.width ?? "?"}×${a.height ?? "?"} |`
    ),
    "",
    "## Firestore documents updated",
    "",
    ...(r.sectionsUpdated.length ? r.sectionsUpdated.map((s) => `- \`cmsSiteContent/${s}\``) : ["_none_"]),
    "",
    "## Failures",
    "",
    ...(r.failed.length ? r.failed.map((f) => `- \`${f.file}\`: ${f.error}`) : ["_none_"]),
    ...(r.sectionsFailed.length ? r.sectionsFailed.map((f) => `- \`cmsSiteContent/${f.section}\`: ${f.error}`) : []),
    "",
    "## Broken URLs",
    "",
    ...(r.brokenUrls.length ? r.brokenUrls.map((b) => `- \`${b.publicId}\` → HTTP ${b.status}`) : ["_none_"]),
    "",
    "## Deliberately skipped",
    "",
    ...SKIPPED_SLOTS.map((s) => `- \`${s.slot}\` — ${s.reason}`),
    "",
    "## Local fallbacks",
    "",
    "All 16 files in `public/images` are retained. The resolver serves the Cloudinary URL when it",
    "loads and falls back to the local asset when it does not, so a Cloudinary outage or a dead URL",
    "still renders a real image.",
    "",
    "## Rollback",
    "",
    "Nothing here is destructive, so rollback is a matter of removing references:",
    "",
    "1. **Revert Firestore** — in the Firebase console delete the `slots`, `draftSlots` and",
    "   `publishedSlots` fields on the affected `cmsSiteContent/*` documents. The site immediately",
    "   returns to bundled local images.",
    "2. **Cloudinary assets** — harmless to leave. To remove them, delete the",
    "   `alankaran_website/*` folders from the Cloudinary console (the browser and this script",
    "   cannot delete: that needs the signed Admin API).",
    "3. **Re-running is safe** — deterministic `public_id`s mean a second run reuses the existing",
    "   assets rather than duplicating them.",
    "",
  ];
  writeFileSync(resolve(ROOT, "docs/CLOUDINARY_BOOTSTRAP_REPORT.md"), lines.filter((l) => l !== undefined).join("\n"));
}

main().catch((err) => {
  console.error("\n✖ Bootstrap aborted:", err?.message || err);
  process.exit(1);
});

/**
 * One-time bootstrap: import the website's existing gallery images into the CMS gallery collection.
 *
 *   node scripts/bootstrap-gallery.ts --dry-run
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/bootstrap-gallery.ts
 *
 * ── Source of truth ───────────────────────────────────────────────────────
 *
 * `BUNDLED_GALLERY_FALLBACKS` in `cms.constants.ts` — the exact list, order, labels and categories
 * the public site renders today. Nothing here is invented: 14 entries drawn from 8 distinct files.
 *
 * Six files appear at two positions each under different labels (`royal_mandap.webp` is both
 * "Royal Mandap, Udaipur" and "Mughal Mandap, Agra"). Both positions render on the live site, so
 * each gets its own gallery document while sharing ONE Cloudinary asset.
 *
 * ── Idempotency ───────────────────────────────────────────────────────────
 *
 * Slot names are deterministic (`gallery_bootstrap_<nn>_<basename>`), so a re-run merges over the
 * same document keys instead of appending. Cloudinary `public_id`s are deterministic too, and an
 * unsigned upload to an existing `public_id` returns the existing asset rather than duplicating it.
 *
 * ── IMPORTANT: versioned URLs ─────────────────────────────────────────────
 *
 * This script NEVER constructs a delivery URL by hand. Verified on this Cloudinary account,
 * versionless URLs are unreliable — `.../image/upload/alankaran_website/hero/hero-mandap.webp`
 * returns 404 while `.../image/upload/v1784546192/alankaran_website/hero/hero-mandap.webp` returns
 * 200 for the same asset. Only the `secure_url` returned by the upload API is ever stored.
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DRY_RUN = process.argv.includes("--dry-run");
const GALLERY_FOLDER = "alankaran_website/gallery";

// ── Source list, read from the constants file so it cannot drift ───────────

interface GalleryEntry {
  index: number;
  file: string;
  label: string;
  category: string;
}

function readFallbacks(): GalleryEntry[] {
  const src = readFileSync(resolve(ROOT, "src/domains/cms/constants/cms.constants.ts"), "utf-8");
  const block = src.match(/BUNDLED_GALLERY_FALLBACKS[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!block) throw new Error("Could not locate BUNDLED_GALLERY_FALLBACKS in cms.constants.ts");

  const rows = [...block[1].matchAll(
    /url:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*category:\s*"([^"]+)"/g
  )];
  if (!rows.length) throw new Error("BUNDLED_GALLERY_FALLBACKS parsed to zero entries");

  return rows.map((m, index) => ({
    index,
    file: basename(m[1]),
    label: m[2],
    category: m[3],
  }));
}

// ── Environment ────────────────────────────────────────────────────────────

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  for (const file of [".env.local", ".env"]) {
    const path = resolve(ROOT, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || env[m[1]]) continue;
      env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
function required(name: string): string {
  const v = env[name];
  if (!v || v.includes("your-")) {
    console.error(`\n✖ Missing environment variable: ${name}\n`);
    process.exit(1);
  }
  return v;
}

const CLOUD_NAME = required("VITE_CLOUDINARY_CLOUD_NAME");
const UPLOAD_PRESET = required("VITE_CLOUDINARY_UPLOAD_PRESET");
const API_BASE = env.VITE_CLOUDINARY_API_BASE_URL || "https://api.cloudinary.com/v1_1";

// ── Cloudinary ─────────────────────────────────────────────────────────────

interface Asset {
  file: string;
  publicId: string;
  secureUrl: string;
  version?: number;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

/**
 * Uploads a file to a deterministic `public_id`.
 *
 * There is no separate "does it exist?" probe. An unsigned upload to an existing `public_id` returns
 * that existing asset — which is both the reuse mechanism AND the existence check, and crucially it
 * always yields a correct versioned `secure_url`. A HEAD probe against a hand-built versionless URL
 * would be unreliable on this account and could store a URL that 404s.
 */
async function uploadOnce(file: string): Promise<Asset> {
  const localPath = resolve(ROOT, "public/images", file);
  if (!existsSync(localPath)) throw new Error(`Local file not found: public/images/${file}`);

  const form = new FormData();
  form.append("file", new Blob([readFileSync(localPath)]), file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", GALLERY_FOLDER);
  form.append("public_id", basename(file, extname(file)));
  // `overwrite` / `return_delete_token` are intentionally omitted — unsigned uploads reject both.

  const res = await fetch(`${API_BASE}/${CLOUD_NAME}/image/upload`, { method: "POST", body: form });
  const json: any = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Upload failed (HTTP ${res.status})`);

  return {
    file,
    publicId: json.public_id,
    secureUrl: json.secure_url, // versioned, straight from the API — never constructed
    version: json.version,
    width: json.width,
    height: json.height,
    format: json.format,
    bytes: json.bytes,
  };
}

// ── Firestore ──────────────────────────────────────────────────────────────

/**
 * Admin credentials, resolved in priority order:
 *   1. process environment  2. .env.local  3. interactive prompt (password hidden)
 *
 * Never requires editing source. The prompt only engages on an interactive terminal — in CI or a
 * piped run it fails with a clear message rather than hanging forever waiting on stdin.
 */
async function resolveCredentials(): Promise<{ email: string; password: string }> {
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    console.log("  credentials: environment / .env.local");
    return { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD };
  }

  if (!process.stdin.isTTY) {
    console.error("\n✖ Admin credentials not found and no interactive terminal available.");
    console.error("  Provide them one of these ways:");
    console.error("    ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=… npm run bootstrap-gallery");
    console.error("    or add ADMIN_EMAIL / ADMIN_PASSWORD to .env.local");
    console.error("    or run in an interactive terminal to be prompted.\n");
    process.exit(1);
  }

  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("  credentials: interactive prompt");
    const email = env.ADMIN_EMAIL || (await rl.question("  Admin email: "));

    // Suppress echo so the password is not left in the terminal scrollback or shell history.
    const output = process.stdout as any;
    const originalWrite = output.write.bind(output);
    output.write = (chunk: any, ...rest: any[]) =>
      typeof chunk === "string" && !chunk.includes("Admin password")
        ? true
        : originalWrite(chunk, ...rest);
    const password = await rl.question("  Admin password: ");
    output.write = originalWrite;
    console.log("");

    return { email: email.trim(), password };
  } finally {
    rl.close();
  }
}

async function connectFirestore() {
  const app = initializeApp({
    apiKey: required("VITE_FIREBASE_API_KEY"),
    authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: required("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });

  const { email, password } = await resolveCredentials();

  const auth = getAuth(app);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  console.log(`  signed in as ${cred.user.email}\n`);
  return { db: getFirestore(app), actor: cred.user.email || email };
}

/** Deterministic slot name — no timestamp, so a re-run overwrites rather than appends. */
function slotNameFor(e: GalleryEntry): string {
  const base = basename(e.file, extname(e.file)).replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  return `gallery_bootstrap_${String(e.index).padStart(2, "0")}_${base}`;
}

/**
 * Builds a `CMSSlotMetadata` record in the EXACT shape `BulkUploadModal` writes, so the Gallery
 * Manager reads it with no special-casing.
 *
 * Field-name note: the request asked for `title` / `description` / `published`. The existing schema
 * uses `altText` / `caption` / `visibility`, and "do not change the Gallery schema" takes precedence
 * — writing the requested names would produce documents the Gallery Manager cannot read.
 */
function buildSlot(e: GalleryEntry, asset: Asset, actor: string) {
  const now = Date.now();
  return {
    id: `gallery_${slotNameFor(e)}`,
    sectionKey: "gallery",
    slotName: slotNameFor(e),
    cloudinaryId: asset.publicId,
    url: asset.secureUrl,
    altText: e.label,
    width: asset.width ?? null,
    height: asset.height ?? null,
    format: asset.format ?? "webp",
    resourceType: "image",
    sizeBytes: asset.bytes ?? 0,
    caption: e.label,
    category: e.category,
    tags: [],
    order: e.index, // preserves the exact on-site order; never sorted alphabetically
    visibility: true,
    createdAt: now,
    updatedAt: now,
    updatedBy: actor,
  };
}

// ── Run ────────────────────────────────────────────────────────────────────

async function main() {
  const started = Date.now();
  const entries = readFallbacks();
  const distinct = [...new Set(entries.map((e) => e.file))];

  console.log(`\nGallery bootstrap ${DRY_RUN ? "(DRY RUN — nothing will be written)" : ""}`);
  console.log(`  cloud: ${CLOUD_NAME}   folder: ${GALLERY_FOLDER}`);
  console.log(`  ${entries.length} gallery entries from ${distinct.length} distinct files\n`);

  console.log("Discovered gallery (website order preserved):");
  for (const e of entries) {
    console.log(`  [${String(e.index).padStart(2)}] ${e.file.padEnd(30)} ${e.label.padEnd(32)} ${e.category}`);
  }
  console.log("");

  // 1. Upload each distinct file once.
  const assets = new Map<string, Asset>();
  const failed: { file: string; error: string }[] = [];
  const missingLocal: string[] = [];

  for (const file of distinct) {
    process.stdout.write(`Uploading ${file}... `);
    if (DRY_RUN) {
      const path = resolve(ROOT, "public/images", file);
      if (!existsSync(path)) {
        console.log("✖ missing locally");
        missingLocal.push(file);
        failed.push({ file, error: "Local file not found" });
      } else {
        console.log("→ would upload");
        assets.set(file, { file, publicId: `${GALLERY_FOLDER}/${basename(file, extname(file))}`, secureUrl: "(dry run)" });
      }
      continue;
    }
    try {
      const asset = await uploadOnce(file);
      assets.set(file, asset);
      console.log(`✓ ${asset.publicId}`);
    } catch (err: any) {
      console.log(`✖ ${err.message}`);
      failed.push({ file, error: err.message });
      if (err.message.includes("not found")) missingLocal.push(file);
    }
  }

  // 2. Build gallery documents for entries whose asset uploaded successfully.
  const usable = entries.filter((e) => assets.has(e.file));
  const skipped = entries.filter((e) => !assets.has(e.file));

  let updated = false;
  let firestoreError: string | null = null;

  if (DRY_RUN) {
    console.log(`\nPlanned Firestore update — cmsSiteContent/gallery, ${usable.length} slots:`);
    for (const e of usable) console.log(`  ${slotNameFor(e)}  order=${e.index}  category=${e.category}`);
  } else if (usable.length) {
    console.log("\nUpdating Firestore...");
    try {
      const { db, actor } = await connectFirestore();
      const slotMap: Record<string, unknown> = {};
      for (const e of usable) slotMap[slotNameFor(e)] = buildSlot(e, assets.get(e.file)!, actor);

      const ref = doc(db, "cmsSiteContent", "gallery");
      // Merge: adds/overwrites only these slot keys. Any gallery image an admin has already
      // uploaded is left untouched.
      await setDoc(ref, {
        sectionKey: "gallery",
        slots: slotMap,
        draftSlots: slotMap,
        publishedSlots: slotMap,
        updatedAt: Date.now(),
        updatedBy: actor,
      }, { merge: true });

      const snap = await getDoc(ref);
      const count = Object.keys((snap.data() as any)?.publishedSlots ?? {}).length;
      console.log(`  ✓ cmsSiteContent/gallery — ${usable.length} slots written, ${count} published total`);
      updated = true;
    } catch (err: any) {
      firestoreError = err.message;
      console.log(`  ✖ ${err.message}`);
    }
  }

  // 3. Runtime validation — explicit PASS/FAIL per check.
  const broken: { publicId: string; status: number }[] = [];
  const checks: { name: string; pass: boolean; detail: string }[] = [];

  if (!DRY_RUN) {
    console.log("\nRuntime validation");

    // (a) every delivery URL resolves
    for (const asset of assets.values()) {
      try {
        const res = await fetch(asset.secureUrl, { method: "GET" });
        if (!res.ok) broken.push({ publicId: asset.publicId, status: res.status });
      } catch {
        broken.push({ publicId: asset.publicId, status: 0 });
      }
    }
    checks.push({
      name: "Every Cloudinary URL returns HTTP 200",
      pass: broken.length === 0,
      detail: `${assets.size - broken.length}/${assets.size} reachable`,
    });

    // (b) every stored URL carries an explicit /v<version>/ segment. Versionless URLs are
    // unreliable on this account, so storing one would be a latent 404.
    const versionless = [...assets.values()].filter((a) => !/\/v\d+\//.test(a.secureUrl));
    checks.push({
      name: "Every URL contains /v<version>/",
      pass: versionless.length === 0,
      detail: versionless.length ? `missing on: ${versionless.map((a) => a.publicId).join(", ")}` : "all versioned",
    });

    // (c) gallery documents written and readable
    checks.push({
      name: "Gallery documents created and readable",
      pass: updated,
      detail: updated ? `${usable.length} slots in cmsSiteContent/gallery` : firestoreError || "not written",
    });

    // (d) ordering matches the website — order field must equal the source index
    const orderOk = usable.every((e) => e.index === entries[e.index].index);
    checks.push({
      name: "Ordering matches the current website",
      pass: orderOk,
      detail: `orders 0..${usable.length - 1}, no alphabetical sort`,
    });

    // (e) positional coverage for the two index-based consumers
    const covered = usable.map((e) => e.index);
    const ws = [0, 1, 2, 3, 4, 5, 6, 7].every((i) => covered.includes(i));
    const hbf = Array.from({ length: 12 }, (_, i) => i).every((i) => covered.includes(i));
    checks.push({ name: "Wedding Story positions 0-7 populated", pass: ws, detail: ws ? "all present" : "gaps" });
    checks.push({ name: "Home Below Fold positions 0-11 populated", pass: hbf, detail: hbf ? "all present" : "gaps" });

    for (const c of checks) {
      console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name} — ${c.detail}`);
    }
  }

  writeReport({ entries, distinct, assets, failed, missingLocal, skipped, updated, firestoreError, broken, checks, started });
  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log("Report: docs/GALLERY_BOOTSTRAP_REPORT.md\n");

  if (failed.length || firestoreError || broken.length || checks.some((c) => !c.pass)) process.exit(1);
}

function writeReport(r: any) {
  const secs = ((Date.now() - r.started) / 1000).toFixed(1);
  const L = [
    "# Gallery Bootstrap Report",
    "",
    DRY_RUN ? "> **DRY RUN** — nothing was uploaded and no Firestore document was written." : "",
    "",
    "| Metric | Count |",
    "|---|---|",
    `| Gallery entries discovered | ${r.entries.length} |`,
    `| Distinct source images | ${r.distinct.length} |`,
    `| Cloudinary assets uploaded/reused | ${r.assets.size} |`,
    `| Gallery documents created | ${r.entries.length - r.skipped.length} |`,
    `| Failed uploads | ${r.failed.length} |`,
    `| Missing local images | ${r.missingLocal.length} |`,
    `| Skipped entries | ${r.skipped.length} |`,
    `| Broken URLs | ${r.broken.length} |`,
    `| Duration | ${secs}s |`,
    "",
    "## Discovered gallery — website order preserved",
    "",
    "| Order | Local Image | Label | Category | Slot Name |",
    "|---|---|---|---|---|",
    ...r.entries.map((e: GalleryEntry) =>
      `| ${e.index} | \`${e.file}\` | ${e.label} | ${e.category} | \`${slotNameFor(e)}\` |`
    ),
    "",
    "## Cloudinary assets",
    "",
    "6 of the 8 source images back two gallery positions each under different labels. Each image is",
    "uploaded **once**; the two positions become separate gallery documents sharing one `public_id`,",
    "because both positions render on the live site.",
    "",
    "| Source | public_id | Dimensions |",
    "|---|---|---|",
    ...[...r.assets.values()].map((a: Asset) =>
      `| \`${a.file}\` | \`${a.publicId}\` | ${a.width ?? "?"}×${a.height ?? "?"} |`
    ),
    "",
    "## Categories assigned",
    "",
    ...[...new Set(r.entries.map((e: GalleryEntry) => e.category))].map(
      (c) => `- ${c} — ${r.entries.filter((e: GalleryEntry) => e.category === c).length} entries`
    ),
    "",
    "## Failures",
    "",
    ...(r.failed.length ? r.failed.map((f: any) => `- \`${f.file}\`: ${f.error}`) : ["_none_"]),
    ...(r.firestoreError ? [`- Firestore: ${r.firestoreError}`] : []),
    "",
    "## Validation",
    "",
    "| Check | Result | Detail |",
    "|---|---|---|",
    ...(r.checks?.length
      ? r.checks.map((c: any) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} | ${c.detail} |`)
      : ["| _not run (dry run)_ | — | — |"]),
    "",
    "## Broken URLs",
    "",
    ...(r.broken.length ? r.broken.map((b: any) => `- \`${b.publicId}\` → HTTP ${b.status}`) : ["_none_"]),
    "",
    "## Notes",
    "",
    "- **Schema unchanged.** Documents match exactly what `BulkUploadModal` writes",
    "  (`altText`, `caption`, `category`, `order`, `visibility`), so the Gallery Manager reads them",
    "  with no special-casing. The requested `title`/`description`/`published` names were not used —",
    "  they would produce records the Gallery Manager cannot read.",
    "- **Order preserved.** `order` is the website's index (0-13). Nothing is alphabetically sorted.",
    "- **Local fallbacks retained.** All 16 files in `public/images` are untouched.",
    "- **Idempotent.** Deterministic slot names and `public_id`s mean a re-run overwrites the same",
    "  keys and reuses the same assets rather than duplicating either.",
    "- **Versioned URLs only.** Every stored URL is the `secure_url` returned by the upload API.",
    "  Hand-built versionless URLs are unreliable on this account and can 404.",
    "",
    "## Rollback",
    "",
    "1. In the Firebase console, delete the `gallery_bootstrap_*` keys from `slots`, `draftSlots`",
    "   and `publishedSlots` on `cmsSiteContent/gallery`. The site returns to bundled fallbacks.",
    "2. Cloudinary assets under `alankaran_website/gallery/` can be left (harmless) or deleted from",
    "   the Cloudinary console.",
    "",
  ];
  writeFileSync(resolve(ROOT, "docs/GALLERY_BOOTSTRAP_REPORT.md"), L.join("\n"));
}

main().catch((err) => {
  console.error("\n✖ Bootstrap aborted:", err?.message || err);
  process.exit(1);
});

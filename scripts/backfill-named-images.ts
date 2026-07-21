/**
 * One-time repair: synchronize `publishedSlots` from `slots` for named image sections.
 *
 *   npm run backfill-named-images:dry     (read-only, no credentials needed — reads are public)
 *   npm run backfill-named-images         (prompts for admin credentials to write)
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 *
 * Named sections (hero/about/services/testimonials/contact) are instant-live: `saveSlot` now mirrors
 * every draft into `publishedSlots`. But images edited BEFORE that fix updated only `slots`, so the
 * public site still renders the old `publishedSlots`. This copies those stranded draft slots into
 * `publishedSlots`. It repairs historical data only — it does not change any runtime code.
 *
 * ── Safety & idempotency ───────────────────────────────────────────────────
 *
 *   • Only the 5 named sections are touched. Gallery, Wedding Stories, Trash, Versions, Audit Logs,
 *     Global Settings and every other collection are never read or written.
 *   • A slot is copied only when its draft DIFFERS from published AND the draft is the newer state
 *     (published missing, or draft.updatedAt >= published.updatedAt). Newer published data is never
 *     overwritten.
 *   • A draft slot is skipped (and reported) unless its Cloudinary URL exists and carries a
 *     `/v<digits>/` version segment — versionless URLs are unreliable on this account.
 *   • Merge writes touch only the changed slot keys inside `publishedSlots`, never the whole doc.
 *   • Re-running produces zero changes: once published == draft, the diff is empty.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DRY_RUN = process.argv.includes("--dry-run");

/**
 * The named image sections (mirror of `SLOT_CATALOG`'s section keys). Hardcoded and explicit so the
 * migration's scope is auditable at a glance. `gallery` is deliberately absent — it keeps its
 * Draft → Publish workflow.
 */
const NAMED_SECTIONS = ["hero", "about", "services", "testimonials", "contact"] as const;

// ── env ──
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
const req = (n: string) => {
  const v = env[n];
  if (!v || v.includes("your-")) { console.error(`\n✖ Missing ${n}\n`); process.exit(1); }
  return v;
};

async function resolveCredentials() {
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) return { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD };
  if (!process.stdin.isTTY) {
    console.error("\n✖ Admin credentials needed for the real run.");
    console.error("  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=… npm run backfill-named-images");
    console.error("  (or run the dry run, which needs no credentials.)\n");
    process.exit(1);
  }
  const rl = (await import("node:readline/promises")).createInterface({ input: process.stdin, output: process.stdout });
  try {
    const email = env.ADMIN_EMAIL || (await rl.question("  Admin email: "));
    const out = process.stdout as any; const w = out.write.bind(out);
    out.write = (c: any, ...r: any[]) => (typeof c === "string" && !c.includes("password") ? true : w(c, ...r));
    const password = await rl.question("  Admin password: "); out.write = w; console.log("");
    return { email: email.trim(), password };
  } finally { rl.close(); }
}

// ── comparison helpers ──
const VERSIONED = /\/v\d+\//;

/** The asset identity we compare on. Two slots are "the same image" when these match. */
function identity(slot: any): string {
  return JSON.stringify({ url: slot?.url ?? "", cloudinaryId: slot?.cloudinaryId ?? "" });
}

export type Verdict =
  | { action: "synced" }
  | { action: "update" }
  | { action: "skip-invalid"; reason: string }
  | { action: "skip-newer-published" };

export function classify(draftSlot: any, publishedSlot: any): Verdict {
  // Validity of the draft (the value we might promote).
  if (!draftSlot?.url) return { action: "skip-invalid", reason: "no Cloudinary URL" };
  if (!VERSIONED.test(draftSlot.url)) return { action: "skip-invalid", reason: "URL has no /v<version>/ segment" };
  if (!draftSlot?.cloudinaryId) return { action: "skip-invalid", reason: "no cloudinaryId" };

  // Already in sync?
  if (publishedSlot && identity(draftSlot) === identity(publishedSlot)) return { action: "synced" };

  // Differs — but only promote when the draft is the newer state.
  const du = Number(draftSlot.updatedAt ?? 0);
  const pu = Number(publishedSlot?.updatedAt ?? 0);
  if (publishedSlot && du < pu) return { action: "skip-newer-published" };

  return { action: "update" };
}

// ── run ──
async function main() {
  const app = initializeApp({
    apiKey: req("VITE_FIREBASE_API_KEY"),
    authDomain: req("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: req("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  const db = getFirestore(app);

  console.log(`\nNamed Image Backfill ${DRY_RUN ? "(DRY RUN — no writes)" : ""}`);

  let actor = "system@alankaran.com (backfill)";
  if (!DRY_RUN) {
    const { email, password } = await resolveCredentials();
    const cred = await signInWithEmailAndPassword(getAuth(app), email, password);
    actor = cred.user.email || email;
    console.log(`  signed in as ${actor}\n`);
  } else {
    console.log("");
  }

  const totals = { sections: 0, slots: 0, synced: 0, updated: 0, skippedNewer: 0, invalid: 0, writes: 0 };
  const invalidReport: string[] = [];

  for (const section of NAMED_SECTIONS) {
    const ref = doc(db, "cmsSiteContent", section);
    const snap = await getDoc(ref);
    totals.sections++;
    if (!snap.exists()) { console.log(`  ${section}: (no document)`); continue; }

    const data = snap.data() as any;
    const slots = data.slots || {};
    const published = data.publishedSlots || {};

    const toWrite: Record<string, any> = {};
    const lines: string[] = [];

    for (const [slotName, draftSlot] of Object.entries<any>(slots)) {
      totals.slots++;
      const verdict = classify(draftSlot, published[slotName]);
      switch (verdict.action) {
        case "synced":
          totals.synced++;
          break;
        case "update":
          totals.updated++;
          toWrite[slotName] = draftSlot;
          lines.push(`    ↑ ${slotName}  →  ${draftSlot.url.split("/").pop()}`);
          break;
        case "skip-newer-published":
          totals.skippedNewer++;
          lines.push(`    = ${slotName}  (published is newer — left as-is)`);
          break;
        case "skip-invalid":
          totals.invalid++;
          invalidReport.push(`${section}/${slotName}: ${verdict.reason}`);
          lines.push(`    ✖ ${slotName}  (${verdict.reason})`);
          break;
      }
    }

    const changeCount = Object.keys(toWrite).length;
    console.log(`  ${section}: ${Object.keys(slots).length} slots, ${changeCount} to update`);
    lines.forEach((l) => console.log(l));

    if (changeCount > 0 && !DRY_RUN) {
      // Merge write: only the changed slot keys inside publishedSlots, plus publishedAt.
      await setDoc(
        ref,
        { publishedSlots: toWrite, publishedAt: Date.now(), publishedBy: actor, updatedBy: actor },
        { merge: true }
      );
      totals.writes++;
    } else if (changeCount > 0 && DRY_RUN) {
      console.log(`    (dry run — would write ${changeCount} slot(s) to publishedSlots)`);
    }
  }

  console.log("\n──────────────────────────────");
  console.log("Named Image Backfill");
  console.log(`  Sections scanned:     ${totals.sections}`);
  console.log(`  Slots scanned:        ${totals.slots}`);
  console.log(`  Already synchronized: ${totals.synced}`);
  console.log(`  Updated:              ${totals.updated}${DRY_RUN ? " (would update)" : ""}`);
  console.log(`  Skipped (published newer): ${totals.skippedNewer}`);
  console.log(`  Invalid (skipped):    ${totals.invalid}`);
  if (!DRY_RUN) console.log(`  Firestore writes:     ${totals.writes}`);
  if (invalidReport.length) {
    console.log("\n  Invalid entries:");
    invalidReport.forEach((r) => console.log(`    • ${r}`));
  }
  console.log(DRY_RUN ? "\nDry run complete. No data was written.\n" : "\nCompleted successfully.\n");
}

// Run only when invoked directly (`node scripts/backfill-named-images.ts`), so tests can import
// `classify` without triggering a live Firestore run.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error("\n✖ Backfill aborted:", e?.message || e); process.exit(1); });
}

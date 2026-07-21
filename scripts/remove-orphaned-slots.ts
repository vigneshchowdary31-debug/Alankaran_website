/**
 * One-time cleanup: remove two legacy orphaned slot fields left over from an old slot rename.
 *
 *   npm run remove-orphaned-slots:dry     (read-only, no credentials — reads are public)
 *   npm run remove-orphaned-slots         (prompts for admin credentials to write)
 *
 * Deletes ONLY these six nested fields, using `deleteField()` (never document deletion):
 *
 *   cmsSiteContent/about     slots.about_portrait, draftSlots.about_portrait, publishedSlots.about_portrait
 *   cmsSiteContent/services  slots.service_bridal, draftSlots.service_bridal, publishedSlots.service_bridal
 *
 * These slot names are not in the catalog (renamed to `about_hero` / `service_bridal_entry`), are not
 * rendered by any page, and are referenced nowhere in application code. Idempotent: deleting an
 * absent field is a no-op, so re-running is safe.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, deleteField } from "firebase/firestore";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DRY_RUN = process.argv.includes("--dry-run");

/** The exact, exhaustive set of fields to remove. Nothing else is touched. */
const TARGETS: { section: string; slot: string }[] = [
  { section: "about", slot: "about_portrait" },
  { section: "services", slot: "service_bridal" },
];
const MAPS = ["slots", "draftSlots", "publishedSlots"] as const;

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
    console.error("  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=… npm run remove-orphaned-slots");
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

  console.log(`\nRemove Orphaned Slots ${DRY_RUN ? "(DRY RUN — no writes)" : ""}\n`);

  if (!DRY_RUN) {
    const { email, password } = await resolveCredentials();
    const cred = await signInWithEmailAndPassword(getAuth(app), email, password);
    console.log(`  signed in as ${cred.user.email}\n`);
  }

  let removed = 0;
  let alreadyGone = 0;

  for (const { section, slot } of TARGETS) {
    const ref = doc(db, "cmsSiteContent", section);
    const snap = await getDoc(ref);
    const data = (snap.exists() ? snap.data() : {}) as any;

    // Report which maps currently contain the orphan.
    const present = MAPS.filter((m) => data?.[m] && Object.prototype.hasOwnProperty.call(data[m], slot));
    console.log(`  cmsSiteContent/${section} · ${slot}`);
    for (const m of MAPS) {
      const here = present.includes(m);
      console.log(`      ${m}.${slot}: ${here ? "present → remove" : "absent → skip"}`);
      if (here) removed++; else alreadyGone++;
    }

    if (present.length > 0 && !DRY_RUN) {
      const patch: Record<string, unknown> = {};
      for (const m of present) patch[`${m}.${slot}`] = deleteField();
      await updateDoc(ref, patch);
    } else if (present.length > 0 && DRY_RUN) {
      console.log(`      (dry run — would deleteField() ${present.length} field(s))`);
    }
    console.log("");
  }

  console.log("──────────────────────────────");
  console.log(`  Fields ${DRY_RUN ? "to remove" : "removed"}: ${removed}`);
  console.log(`  Already absent: ${alreadyGone}`);
  console.log(DRY_RUN ? "\nDry run complete. No data was written.\n" : "\nCleanup complete.\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error("\n✖ Aborted:", e?.message || e); process.exit(1); });
}

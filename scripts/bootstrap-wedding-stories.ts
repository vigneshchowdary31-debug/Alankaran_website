/**
 * One-time bootstrap: import the 3 hardcoded wedding stories (and the hero) into the CMS.
 *
 *   node scripts/bootstrap-wedding-stories.ts --dry-run
 *   npm run bootstrap-wedding-stories      (prompts for admin credentials)
 *
 * Idempotent: stories use deterministic ids (`story_bootstrap_00…`) so a re-run overwrites the same
 * documents rather than appending. Cloudinary uploads use deterministic public_ids, so re-running
 * reuses the existing assets. Only the `secure_url` returned by the API is stored — never a hand-
 * built URL (versionless URLs are unreliable on this account).
 *
 * Image assignment reproduces the current page exactly: story i uses gallery-derived positions
 * i, i+1, i+2, i (the 4th deliberately mirrors the 1st, matching the original layout).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DRY_RUN = process.argv.includes("--dry-run");
const FOLDER = "alankaran_website/wedding-stories";

const STORIES = [
  {
    bride: "Priya", groom: "Arjun", location: "Udaipur, Rajasthan", month: "March", year: "2024",
    theme: "Royal Palace", palette: "Burgundy, Gold & Ivory",
    paragraph1: "The moment Priya described her dream — a ceremony that felt like stepping inside a Mughal miniature painting — we knew this would be unlike anything we'd created before. The City Palace as backdrop, Lake Pichola shimmering at dusk, and a mandap of seven thousand marigolds and white tuberoses.",
    paragraph2: "Every element was chosen to feel simultaneously ancient and perfectly of this moment. The florals took three days to install. The lighting was calibrated to the exact quality of Udaipur's evening light. On the day itself, Priya's guests fell silent as she arrived through a tunnel of hanging jasmine and soft candlelight.",
    files: ["royal_mandap.webp", "coastal_wedding.webp", "mughal_garden.webp", "royal_mandap.webp"],
  },
  {
    bride: "Meera", groom: "Rohit", location: "Goa", month: "January", year: "2024",
    theme: "Coastal Elegance", palette: "White, Coral & Sea Green",
    paragraph1: "Meera and Rohit wanted their wedding to feel like the most beautiful version of a Goa sunset — warm, unhurried, and bathed in that particular quality of coastal light that cannot be manufactured.",
    paragraph2: "The ceremony was held on the cliffs above the sea, the reception in a colonial Portuguese house transformed by thousands of white florals, rattan lanterns, and the scent of sea air mixed with jasmine. Every photograph from this wedding looks like it belongs in a magazine.",
    files: ["coastal_wedding.webp", "mughal_garden.webp", "floral_stage.webp", "coastal_wedding.webp"],
  },
  {
    bride: "Ananya", groom: "Vikram", location: "Jaipur Palace", month: "November", year: "2023",
    theme: "Mughal Garden", palette: "Sage, Ivory & Antique Gold",
    paragraph1: "Ananya and Vikram were drawn to the idea of a garden — not a decorative garden, but an immersive living environment where every surface told a story. We created a Mughal-inspired paradise: geometric planting beds of white roses and herbs, water channels of rose petals, and a marble mandap of breathtaking intricacy.",
    paragraph2: "The reception was held in a courtyard where hundreds of brass lanterns cast warm geometric shadows across whitewashed walls. It was, as one guest said, 'like a dream you've never had before, but one you'll remember forever.'",
    files: ["mughal_garden.webp", "floral_stage.webp", "bridal_entry.webp", "mughal_garden.webp"],
  },
];

const HERO_FILE = "royal_mandap.webp";

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
const req = (n: string) => { const v = env[n]; if (!v || v.includes("your-")) { console.error(`✖ missing ${n}`); process.exit(1); } return v; };
const CLOUD = req("VITE_CLOUDINARY_CLOUD_NAME");
const PRESET = req("VITE_CLOUDINARY_UPLOAD_PRESET");
const API = env.VITE_CLOUDINARY_API_BASE_URL || "https://api.cloudinary.com/v1_1";

const cache = new Map<string, any>();
async function upload(file: string) {
  if (cache.has(file)) return cache.get(file);
  const path = resolve(ROOT, "public/images", file);
  if (!existsSync(path)) throw new Error(`missing local file ${file}`);
  if (DRY_RUN) { const stub = { url: `(dry-run)/${file}`, cloudinaryId: `${FOLDER}/${basename(file, extname(file))}` }; cache.set(file, stub); return stub; }
  const form = new FormData();
  form.append("file", new Blob([readFileSync(path)]), file);
  form.append("upload_preset", PRESET);
  form.append("folder", FOLDER);
  form.append("public_id", basename(file, extname(file)));
  const res = await fetch(`${API}/${CLOUD}/image/upload`, { method: "POST", body: form });
  const j: any = await res.json();
  if (!res.ok) throw new Error(j?.error?.message || `upload failed ${res.status}`);
  const asset = { url: j.secure_url, cloudinaryId: j.public_id, width: j.width, height: j.height, format: j.format, version: j.version };
  cache.set(file, asset);
  return asset;
}

async function resolveCredentials() {
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) return { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD };
  if (!process.stdin.isTTY) { console.error("✖ set ADMIN_EMAIL / ADMIN_PASSWORD or run interactively"); process.exit(1); }
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
  console.log(`\nWedding Stories bootstrap ${DRY_RUN ? "(DRY RUN)" : ""}\n`);
  const now = Date.now();

  // Upload images (deduped).
  const built = [];
  for (let i = 0; i < STORIES.length; i++) {
    const s = STORIES[i];
    process.stdout.write(`  ${s.bride} & ${s.groom}... `);
    const images = [];
    for (const f of s.files) images.push(await upload(f));
    built.push({
      id: `story_bootstrap_${String(i).padStart(2, "0")}`,
      ...s, images, order: i, status: "published",
      createdAt: now, updatedAt: now, publishedAt: now, updatedBy: "system@alankaran.com (bootstrap)",
    });
    console.log("✓");
  }
  process.stdout.write(`  hero (${HERO_FILE})... `);
  const heroImg = await upload(HERO_FILE);
  console.log("✓");

  if (DRY_RUN) {
    console.log(`\n  would write ${built.length} stories + hero to weddingStories/`);
    for (const b of built) console.log(`    ${b.id}  order=${b.order}  images=${b.images.length}`);
    console.log("\nDone (dry run).\n");
    return;
  }

  const app = initializeApp({
    apiKey: req("VITE_FIREBASE_API_KEY"), authDomain: req("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: req("VITE_FIREBASE_PROJECT_ID"), storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: env.VITE_FIREBASE_APP_ID,
  });
  const { email, password } = await resolveCredentials();
  const cred = await signInWithEmailAndPassword(getAuth(app), email, password);
  const actor = cred.user.email || email;
  console.log(`  signed in as ${actor}\n`);
  const db = getFirestore(app);

  for (const b of built) {
    await setDoc(doc(db, "weddingStories", b.id), { ...b, updatedBy: actor }, { merge: true });
    console.log(`  ✓ weddingStories/${b.id}`);
  }
  await setDoc(doc(db, "weddingStories", "__hero"), {
    image: heroImg, publishedImage: heroImg,
    subtitle: "Real Weddings", titleLine1: "Celebrations", titleLine2: "That Live Forever",
    publishedSubtitle: "Real Weddings", publishedTitleLine1: "Celebrations", publishedTitleLine2: "That Live Forever",
    overlayOpacity: 1, publishedOverlayOpacity: 1,
    status: "published", updatedAt: now, publishedAt: now, updatedBy: actor,
  }, { merge: true });
  console.log(`  ✓ weddingStories/__hero`);

  // Validate stored URLs.
  console.log("\n  validating URLs...");
  let broken = 0;
  for (const asset of cache.values()) {
    if (asset.url.startsWith("(dry")) continue;
    const res = await fetch(asset.url, { method: "GET" });
    const versioned = /\/v\d+\//.test(asset.url);
    if (!res.ok || !versioned) { broken++; console.log(`  ✖ ${asset.cloudinaryId} status=${res.status} versioned=${versioned}`); }
  }
  console.log(`  ${broken === 0 ? "✓ all URLs 200 and versioned" : `✖ ${broken} problem(s)`}`);
  console.log(`\nDone. 3 stories + hero published.\n`);
  if (broken) process.exit(1);
}

main().catch((e) => { console.error("\n✖", e?.message || e); process.exit(1); });

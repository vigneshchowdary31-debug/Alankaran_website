# Developer Handover

Everything needed to take ownership of this project.

---

## ⚠️ Read this first

Two things must happen before the CMS works at all. Neither is a code change.

### 1. Deploy the Firestore security rules

```bash
npx firebase login
npx firebase deploy --only firestore:rules
```

Until this runs, the database uses locked-mode defaults and **rejects every read and write**. The
symptom is "Permission denied" everywhere and a permanently empty database. `firebase.json` and
`.firebaserc` are committed, so the command works as-is.

**As of handover this has never been run.** The CMS has not been exercised against live
infrastructure — all verification to date is typecheck, production build, and 77 tests against
in-memory Firestore fakes.

### 2. Verify the admin route on Vercel

`/admin` has no pre-rendered HTML file (only public routes are pre-rendered), so it depends entirely
on the SPA rewrite in `vercel.json`. After deploying, confirm `/admin`, `/admin/login` and
`/admin/dashboard` all load — including after a hard refresh, which is what exercises the rewrite.

---

## Setup

```bash
git clone <repo-url>
cd Alankaran-main
npm install
cp .env.example .env.local     # fill in real values
npm run dev
```

Node.js 20+.

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Static build + SSR pre-render → `dist/static` |
| `npm run serve` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |

---

## Environment variables

All are `VITE_`-prefixed and therefore **embedded in the client bundle**. Only publishable values
belong here — never a Cloudinary API secret or a Firebase service-account key.

See the table in [README.md](../README.md#environment-variables) for every variable.
`.env.local` is git-ignored; `.env.example` is the template.

---

## Firestore

Collections (all top-level, created on first write):

| Collection | Purpose |
|---|---|
| `cmsSiteContent` | Image slots + global settings, one doc per section |
| `cmsVersions` | Immutable publish snapshots |
| `cmsTrash` | Soft-deleted slots |
| `cmsAuditLogs` | Activity log |
| `cmsSettings` | Runtime config |
| `cmsInquiries` | Public contact-form submissions |

Rules require authentication for everything except anonymous `create` on `cmsInquiries`, which is
shape-validated in the rules themselves. No composite indexes are needed — every query uses a
single-field `orderBy`.

Schema detail: [CMS_ARCHITECTURE.md](./CMS_ARCHITECTURE.md#firestore-schema).

---

## Cloudinary

1. Note the **cloud name**.
2. Settings → Upload → Add upload preset → signing mode **Unsigned**, folder `alankaran_website`.
3. Put both in `.env.local`.

**Unsigned uploads accept only a fixed parameter allow-list.** The code deliberately omits
`return_delete_token` and `overwrite` — either causes Cloudinary to reject the whole upload.

Consequences by design:
- **Replace creates a new asset** and repoints Firestore. Reusing a `public_id` without `overwrite`
  makes Cloudinary silently return the *existing* asset, so a replace would appear to succeed while
  the image never changed.
- **Deleting never removes the Cloudinary asset.** That needs a signed Admin API call and the secret
  must not reach the browser.

---

## Deployment

**Vercel** — build `npm run build`, output `dist/static`, plus every `VITE_*` variable in Project
Settings. `vercel.json` already sets the build command, output directory, SPA rewrites and cache
headers.

**Firebase Hosting** — `"public": "dist/static"` with a SPA rewrite to `/index.html`.

Deploying the app does **not** deploy Firestore rules. Deploy them separately whenever
`firestore.rules` changes.

---

## Architecture

Read [CMS_ARCHITECTURE.md](./CMS_ARCHITECTURE.md). The three invariants:

1. No component calls Firebase directly — everything goes through `firestoreService` with typed
   `FirestorePaths`.
2. No component calls Cloudinary directly — everything goes through `IStorageProvider`.
3. One implementation per concern — one slot catalog, one publication-state module, one gallery
   resolver.

Also see [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md),
[CMS_IMAGE_MAPPING.md](./CMS_IMAGE_MAPPING.md) and
[CMS_PAGE_MAPPING.md](./CMS_PAGE_MAPPING.md).

---

## Known limitations

| # | Limitation | Impact |
|---|---|---|
| 1 | Cloudinary assets are never deleted | Orphans accumulate — storage cost grows |
| 2 | Destination Weddings is not CMS-managed | ~12 hardcoded Unsplash images, including the hero |
| 3 | Gallery feeds three pages | Reordering changes Home, Gallery and Wedding Stories together |
| 4 | Publish is per-section, not per-field | Publishing settings pushes all seven values |
| 5 | Preview mode is unreachable | Toggle removed from the public site; `previewMode` remains in the provider, permanently `false` |
| 6 | No ESLint configured | `npm run typecheck` is the only static gate |
| 7 | No component or E2E tests | Coverage is service/utility level |
| 8 | Never run end-to-end | See "Read this first" |

---

## Recommended next work, in order

1. **Deploy the rules and walk every CMS workflow in a browser.** Nothing else matters until this is
   done — it is the difference between "believed to work" and "known to work".
2. **Build the Cloudinary cleanup job.** Server-side, signed, reconciling Cloudinary against
   Firestore. It must skip anything still referenced by Trash or Version History, or it will destroy
   restorable images. This is limitation #1 and it grows over time.
3. **Add ESLint**, as a dedicated pass. Expect a few hundred findings across 166 files.
4. **Accessibility and responsive audits.** Both need a running app; neither can be done statically.
5. **Decide preview mode's fate** — either add an admin-panel toggle or remove the provider plumbing.
6. **Wire Destination Weddings to the CMS** if the client wants to edit it.

---

## Troubleshooting

**"Permission denied" everywhere, database empty**
Rules not deployed. See "Read this first". If it persists while signed in, check whether App Check is
enforced — it produces an identical error.

**`/admin` returns a Vercel 404**
The SPA rewrite isn't applying. Check Vercel → Project Settings: Root Directory must be repo root,
Output Directory empty or `dist/static`, and confirm the deployment was promoted to Production.

**Upload fails: "parameter is not allowed when using unsigned upload"**
A disallowed parameter is being sent. See the Cloudinary section.

**Changes save but don't appear on the site**
They're drafts. Publish the section.

**Deleted image still renders**
The removal is in the draft; publish the section. If it persists, confirm `removeFields()` cleared
`publishedSlots` — a merge write cannot remove a map key.

**Diagnosing a silent write failure**
Every Firestore operation traces its document path, payload, authenticated UID and raw error code to
the console in development. Set `VITE_FIRESTORE_TRACE=true` to enable in a production build.

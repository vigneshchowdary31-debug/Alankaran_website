# Release Report — RC1

**Date:** RC1 · **Branch:** `production-cleanup` · **Scope:** documentation and consistency only.
No runtime behaviour, architecture, UI or features were changed in this pass.

---

## Status summary

| Area | Status | Detail |
|---|---|---|
| Build | ✅ **Pass** | Clean production build → `dist/static`, 6.3 MB |
| TypeScript | ✅ **Pass** | Zero errors |
| Tests | ✅ **Pass** | 77/77 across 4 files |
| Documentation | ✅ **Complete** | 12 current documents; 12 stale archived |
| Lint | ⚠️ **Not configured** | No ESLint in the project |
| **Runtime verification** | ❌ **NOT VERIFIED** | The CMS has never run against live infrastructure |

---

## Runtime verification status

This is the single most important line in this report.

**Nothing in the CMS has been observed working end to end.** Across the development of this project,
`firestore.rules` has never been deployed, so every read and write to the database has been rejected.
All confidence to date rests on three things:

1. TypeScript compilation and a clean production build
2. 77 automated tests against **in-memory Firestore fakes** that faithfully model
   `setDoc(..., {merge:true})` semantics
3. Source-level tracing of every execution path

That is meaningful evidence — the test fakes reproduce real Firestore merge behaviour, which is what
caught a class of silent delete bug. But it is **not** the same as watching an image upload, publish,
and appear on the website.

Two things *were* verified against live services:

- **Cloudinary uploads** — a live unsigned upload returned `200` with a `secure_url`; the previously
  failing parameters were confirmed to be the cause of the earlier rejection.
- **Firestore rules are not deployed** — an anonymous inquiry create that the repo rules explicitly
  permit was rejected `PERMISSION_DENIED`, proving the deployed rules differ from the repo.

---

## Remaining risks

### 🔴 Critical

| Risk | Impact | Resolution |
|---|---|---|
| **Firestore rules not deployed** | The entire CMS is non-functional. Every read and write fails. | `firebase deploy --only firestore:rules,firestore:indexes` |
| **No end-to-end verification** | Any of the 14 CMS workflows could fail on first real use in a way static analysis cannot predict. | Run the smoke test in `PRODUCTION_CHECKLIST.md` |

### 🟠 High

| Risk | Impact | Resolution |
|---|---|---|
| Cloudinary assets are never deleted | Orphans accumulate from day one; storage cost grows without bound | Build a signed, server-side cleanup job reconciling against Firestore — it **must** skip anything referenced by Trash or Version History |
| `/admin` route unconfirmed on Vercel | Previously returned a Vercel 404. The SPA rewrite was corrected but never verified live. | Hard-refresh `/admin` after deploying |
| Firebase project fallback | `config/firebase.ts` falls back to a non-existent project when env vars are missing, failing with confusing "no data" symptoms instead of a loud error | Replace the fallback with a startup throw (deliberately not done in RC1 — it changes runtime behaviour) |

### 🟡 Medium

| Risk | Impact | Resolution |
|---|---|---|
| No ESLint | No static gate beyond `tsc`; style and correctness drift over time | Add as a dedicated pass; expect a few hundred findings across 159 files |
| No accessibility audit | Possible WCAG issues; legal and usability exposure | Requires a running app — cannot be done statically |
| No responsive audit | Possible layout breakage on tablet/mobile | Requires a running app |
| 32 unused npm packages | ~0 KB bundle impact (tree-shaken), but install time and audit surface | Remove **after** the smoke test — see `DEPENDENCIES.md` |
| No component or E2E tests | UI interactions, badges and modals are untested | Add `@testing-library/react` |
| Preview mode unreachable | `previewMode` remains in the provider, permanently `false`, with no way to enable it | Add an admin-panel toggle, or remove the plumbing |

### 🟢 Low

| Risk | Impact |
|---|---|
| Destination Weddings not CMS-managed | ~12 hardcoded Unsplash images, including the hero — client cannot edit that page |
| Gallery feeds three pages | Reordering changes Home, Gallery and Wedding Stories together — documented, intended, but surprising |
| Publish is per-section, not per-field | Publishing global settings pushes all seven values |
| 19 `Task N` markers in code comments | Cosmetic; not user-visible |
| `three`/`@react-three` bundle weight | Dominates JS payload for decorative 3D only; lazy-loading would help if size becomes a concern |

---

## Documentation status

**Current — 12 documents in `docs/`:**

`CMS_RUNTIME_FLOW.md` · `CMS_IMAGE_MATRIX.md` · `CMS_IMAGE_MAPPING.md` · `CMS_PAGE_MAPPING.md` ·
`CMS_ARCHITECTURE.md` · `FIRESTORE_SCHEMA.md` · `ENVIRONMENT.md` · `PRODUCTION_CHECKLIST.md` ·
`DEPENDENCIES.md` · `PROJECT_STRUCTURE.md` · `CMS_USER_GUIDE.md` · `DEVELOPER_HANDOVER.md`
Plus `README.md` at the repo root.

`CMS_IMAGE_MAPPING.md` and `CMS_IMAGE_MATRIX.md` are **generated from source** — parsed from
`SLOT_CATALOG` and the actual `getSlotImage()` call sites — so they cannot silently drift from the
code.

**Archived — 12 documents in `docs/archive/`.** Historical phase notes retained for provenance.
Seven contained actively false information (removed `delete_by_token` APIs, renamed slot names) and
carry a README marking them non-authoritative.

**Validation performed:** no stale slot names, no references to deleted files (every `src/…` path
cited in the docs was checked to exist), no removed-feature references, and slot counts are
consistent at 25 across every document. One inconsistency was found and fixed — the image matrix had
counted 26 call sites as 26 slots, where `hero_main` legitimately appears twice (rendered slide plus
SEO preload hint).

---

## Recommendation

**Stop static analysis here.** The remaining uncertainty is not the kind that more code reading can
resolve.

1. Deploy to Vercel.
2. `firebase deploy --only firestore:rules,firestore:indexes`
3. Run the 12-step smoke test in `PRODUCTION_CHECKLIST.md`.

If that sequence passes, you will have stronger evidence of production readiness than every audit in
this repository combined. If it fails, the failure will be specific and diagnosable — every Firestore
operation logs its document path, payload, authenticated UID and error code to the console.

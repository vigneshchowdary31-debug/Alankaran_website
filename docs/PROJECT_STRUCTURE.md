# Project Structure

What each folder is for, and where to make a given change.

---

## Top level

| Path | Purpose |
|---|---|
| `src/` | All application source |
| `public/` | Static assets copied verbatim into the build (bundled fallback images) |
| `docs/` | Documentation (this folder) |
| `scripts/prerender.mjs` | Static pre-render of public routes at build time |
| `firestore.rules` | Security rules — **must be deployed separately** |
| `firestore.indexes.json` | Composite indexes (intentionally empty; none required) |
| `firebase.json` / `.firebaserc` | Firebase CLI config for deploying rules |
| `vercel.json` | Build command, output directory, SPA rewrites, cache headers |
| `vite.config.ts` | Build config and `@/` path alias |
| `vitest.config.ts` | Test config |

---

## `src/` at a glance

| Folder | Contains | Change things here when… |
|---|---|---|
| `components/` | Shared UI | Editing site chrome, admin shell, upload widgets |
| `pages/` | Route components (public + `pages/admin/`) | Adding or editing a page |
| `domains/cms/` | The entire CMS as one domain | Any CMS behaviour |
| `services/` | Cross-cutting: `firestore/`, `auth/`, `cloudinary/` | Changing how data is read or written |
| `storage/` | `IStorageProvider` + Cloudinary implementation | Swapping image providers |
| `providers/` | `SiteContentProvider` | Changing how the public site reads CMS data |
| `context/` | `AuthContext`, `BookingContext` | Auth or booking-modal state |
| `hooks/` | Generic React hooks | Reusable UI behaviour |
| `config/` | Firebase & Cloudinary env readers | Configuration wiring |
| `constants/` | Routes, messages, app metadata | Adding a route constant |
| `types/` | Shared TypeScript types | Cross-cutting type changes |
| `utils/` | Formatting, validation, error mapping | Shared helpers |

---

## `src/components/`

```
components/
├── admin/          AdminLayout, AdminRouter, ProtectedRoute, ErrorBoundary
│   └── ui/         Admin design system + upload/ (ImageUpload, DeleteDialog, …)
├── home/           HeroSection, HomeBelowFold
├── common/         SiteErrorBoundary
├── ui/             Radix primitives — only the 17 actually in use
└── *.tsx           Navbar, Footer, Logo, SEO, WhatsAppButton, BookingModal, …
```

`components/ui/` is a trimmed shadcn set. 39 unused primitives were removed at handover; re-add
individually from shadcn if needed rather than restoring the whole set.

---

## `src/domains/cms/` — the CMS

Self-contained. The public site touches it only through `SiteContentProvider`.

```
domains/cms/
├── components/     SlotManager, TrashModal, GlobalSettingsManager, CMSStatusBanner
│   └── gallery/    GalleryManager, BulkUploadModal, GalleryMetadataModal, GalleryPreviewModal
├── services/       cms, auditLog, cmsCache, cmsHealth, slotCoverage, imageUsage,
│                   inquiry, systemConfig
├── constants/      cms.constants (SLOT_CATALOG), contact.constants (defaults)
├── utils/          cmsValidator, galleryResolver, globalSettingsValidator,
│                   globalSettingsDiff (publication state), envValidator
├── hooks/          useSection, useCMS, useCMSAnalytics
└── types/          cms.types
```

**Key files:**

| File | Why it matters |
|---|---|
| `constants/cms.constants.ts` | `SLOT_CATALOG` — the single source of truth for every named image. Adding a slot here is the only step needed to make it editable. |
| `utils/globalSettingsDiff.ts` | The single publication-state implementation. Nothing else may compare draft vs published. |
| `utils/galleryResolver.ts` | Decides which slot map the public site reads, and gallery ordering. |
| `services/cms.service.ts` | All slot, publish, version, trash and settings logic. |

---

## `src/services/`

```
services/
├── firestore/
│   ├── firestore.service.ts     The only Firebase SDK caller
│   ├── firestorePaths.ts        Typed document addresses
│   └── firestoreDiagnostics.ts  Write tracing (path, payload, UID, error code)
├── auth/auth.service.ts         Firebase Auth wrapper
└── cloudinary/cloudinary.service.ts  Maps storage assets to domain ImageAsset
```

---

## `src/pages/`

**Public:** Home, About, Services, DestinationWeddings, WeddingStories, Gallery, Testimonials,
Contact, not-found.

**Admin (`pages/admin/`):** Login, Dashboard, Images, Gallery, Settings, ActivityLog, Debug,
PlaceholderPage.

---

## Tests

Co-located as `*.test.ts` beside the code they cover. 77 tests across 4 files covering the
delete/trash/restore lifecycle, bulk operations, settings validation, and publication state.

```bash
npm test
```

---

## Common tasks

| Task | Where |
|---|---|
| Make a new image editable | Add a slot to `SLOT_CATALOG`, then call `getSlotImage()` in the component |
| Add a global text setting | `CMSContactInfo` type → `globalSettingsValidator` → `GlobalSettingsManager` |
| Add an admin page | Create in `pages/admin/`, export from its index, add a `ROUTES.ADMIN` entry and an `AdminRouter` route |
| Change security rules | `firestore.rules`, then `npx firebase deploy --only firestore:rules` |
| Change image provider | Implement `IStorageProvider`, swap the export in `storage/index.ts` |

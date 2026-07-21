# Wedding Stories CMS — Technical

Makes the public Wedding Stories page fully CMS-managed, reusing the existing CMS building blocks.
No new admin architecture.

## Data flow

```
Admin (/admin/wedding-stories)
  → WeddingStoriesManager
  → weddingStoriesService  → firestoreService → weddingStories/*
  → ImageUpload            → Cloudinary (alankaran_website/wedding-stories/)

Public (/wedding-stories)
  → useWeddingStories()  → weddingStoriesService (published only)
  → WeddingStories page  → Cloudinary URLs (bundled fallback if empty)
```

## Files added

| File | Role |
|---|---|
| `src/domains/cms/types/weddingStories.types.ts` | `WeddingStory`, `WeddingStoriesHero`, `WeddingStoryImage` |
| `src/domains/cms/services/weddingStories.service.ts` | CRUD, publish, archive/restore, duplicate, reorder, hero |
| `src/domains/cms/components/weddingStories/WeddingStoriesManager.tsx` | Admin editor (hero + repeater) |
| `src/pages/admin/WeddingStoriesAdmin.tsx` | Admin page wrapper |
| `src/providers/WeddingStoriesProvider.tsx` | `useWeddingStories()` read hook |
| `scripts/bootstrap-wedding-stories.ts` | Imports the 3 existing stories + hero |

## Files modified

`constants/routes.ts` (STORIES route) · `config/navigation.ts` (sidebar item) ·
`components/admin/AdminRouter.tsx` (route) · `services/firestore/firestorePaths.ts` (paths) ·
`firestore.rules` (public-read block) · `pages/WeddingStories.tsx` (CMS-driven, bundled fallback).

## Reuse (no duplication)

`firestoreService`, `auditLogService`, `ImageUpload` (same Cloudinary pipeline), the admin
design-system components (`Card`, `Button`, `Input`, `PageHeader`, `AdminBreadcrumb`), and the
draft/publish + trash concepts.

## Design decisions

- **bride/groom & month/year stored split, rendered joined** (`{bride} & {groom}`, `{month} {year}`)
  so the page output is byte-identical to the original.
- **4 independent images per story.** Position 4 previously mirrored position 1; the bootstrap seeds
  it with the same image so day one is identical, but it is independently editable thereafter.
- **Overlay opacity multiplies the gradient** (default 1.0), preserving the 3-stop falloff.
- **Soft delete via `status: "archived"`**, not the image-slot trash schema.

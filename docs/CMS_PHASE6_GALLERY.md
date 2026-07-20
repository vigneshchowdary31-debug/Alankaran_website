# Phase 6: Gallery & Content Management Architecture Specification

**Date:** July 17, 2026  
**Module Name:** Enterprise Gallery Management (`GalleryManager`)  
**Route Access:** `/admin/gallery` (`ROUTES.ADMIN.GALLERY`)  
**Storage Provider:** Cloudinary CDN (`alankaran_website/gallery`)  
**Database Store:** Firebase Firestore (`cms/siteContent/gallery`)  

---

## 1. System Architecture (`Task 1 — Gallery Management`)

The Phase 6 Gallery & Content Management engine provides a high-throughput, image-centric administrative experience tailored specifically for luxury wedding moments. Built on top of the established Phase 3/4 core architecture (`CMS Domain`, `Firestore Service`, `Storage Layer`, `Cache Layer`, and `Publishing Workflow`), it introduces zero structural breaking changes while offering multi-file drag-and-drop batch processing, visual reordering, categorization, and device simulation.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Phase 6 Gallery Manager Studio (`/admin/gallery`)                            │
│                                                                              │
│  [BulkUploadModal] ──► [Cloudinary CDN] ──► [Firestore draftSlots]           │
│                                                      │                       │
│  [Reordering Arrows] ──► Optimistic Index Swap ──────┤                       │
│                                                      ▼                       │
│  [GalleryMetadataModal] ──► Save Tags/Category ──► [PublishControls]         │
│                                                      │                       │
│  [GalleryPreviewModal] ◄── Simulate Mobile/Tablet ───┴──► [Public Website]   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Gallery Data Model (`Task 6 — Gallery Metadata`)

To support complex portfolios without breaking legacy single-slot definitions (`hero_main`, `about_portrait`), the core `CMSSlotMetadata` schema has been extended with optional gallery fields:

```typescript
export interface CMSSlotMetadata {
  id: string;              // Unique slot ID ("gallery_gallery_grid_1_1721200000000")
  sectionKey: string;      // "gallery"
  slotName: string;        // e.g. "gallery_grid_1" or "gallery_custom_1721200000000"
  cloudinaryId: string;    // Cloudinary public_id
  url: string;             // Secure HTTPS URL
  altText: string;         // SEO descriptive alt text
  width?: number;
  height?: number;
  format?: string;         // "webp" | "jpg" | "png"
  sizeBytes?: number;
  createdAt?: number;
  updatedAt: number;
  updatedBy: string;       // Admin user email

  // Phase 6 Gallery Extensions
  caption?: string;        // Story details or description
  tags?: string[];         // Comma-separated keyword tags ("Udaipur", "Mandap", "Gold")
  category?: string;       // Theme categorization ("Royal Weddings", "Palace Decor", etc.)
  order?: number;          // Numeric sort index (1, 2, 3...)
  visibility?: boolean;    // true = visible publicly, false = hidden draft
  isDeleted?: boolean;     // Soft delete indicator (`Task 4`)
  deletedAt?: number;
}
```

---

## 3. Firestore Schema (`cms/siteContent/gallery`)

Gallery data is stored under a single master document inside Firestore at path:
`/databases/(default)/documents/cms/siteContent/gallery`

### Document Structure:
```json
{
  "sectionKey": "gallery",
  "title": "Gallery Section",
  "description": "Managed image slots for the gallery area of the website.",
  "updatedAt": 1721210000000,
  "updatedBy": "admin@alankaran.com",
  "slots": {
    "gallery_grid_1": { "slotName": "gallery_grid_1", "order": 1, "category": "Royal Weddings", "url": "..." },
    "gallery_grid_2": { "slotName": "gallery_grid_2", "order": 2, "category": "Palace Decor", "url": "..." }
  },
  "draftSlots": {
    "gallery_grid_1": { "slotName": "gallery_grid_1", "order": 1, "category": "Royal Weddings", "url": "..." },
    "gallery_grid_2": { "slotName": "gallery_grid_2", "order": 2, "category": "Palace Decor", "url": "..." },
    "gallery_custom_1721200000": { "slotName": "gallery_custom_1721200000", "order": 3, "category": "Mandaps", "url": "..." }
  },
  "publishedSlots": {
    "gallery_grid_1": { "slotName": "gallery_grid_1", "order": 1, "category": "Royal Weddings", "url": "..." },
    "gallery_grid_2": { "slotName": "gallery_grid_2", "order": 2, "category": "Palace Decor", "url": "..." }
  },
  "publishedAt": 1721205000000,
  "publishedBy": "admin@alankaran.com"
}
```

---

## 4. Ordering Strategy (`Task 3 — Drag & Drop Reordering`)

To maintain ultra-fast UI responsiveness while preventing concurrent write collisions:
1. **Numeric Sorting Strategy:** Every gallery slot maintains an integer `order` index (`1, 2, 3...`). When querying or rendering in Grid/List mode, the array is strictly sorted by `(a.order || 99) - (b.order || 99)`.
2. **Optimistic UI Swap:** When an administrator clicks `Move Up` or `Move Down`, `GalleryManager` immediately updates the local React state (`paginatedSlots`), swapping the order indexes of the adjacent items.
3. **Atomic Persistence:** In the background, `cmsService.saveSlot()` executes two targeted Firestore document updates inside `draftSlots`, ensuring the ordering is permanently saved without requiring a full page refresh.

---

## 5. Bulk Upload Flow (`Task 2 — Add New Gallery Images`)

The `BulkUploadModal` handles batch multi-file ingestion through the following sequence:
1. **File Selection & Validation:** Administrator selects or drops up to 20 images (`JPG`, `PNG`, `WEBP`, `SVG`). `fileValidator.validateImageFile()` checks size limit (`10 MB`) and format signatures locally.
2. **Parallel Cloudinary Transmission:** Each item is transmitted to Cloudinary (`alankaran_website/gallery`) with live upload percentage progress updates (`0% -> 100%`). Cloudinary applies automatic formatting (`f_auto, q_auto`).
3. **Metadata Assembly:** Upon successful CDN response, `BulkUploadModal` generates an incremental `order` index (`maxOrder + 1, +2...`) and attaches the selected `category` and default `tags`.
4. **Draft Persistence:** `cmsService.saveSlot("gallery", slotName, metadata)` saves the newly uploaded item directly into Firestore `draftSlots`.
5. **Audit Logging:** `auditLogService.logAction("Upload", "gallery/...", ...)` records the exact administrative batch transaction for accountability.

---

## 6. Delete Workflow & Protection (`Task 4 — Delete Images`)

1. **Soft Delete (`isDeleted: true`):** When an item is deleted from `GalleryManager`, it is marked `isDeleted: true` inside `draftSlots` and copied over to `cms/trash`.
2. **Live Published Asset Protection:** If the target image currently exists inside `publishedSlots` (`slot._isPublished == true`), the UI intercepts the deletion attempt with a warning prompt confirming that the asset is currently live on the public site.
3. **Restoration & Permanent Deletion:** Administrators can open the `Trash Bin` (`TrashModal`) at any time to either restore soft-deleted items back to `draftSlots` or permanently purge them from Firestore.

---

## 7. Performance & Pagination Architecture (`Task 9`)

To guarantee smooth `60 FPS` scrolling and zero memory leaks when managing 100+ high-resolution luxury wedding images:
1. **Windowed Pagination:** `GalleryManager` slices active slots into clean pages (`12`, `24`, or `48` items per view).
2. **Progressive Lazy Loading:** All preview cards utilize native `loading="lazy"` attributes and CSS hover scale micro-animations.
3. **Multi-Tier Caching:** Reads are cached via `cmsCacheService` (`Map` + `localStorage` with `30-minute TTL`), guaranteeing instant tab navigation without redundant Firestore reads.

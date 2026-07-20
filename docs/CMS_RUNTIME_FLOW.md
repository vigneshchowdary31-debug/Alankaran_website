# CMS Runtime Flow

Every user action traced from UI entry point to storage and back. Each step names the real file, so
this doubles as a debugging index: when a flow breaks, start at the step that owns it.

> ⚠️ **All flows below are NOT VERIFIED at runtime.** They are traced by source inspection and
> covered by 77 automated tests against in-memory Firestore fakes. The CMS has never been exercised
> against live Firestore, because `firestore.rules` has never been deployed. See
> `PRODUCTION_CHECKLIST.md`.

---

## 1. Login

| Step | Implementation |
|---|---|
| Entry | `/admin/login` → `pages/admin/Login.tsx` |
| Service | `authService.login()` → `signInWithEmailAndPassword` |
| State | `AuthContext` via `onAuthStateChanged` |
| Guard | `ProtectedRoute` — renders a full-screen loader while resolving, redirects to login when unauthenticated |
| Loading | Submit button disabled; loader during auth resolution |
| Error | `getFriendlyErrorMessage` — distinct wording for bad credentials, invalid email, disabled account, rate limiting, and misconfigured API key |
| Success | Redirect to `/admin/dashboard` |

`ProtectedRoute` renders `null` (not a 404) when unauthenticated, then redirects — a protected route
can never produce a hard 404.

---

## 2. Dashboard / Firestore read

| Step | Implementation |
|---|---|
| Entry | `pages/admin/Dashboard.tsx` |
| Read | `cmsService.loadSection()` → `firestoreService.get()` |
| Cache | `cmsCacheService` — memory then `localStorage`, 30-min TTL |
| Loading | Skeletons / spinners per card |
| Error | `FirestoreOperationError` with `.code`; surfaced as a user-facing message |

The public site uses a separate path: `SiteContentProvider` loads all sections once at mount, serving
cache first and refreshing from Firestore in the background.

---

## 3. Image upload

```
ImageUpload (drop)
  → fileValidator (MIME + size)
  → imageOptimizer
  → CloudinaryStorage.upload()  [XHR, progress, cancellable]
  → onUploadSuccess(asset)
  → SlotManager.handleUploadSuccess
  → useSection.saveSlot → cmsService.saveSlot
  → firestoreService.save  (merge into `slots` = DRAFT)
  → auditLogService.log("Upload")
```

| Aspect | Behaviour |
|---|---|
| Loading | Real percentage from XHR `progress`, capped at 99% until the response lands |
| Cancel | `AbortSignal` aborts the XHR |
| Error (Cloudinary) | Toast "Cloudinary Upload Failed" + inline retry |
| Error (Firestore) | Toast "Firestore Save Failed" naming the document path |
| Success | Toast "CMS Database Updated" |

> **The two writes are independent.** A successful Cloudinary upload followed by a failed Firestore
> save leaves an orphaned CDN asset and no CMS record. `SlotManager` reports this explicitly rather
> than letting the upload's success toast imply the whole operation worked.

**Replace** follows the same path. It uploads a *new* Cloudinary asset rather than overwriting,
because unsigned uploads reject the `overwrite` parameter — reusing a `public_id` without it makes
Cloudinary silently return the existing asset.

---

## 4. Publish

```
PublishControls → cmsService.publishSection(sectionKey, userEmail)
  → loadSection (draft)
  → write cmsVersions/{section}_{versionId}   (immutable snapshot)
  → write publishedSlots = { ...slots }
  → cmsCacheService.invalidate
  → auditLogService.log("Publish")
```

Refuses to publish a section with no draft slots. The public site reads `publishedSlots`, so the
draft is invisible to visitors until this runs.

**Global settings** use the parallel `publishGlobalSettings`, which re-validates the draft first — an
invalid draft is rejected rather than pushing a broken `tel:`/`mailto:`/`href` live.

---

## 5. Website reflection

```
SiteContentProvider.getSlotImage(section, slot, fallback)
  → selectPublicSlotMap(section, previewMode && currentUser)
      public  → publishedSlots || slots (legacy)
  → slot?.url ?? bundled fallback
  → slotCoverageService.record()
```

A slot with no CMS record falls back to a bundled asset, so the site always renders.

> **Preview mode is currently unreachable.** The public-site toggle was removed at handover;
> `previewMode` remains in the provider, permanently `false`.

---

## 6. Delete → Trash

```
ImageUpload "Remove" → DeleteDialog (confirm)
  → SlotManager.handleRemoveSuccess
  → useSection.softDelete → cmsService.softDeleteSlot
  → invalidate cache, re-read section (bypasses stale cache)
  → write cmsTrash/{trashId}  (asset + origin + timestamp + actor)
  → removeFields: slots.X, draftSlots.X, publishedSlots.X   [deleteField()]
  → auditLogService.log("Delete")
```

| Aspect | Behaviour |
|---|---|
| Loading | Dialog button shows a spinner; disabled while in flight |
| Error | Toast stating the image is still live, with the document path |
| Success | Toast "Moved to Trash" |
| Cloudinary | **Not deleted** — by design |

Clearing `publishedSlots` is essential: publish only ever spreads the draft *over* the published map,
so a removal would otherwise never propagate.

---

## 7. Restore

```
TrashModal → confirm → onRestoreMany
  → cmsService.restoreManyFromTrash(ids, user)
  → group by original section  (ONE write per section)
  → write slots + draftSlots
  → deleteMany(cmsTrash, restoredIds)   [chunked, 400/batch]
  → auditLogService.log("Restore")
```

Restores into the **draft** only — publishing is a separate, explicit act. If a section write fails,
its trash records are left intact so the operation is safely retryable.

| Aspect | Behaviour |
|---|---|
| Loading | Progress bar with `done / total` |
| Partial failure | Per-item summary listing which ids failed and why |
| Guard | `isWorking` blocks duplicate submits |

---

## 8. Permanent delete

`TrashModal` → confirmation naming the count ("Delete 14 items permanently?") →
`permanentDeleteManyTrash` → chunked `deleteMany`. Removes every CMS reference. The Cloudinary asset
remains.

---

## 9. Version history

`VersionHistoryModal` → `getVersionHistory(section)` → `cmsVersions` filtered by `section`, sorted
client-side. Restore loads the snapshot **into the draft**; it does not go live until published.

---

## 10. Activity log

`pages/admin/ActivityLog.tsx` → `auditLogService.getRecentLogs(100)` → `cmsAuditLogs` ordered by
`timestamp desc`.

Writes are fire-and-forget: a logging failure never blocks or fails the user's action. A read failure
returns `[]` rather than breaking the page.

---

## 11. Gallery

Bulk upload → per-file Cloudinary upload → `cmsService.saveSlot("gallery", …)` with `order` and
`category`. Reorder writes `order` on the affected slots. Public rendering goes through
`resolveGalleryImages()`, sorted by `order` with `slotName` as a deterministic tiebreak.

⚠️ The gallery feeds **three** pages — Gallery, Wedding Stories, and Home below-fold. See
`CMS_PAGE_MAPPING.md`.

---

## 12. Global settings

`GlobalSettingsManager` → per-field validation on change → `saveGlobalSettings` (draft) →
`publishGlobalSettings` (live + version snapshot). Per-field published/draft badges come from
`globalSettingsDiff.ts`, the single publication-state implementation shared with Diagnostics.

---

## 13. Diagnostics

`pages/admin/Debug.tsx` → `cmsHealthService.checkHealth()`, `slotCoverageService.buildReport()`,
`buildGlobalSettingsStatus()`. Reports Images X/25 and Global Settings X/7 using the same comparison
functions the editors use, so the two views cannot disagree.

---

## Cross-cutting

**Errors.** `utils/userFacingError.ts` maps every failure to a title, plain-language explanation and
suggested action, plus a `retryable` flag so retry is offered only where it could help. Technical
detail is logged to the console in development, never shown to users.

**Tracing.** Every Firestore operation logs its document path, payload, authenticated UID and raw
error code in development, or in production with `VITE_FIRESTORE_TRACE=true`.

**Toasts.** `showSuccess` / `showError` / `showUndoToast` — the only notification surface.

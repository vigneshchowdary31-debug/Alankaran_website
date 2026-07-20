# CMS Firestore Architecture Refactor

Fixes the `Invalid document reference` crashes in Page Images, Gallery Manager, and Diagnostics.

## 1. Root Cause

`firestoreService` exposed document operations as `save(collectionPath, docId, data)` and internally called:

```ts
doc(db, collectionPath, docId)
```

`doc()` joins its segments, so the *type* `string` for `collectionPath` silently permitted a value that
was itself multi-segment. Every caller passed the constant `CMS_COLLECTION_PATH = "cms/siteContent"`,
which produced:

```
doc(db, "cms/siteContent", "gallery")  ->  cms/siteContent/gallery   (3 segments)  INVALID
```

Firestore requires documents to have an **even** number of segments and collections an **odd** number.
`cms/siteContent` was written as if it were a collection, but two segments make it a *document*, so
appending a section key produced a 3-segment path that `doc()` rejects before any network call.

This was not one stray call site — it was the schema constant itself, so every module built on it
inherited the bug:

| Constant | Resolved document path | Segments | Result |
| --- | --- | --- | --- |
| `CMS_COLLECTION_PATH` = `cms/siteContent` | `cms/siteContent/{sectionKey}` | 3 | crash (Page Images, Gallery) |
| `CMS_COLLECTIONS.VERSIONS` = `cms/versions` | `cms/versions/{id}` | 3 | crash (publish, rollback) |
| `CMS_COLLECTIONS.TRASH` = `cms/trash` | `cms/trash/{id}` | 3 | crash (delete, restore) |
| `CONFIG_COLLECTION` = `cms/config` | `cms/config/system` | 3 | crash (settings) |
| `CMS_COLLECTIONS.AUDIT_LOGS` = `cmsAuditLogs` | `cmsAuditLogs/{id}` | 2 | **worked** |

**Why Diagnostics reported "Offline":** `cmsHealth.service` pinged Firestore with
`firestoreService.get("cms/siteContent", "settings")`. That threw the path error synchronously — never
reaching the network — and the catch block treats any non-permission error as unreachable. The health
check was reporting on its own broken path, not on Firestore.

**Why uploads failed:** Cloudinary upload succeeded, then the metadata write to
`cms/siteContent/{section}` threw, so nothing was ever persisted.

## 2. Old Schema

```
cms/
  siteContent/{sectionKey}      <- 3 segments, invalid
  versions/{versionId}          <- 3 segments, invalid
  trash/{trashId}               <- 3 segments, invalid
  config/system                 <- 3 segments, invalid
cmsAuditLogs/{logId}            <- 2 segments, valid (the only one that ever wrote)
```

## 3. New Schema

All collections are top-level, so every document address is exactly 2 segments:

```
cmsSiteContent/{sectionKey}              hero | about | services | gallery | settings
cmsVersions/{sectionKey}_{versionId}     immutable publish snapshots
cmsTrash/{trashId}                       soft-deleted slots
cmsAuditLogs/{logId}                     administrative activity (unchanged)
cmsSettings/system                       CMS runtime configuration
```

## 4. Preventing Recurrence

Renaming the collections alone would not stop this from happening again — the API still accepted a
`string` path. Two structural changes close it:

1. **`FirestorePaths` is the single source of truth** (`src/services/firestore/firestorePaths.ts`).
   Every helper returns a `{ collection, docId }` pair. No Firestore path is spelled out anywhere else.
2. **`firestoreService` only accepts `FirestoreDocumentPath`**, never a string. Passing
   `"cms/siteContent"` is now a compile error, and a runtime `FirestorePathError` guard rejects any
   collection name or document id containing `/`.

Raw `firebase/firestore` imports now exist in exactly two files: the SDK singleton
(`src/lib/firebase/firestore.ts`) and the abstraction layer (`src/services/firestore/firestore.service.ts`).

`firestoreService.list()` was added so collection queries (activity log, trash, version history) go
through the same abstraction instead of importing the SDK into domain services.

## 5. Migration

**No migration script is needed, and no data was lost.**

`doc()` validates segment counts **client-side, before issuing any network request**. Every invalid path
threw in the browser and never reached Firestore, so `cms/siteContent`, `cms/versions`, `cms/trash`, and
`cms/config` contain no documents — they were never created. There is no old data to migrate.

The one collection that did persist data, `cmsAuditLogs`, was already correct and keeps its name, so
existing activity history carries over untouched.

If a Firestore console shows stray documents under `cms/*` from manual seeding, copy them to the matching
`cmsSiteContent/{sectionKey}` document; the field shapes are unchanged.

## 6. Deployment Steps

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

`firestore.rules` previously used `match /cms/siteContent/{sectionKey}` — itself a 3-segment pattern that
could never match a real document. Rules now match the five top-level collections, each requiring
`request.auth != null` (unchanged security posture).

`firestore.indexes.json` declared composite indexes for collection groups that no longer exist
(`versions`, `auditLogs`, `trash`) and for two that have no code at all (`scheduled`, `workflows`). It is
now empty: every query in the codebase uses either a single-field `orderBy` or a lone equality filter,
both of which Firestore indexes automatically. `getVersionHistory` deliberately sorts client-side to
avoid requiring a composite index deploy.

## 7. Files Modified

**New**
- `src/services/firestore/firestorePaths.ts` — single source of truth for all Firestore addresses

**Firestore layer**
- `src/services/firestore/firestore.service.ts` — path-typed API, `FirestorePathError` guard, `list()`
- `src/services/firestore/index.ts` — re-export `FirestorePaths`

**Services / providers**
- `src/domains/cms/services/cms.service.ts` — all paths via `FirestorePaths`; implemented
  `getTrashItems()` and `getVersionHistory()` (both were stubs returning `[]`)
- `src/domains/cms/services/auditLog.service.ts` — query via `firestoreService.list`, SDK import removed
- `src/domains/cms/services/cmsHealth.service.ts` — ping `cmsSettings/system`
- `src/domains/cms/services/systemConfig.service.ts` — `cmsSettings/system`
- `src/domains/cms/constants/cms.constants.ts` — removed `CMS_COLLECTION_PATH` / `CMS_COLLECTIONS`
- `src/providers/SiteContentProvider.tsx` — `FirestorePaths.siteContent(key)`

**Config**
- `firestore.rules`, `firestore.indexes.json`

**Display strings / comments only** (no behaviour change)
- `src/domains/cms/types/cms.types.ts`, `src/domains/cms/components/SlotManager.tsx`,
  `src/domains/cms/components/CMSStatusBanner.tsx`, `src/domains/cms/components/TrashModal.tsx`,
  `src/pages/admin/Debug.tsx`, `src/pages/admin/Images.tsx`

No UI, theme, or architectural changes.

## 8. Verification

Verified locally:

- **Path validity** — every `FirestorePaths` helper resolved through the real `firebase/firestore`
  `doc()`/`collection()` (which validates segments offline): 10/10 document paths even-segment, 4/4
  collection paths odd-segment, 0 failures. The same harness re-ran the old paths and reproduced all
  three reported errors verbatim, confirming the diagnosis.
- **Static audit** — 0 remaining hardcoded Firestore paths; raw SDK imports confined to 2 files.
- `npm run typecheck` — 0 errors.
- `npm run build` — clean.

Not verified locally (requires Firebase credentials + an admin browser session): live CRUD, image
upload, publish/rollback, and the Diagnostics panel reporting Healthy. Run the checklist below against
a real project after deploying the rules.

## 9. Post-Deploy Checklist

- [ ] Login / logout
- [ ] Page Images: hero, about, services, footer load without console errors
- [ ] Gallery: upload, replace, reorder, delete, restore, publish
- [ ] Diagnostics reports Firestore **Healthy / Connected**
- [ ] Activity Log records upload, delete, publish, restore, login, logout
- [ ] Version History rollback restores a snapshot
- [ ] Trash lists soft-deleted items (previously always empty — was a stub)
- [ ] Console: 0 `Invalid document reference` errors

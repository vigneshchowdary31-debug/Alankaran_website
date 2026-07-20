# Firestore Schema

Six top-level collections. Every document path is exactly two segments (`collection/docId`), enforced
at the boundary by `firestorePaths.ts` — nothing else in the codebase may construct a path.

> ⚠️ **Rules deployment status: NOT VERIFIED.** As of RC1 `firestore.rules` has never been deployed.
> Until `firebase deploy --only firestore:rules` runs, the database uses locked-mode defaults and
> rejects every read and write. Everything below describes intended behaviour.

---

## `cmsSiteContent/{sectionKey}`

**Purpose:** the primary content store. One document per section, holding image slots and — on the
`contact` document only — the global text settings.

**Document ids:** `hero`, `about`, `services`, `testimonials`, `contact`, `gallery`

```jsonc
{
  "sectionKey": "hero",
  "slots":            { "hero_main": { /* CMSSlotMetadata */ } },  // DRAFT
  "draftSlots":       { /* mirror of slots */ },
  "publishedSlots":   { "hero_main": { /* … */ } },                // LIVE
  "publishedAt": 1730000000000,
  "publishedBy": "admin@alankaran.com",
  "publishedVersionId": "v_1730000000000_a1b2",
  "updatedAt": 1730000000000,
  "updatedBy": "admin@alankaran.com",

  // cmsSiteContent/contact ONLY:
  "contact":          { /* CMSContactInfo — DRAFT global settings */ },
  "publishedContact": { /* CMSContactInfo — LIVE global settings */ },
  "contactPublishedAt": 1730000000000,
  "contactPublishedBy": "admin@alankaran.com",
  "contactPublishedVersionId": "v_…"
}
```

`CMSSlotMetadata`: `id`, `sectionKey`, `slotName`, `cloudinaryId`, `url`, `altText`, `width`,
`height`, `format`, `resourceType`, `sizeBytes`, `createdAt`, `updatedAt`, `updatedBy`, plus optional
gallery fields `caption`, `tags`, `category`, `order`, `visibility`.

**Read:** authenticated only · **Write:** authenticated only
**Indexes:** none required
**Read by:** `SiteContentProvider` (public site), `cmsService`, `slotCoverageService`, Diagnostics
**Written by:** `cmsService.saveSlot` / `publishSection` / `softDeleteSlot` / `saveGlobalSettings` /
`publishGlobalSettings`

> **Critical implementation note.** `firestoreService.save` uses `setDoc(..., { merge: true })`,
> which merges maps key-by-key and **cannot remove a key**. Deleting a slot therefore requires
> `removeFields()` (`deleteField()` sentinel) against `slots.X`, `draftSlots.X` *and*
> `publishedSlots.X`. Writing a smaller map is a silent no-op.

---

## `cmsVersions/{sectionKey}_{versionId}`

**Purpose:** immutable publish snapshots powering Version History and restore.

```jsonc
{
  "versionId": "v_1730000000000_a1b2",
  "timestamp": 1730000000000,
  "user": "admin@alankaran.com",
  "section": "hero",              // or "globalSettings"
  "changes": "Published all working draft slots (5 items) to live state.",
  "metadata": {
    "slots": { /* full slot map at publish time */ },
    "contact": { /* global settings — globalSettings snapshots only */ }
  }
}
```

**Read/Write:** authenticated only
**Indexes:** none — queried by `where("section","==",…)` and sorted client-side, deliberately
avoiding a composite index
**Written by:** `publishSection`, `publishGlobalSettings` · **Read by:** `getVersionHistory`,
`getGlobalSettingsHistory`

Global-settings snapshots use the pseudo-section `globalSettings` so they sit alongside image history
without colliding with the `contact` image section.

---

## `cmsTrash/{trashId}`

**Purpose:** soft-deleted slots, preserving enough metadata to restore them exactly.

```jsonc
{
  "trashId": "trash_1730000000000_hero_main",
  "deletedAt": 1730000000000,
  "deletedBy": "admin@alankaran.com",
  "originalLocation": { "sectionKey": "hero", "slotName": "hero_main" },
  "asset": { /* the full CMSSlotMetadata as it was */ }
}
```

**Read/Write:** authenticated only
**Indexes:** none — single-field `orderBy("deletedAt","desc")` is auto-indexed
**Written by:** `softDeleteSlot` · **Cleared by:** `restoreFromTrash`, `permanentDeleteTrash`,
`permanentDeleteManyTrash` (chunked batch, 400 ops per commit)

Purging a trash record removes every CMS reference to the image. **The Cloudinary asset is not
destroyed** — see `CMS_ARCHITECTURE.md`.

---

## `cmsAuditLogs/{logId}`

**Purpose:** administrative activity log.

```jsonc
{
  "id": "audit_1730000000000_x1y2z",
  "action": "Upload",   // Upload | Replace | Delete | Publish | Restore | Login | Logout | Cache_Clear | Inquiry
  "user": "admin@alankaran.com",
  "timestamp": 1730000000000,
  "target": "hero/hero_main",
  "details": "Updated image slot (alankaran_website/hero/abc123)"
}
```

**Read/Write:** authenticated only
**Indexes:** none — `orderBy("timestamp","desc")` is auto-indexed
**Written by:** every mutating `cmsService` method, fire-and-forget — a logging failure never blocks
or fails the user's action.

---

## `cmsSettings/system`

**Purpose:** CMS runtime configuration (cache TTL, upload limits, feature flags). Single document.

**Read/Write:** authenticated only · **Indexes:** none
**Accessed by:** `systemConfig.service`

---

## `cmsInquiries/{inquiryId}`

**Purpose:** public contact-form submissions. **The only collection anonymous users can write to.**

```jsonc
{
  "id": "inq_…", "name": "…", "phone": "…", "email": "…",
  "eventType": "…", "message": "…", "createdAt": 1730000000000,
  "status": "new",                    // rules pin this to "new" on create
  "sourcePage": "contact",            // contact | booking | consultation | destinations
  "eventDate": "…", "guestCount": "…", "location": "…", "budget": "…"   // optional
}
```

**Create:** anonymous, but shape-validated in the rules — required keys present, no unknown keys,
bounded string lengths, `status` pinned to `"new"`, `sourcePage` from a known set, `createdAt`
numeric.
**Read / update / delete:** authenticated only.

This shape validation is the security boundary: a submitter cannot forge a triaged lead or inject
arbitrary fields.

---

## Rules summary

```
cmsSiteContent, cmsVersions, cmsTrash, cmsAuditLogs, cmsSettings
    allow read, write: if request.auth != null;

cmsInquiries
    allow read, update, delete: if request.auth != null;
    allow create: if isValidInquiry(request.resource.data);

/{document=**}
    allow read, write: if false;     // catch-all deny
```

The catch-all denies any collection not modelled above, so an accidental write to an unplanned path
fails loudly rather than silently creating a shadow schema.

---

## Indexes

`firestore.indexes.json` is intentionally **empty**. Every query in the codebase uses either a
single-field `orderBy` (auto-indexed) or an equality filter with client-side sorting. No composite
index is required.

Deploy with:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

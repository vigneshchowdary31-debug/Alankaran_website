# Phase A — CMS Website Integration Completion

Makes the existing CMS the source of truth for the website. No UI redesign, no new concepts — the
architecture (Cloudinary, Firestore, publish/draft, versioning, trash, undo, activity log) is unchanged.

## Before / After

| | Before | After |
|---|---|---|
| Gallery Manager → public gallery | **No effect** (slot-name mismatch) | Upload/reorder/delete/restore/publish all drive the public page |
| Named image slots with an editor | **3 of 20** | **20 of 20** |
| Admin editors | 3 hardcoded `SlotManager`s | Generated from `SLOT_CATALOG` |
| Missing CMS data | Silent bundled fallback | DEV console warning + Diagnostics report |
| Form submissions | Discarded (toast only) | Persisted to `cmsInquiries` + Activity Log |
| Contact details | Hardcoded in 5 files | One record: `cmsSiteContent/contact` |
| Admin messaging | "Phase 4 has NOT been initiated" (false) | Accurate live-integration notice |

**Architecture shift:** the gallery moved from a *fixed slot list* (`gallery_grid_1..8`) to a *dynamic
collection* ordered by `slot.order`. Named slots (hero/about/services/testimonials/contact) remain a
fixed catalog — that is what makes them enumerable and therefore auto-editable.

```
BEFORE                                   AFTER
Gallery.tsx ── gallery_grid_1..8 ──X     Gallery.tsx ── getGalleryImages() ──┐
                                  (never intersects)                          │ ordered by `order`
BulkUpload ── gallery_{name}_{ts} ──┘    BulkUpload ── gallery_{name}_{ts} ──┘  same data

Images.tsx ── 3 hardcoded SlotManagers   Images.tsx ── SLOT_CATALOG.map(...) ── 20 editors
```

## 1. Updated Firestore Schema

| Collection | Document | Change |
|---|---|---|
| `cmsSiteContent` | `{sectionKey}` | **+2 sections**: `testimonials`, `contact` |
| `cmsSiteContent` | `contact` | **+`contact` payload** (`CMSContactInfo`) beside its image slots |
| `cmsInquiries` | `{inquiryId}` | **NEW** — public form submissions |
| `cmsVersions` / `cmsTrash` / `cmsAuditLogs` / `cmsSettings` | — | unchanged |

`SectionKey` is now `hero | about | services | gallery | testimonials | contact | settings`.

### Inquiry schema — `cmsInquiries/{inquiryId}`

```ts
{
  id: string;            // inq_{timestamp}_{rand}
  name: string;          // 2–120 chars
  phone: string;         // 6–32 chars
  email: string;         // may be "" (destination form doesn't collect it)
  eventType: string;
  message: string;       // ≤2000 chars
  createdAt: number;
  status: "new" | "contacted" | "archived";
  sourcePage: "contact" | "booking" | "consultation" | "destinations";
  // optional, per-form:
  eventDate?, guestCount?, location?, budget?, company?, referralSource?
}
```

### Contact schema — `cmsSiteContent/contact`

```ts
contact: {
  phones: string[]; emails: string[];
  addressLine: string; addressShort: string; mapQuery: string;
  whatsappNumber: string; whatsappMessage: string;
  instagramUrl: string; facebookUrl: string;
  businessHours: string; studios: string[];
}
```

## 2. Updated Slot Catalog

`SLOT_CATALOG` in `src/domains/cms/constants/cms.constants.ts` is the single source of truth. Each entry
carries `slotName`, `label`, `description`, `usage`; `DEFAULT_SECTION_SLOTS` is *derived* from it, so the
two cannot drift. **Adding a slot to this array is now the only step required to make it editable.**

| Section | Slots | Count |
|---|---|---|
| hero | `hero_main`, `hero_secondary`, `hero_slide_3`, `hero_slide_4`, `hero_slide_5` | 5 |
| about | `about_portrait`, `about_collage_1`, `about_collage_2`, `about_floral_stage`, `about_founders` | 5 |
| services | `service_mandap`, `service_decor`, `service_floral`, `service_stage`, `service_bridal`, `service_engagement`, `service_reception`, `service_detail` | 8 |
| testimonials | `testimonials_hero` | 1 |
| contact | `contact_hero` | 1 |
| **gallery** | *dynamic collection — no fixed slots* | ∞ |
| | **Total named** | **20** |

Catalog changes made to match the website exactly:
- **Removed `gallery_grid_1..8`** — the gallery is now dynamic.
- **Added** `hero_slide_3..5`, `about_floral_stage`, `about_founders`, `service_stage/bridal/engagement/reception/detail`, `testimonials_hero`, `contact_hero`.
- **Deleted 4 dead calls** in `About.tsx` (`about_bridal_entry`, `about_engagement`, `about_reception`, `about_floral_detail`) — fetched but never rendered. Cataloguing them would have created editors for images nobody sees.
- **Moved** the Testimonials hero off `about/about_floral_detail` onto `testimonials/testimonials_hero`. It was a testimonials image filed under About.
- **Added** `contact/contact_hero` — was a hardcoded `/images/floral_stage.webp`.

## 3. Image Coverage Report

**20 / 20 named slots (100%)** are editable in `/admin/images`, plus the gallery as an unbounded
collection. Verified bidirectionally: every slot the site requests is in the catalog, and the catalog
contains no slot the site never renders.

| Page | Images | Status |
|---|---|---|
| Home (hero + below-fold) | 5 named + gallery positions 0–10 | ✅ |
| About | 5 named | ✅ |
| Services | 8 named | ✅ |
| Gallery | dynamic collection | ✅ |
| Wedding Stories | gallery positions 0–7 | ✅ |
| Testimonials | 1 named | ✅ |
| Contact | 1 named | ✅ |
| **Destination Weddings** | 13 images (12 Unsplash) | ❌ **still hardcoded** — see §10 |

"Configured" means published. Coverage counts `publishedSlots` (falling back to `slots` for legacy
records), so a draft-only upload correctly does **not** count as live.

## 4. Gallery Integration Report

**Root cause.** `Gallery.tsx:14-21` read fixed slots `gallery_grid_1..8`. `BulkUploadModal.tsx:158`
writes `` `gallery_${cleanBasename}_${Date.now()}` ``. The namespaces never intersected, so uploads were
invisible publicly while appearing to work in the admin.

**Fix.** The public gallery renders the collection, not fixed names:

```ts
getGalleryImages()  // publishedSlots (or draft in Preview Mode)
                    // → drop !url / isDeleted / visibility === false
                    // → sort by `order` asc, then slotName
```

`resolveGalleryImages()` is a pure function in `src/domains/cms/utils/galleryResolver.ts`, so the
contract the Gallery Manager writes against is testable and cannot drift from the provider.

Consumers updated: `Gallery.tsx` (grid + hero + filters), `WeddingStories.tsx` (positions 0–7),
`HomeBelowFold.tsx` (positions 0–10). Home and Stories draw from the same collection by position and
fall back per-position to bundled assets until enough images exist.

**Category alignment.** The public filter bar used `Mandap / Floral / Reception / …` while the admin
offered `Royal Weddings / Palace Decor / …` — an admin-assigned category could never match a public
filter. `GALLERY_CATEGORIES` is now one exported constant consumed by both admin modals, and the public
filter bar derives its options from the live content.

**Fallback.** With an empty CMS gallery, `BUNDLED_GALLERY_FALLBACKS` (14 items) renders, so a fresh
install still looks complete. One published image replaces the entire bundled set.

## 5. Contact Centralization Report

`+91 89776 11886` previously appeared in 5 places; the WhatsApp deep link was duplicated byte-for-byte
in 4; and the three phone numbers had **already drifted** (`+91 91772 10150` was on the Contact page but
missing from the Footer).

All of it now resolves through `useContactInfo()` → `cmsSiteContent/contact`, merged over
`DEFAULT_CONTACT_INFO` field-by-field (a partial or missing record still renders; an empty `phones`
array can't blank out the site's only number).

| File | Before | After |
|---|---|---|
| `Contact.tsx` | 3 phones, 2 emails, address ×2, hours, socials, WhatsApp, map | all from `contact` |
| `Footer.tsx` | 1 email, 2 phones, address, WhatsApp ×2, socials | all from `contact` |
| `WhatsAppButton.tsx` | hardcoded `WHATSAPP_URL` | `buildWhatsAppUrl(contact)` |

Helpers in `contact.constants.ts`: `buildWhatsAppUrl`, `buildMapEmbedUrl`, `buildMapLinkUrl`, `toTelHref`.
Verified: **zero** literal phone/email/address/social/WhatsApp/map values remain in those three files.

## 6. Silent Failure Removal (Task 4)

`slotCoverageService.record()` is called on every `getSlotImage` resolution.

- **Development** — a missing slot logs once per slot:
  `[CMS] Missing slot "hero/hero_slide_3" — serving bundled fallback (/images/…).` and tells you whether
  to upload it or add it to the catalog.
- **Production** — the fallback still renders (the site must never break), and the miss is reported in
  Diagnostics.

## 7. Diagnostics (Task 5)

New **CMS Content Coverage** panel on `/admin/debug` reports: per-section configured/expected with
progress bars, missing slot names, gallery live count, orphaned records, duplicate assets, and an
overall image-coverage percentage.

Because `/admin/debug` renders *outside* `SiteContentProvider`, coverage is computed from the catalog
vs. Firestore directly rather than from runtime resolutions — deterministic and independent of which
pages happen to have rendered.

- **Orphaned slots** — a Firestore record the catalog doesn't define (no editor, no consumer).
- **Duplicate assets** — one `cloudinaryId` across several slots; replacing it changes all of them.
- **Text slots: 0 / 0** — reported honestly; no text is CMS-managed (Phase B).

## 8. Bug Fixed Along the Way

`sanitizeCMSSectionContent` **dropped `publishedSlots` and `draftSlots`**, so every consumer of
`cmsService.loadSection` (SlotManager, GalleryManager, publish flow, Diagnostics) saw drafts as if they
were live. Now preserved. `SiteContentProvider` was unaffected — it fetches raw and spreads `...doc`.

## 9. Verification

Ran locally against the real compiled modules:

**Gallery round-trip — 14/14 pass**, simulating exactly what `BulkUploadModal` writes:
timestamped slot names resolve · ordered by `order` · reorder · soft-delete hides · restore returns ·
`visibility:false` hides · **public sees ONLY published, draft does not leak** · admin Preview sees draft ·
legacy records without `publishedSlots` still render · empty CMS → `[]` → bundled fallback ·
mid-upload slot (no url) excluded · slot without `order` sorts last · caption preferred as label.

**Catalog + coverage — 15/15 pass**: every requested slot is catalogued · no catalog slot is unrendered ·
20 named slots · gallery excluded from named catalog · empty CMS → 0% with 20 missing · fully published →
100% · orphaned record detected · duplicate asset detected · gallery counts live items, excludes deleted.

`npm run typecheck` → 0 errors. `npm run build` → clean.

**Not verified locally** (needs Firebase credentials + an admin browser session): live upload to
Cloudinary, real Firestore writes, actual inquiry delivery, and the Diagnostics panel against real data.
The data-flow logic above is proven; the network round-trip is not. Run §11 after deploying rules.

## 10. Remaining CMS Gaps

| Gap | Status |
|---|---|
| **All text hardcoded** (0%) — headings, testimonials, services copy, FAQs | Phase B |
| **Destination Weddings** — 13 images (12 Unsplash), 9 content arrays | Phase C; its *form* now persists |
| Testimonials/Stories/Services **content** (images done, text not) | Phase B/C |
| Nav + Footer link lists (defined twice, inconsistent) | Phase C |
| SEO/OG per page; `/og-image.jpg` referenced but `public/opengraph.jpg` exists | Phase C — likely broken previews |
| Cloudinary random `public_id`s; deletes silently no-op without a token | Phase C |
| CMS Settings page is still a `PlaceholderPage` stub | Phase D |
| 35 MB unreferenced assets in `public/images` | Phase D |
| Orphan components (`pages/HomeBelowFold.tsx` + 3) | Phase D |
| Email notification for inquiries | Out of scope per brief (Activity Log only) |

## 11. Deployment & Post-Deploy Checklist

```bash
firebase deploy --only firestore:rules
```

⚠️ **Read before deploying: `cmsInquiries` allows unauthenticated `create`.** This is required — visitors
submitting a contact form are anonymous. The rule is tightly constrained (exact field set, bounded
lengths, `sourcePage` enum, `status` pinned to `"new"`, no anonymous read/update/delete), but it is still
a public write endpoint and **can be spammed**. Enable **Firebase App Check** before promoting this to
production, or gate the form behind reCAPTCHA. Nothing else in the CMS is publicly writable.

- [ ] Upload + **publish** an image in `/admin/images` → appears on the public page
- [ ] Upload to `/admin/gallery` + publish → appears on `/gallery`, `/wedding-stories`, home
- [ ] Reorder gallery → public order changes; delete → disappears; restore → returns
- [ ] Draft-only upload does **not** appear publicly; Preview Mode shows it
- [ ] `/admin/debug` → CMS Content Coverage shows 20/20 once all slots are published
- [ ] Submit each form (Contact, Booking, Consultation, Destination) → row in `cmsInquiries` + `Inquiry` row in Activity Log
- [ ] Edit `cmsSiteContent/contact.contact.phones` → number changes on Contact **and** Footer
- [ ] DEV console: missing-slot warnings appear before upload, disappear after publish

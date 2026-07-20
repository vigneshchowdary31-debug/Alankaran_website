# CMS Content Mapping & Website Audit

Audit of the public website against the CMS. The website is the source of truth. Every claim below cites `file:line` from the codebase as it stands today. **No code was modified to produce this report.**

## Executive Summary

| Metric | Result |
|---|---|
| Public pages | 9 (+2 redirects, +404) |
| Image slots the website requests via CMS | **30** |
| Image slots an admin can actually edit | **3** (`hero_main`, `about_portrait`, `service_mandap`) |
| **Image CMS coverage** | **10%** (3/30) |
| Images bypassing the CMS entirely | 14 (13 on Destination Weddings, 1 on Contact) |
| **Text CMS coverage** | **0%** — no text field is CMS-managed anywhere |
| **Contact-details CMS coverage** | **0%** — hardcoded, and duplicated across 5+ files |
| Unreferenced weight in `public/images` | **35 MB of 39 MB**, all shipped to `dist` |

### The three findings that matter most

1. **The Gallery Manager cannot change the public gallery.** The website reads fixed slots `gallery_grid_1..8` (`src/pages/Gallery.tsx:14-21`), but gallery uploads generate a *timestamped* slot name — `` `gallery_${cleanBasename}_${Date.now()}` `` (`src/domains/cms/components/gallery/BulkUploadModal.tsx:158`). These namespaces never intersect. An admin can upload, reorder, publish, and see the image in `/admin/gallery`, and the public Gallery page will still render the bundled fallback. **The gallery is 0% effective despite appearing fully built.**

2. **Only 3 of 30 slots have an editor.** `/admin/images` renders exactly three `SlotManager` instances (`src/pages/admin/Images.tsx:108`, `:142`, `:176`). The other 27 slots the site requests have no UI. 14 of them aren't even in `DEFAULT_SECTION_SLOTS` (`src/domains/cms/constants/cms.constants.ts:16-31`), so the data model doesn't know they exist.

3. **All text is hardcoded.** `getSlotImage` (`src/providers/SiteContentProvider.tsx:195-232`) resolves *images only*. There is no text equivalent. Every heading, paragraph, price, testimonial, phone number, and address is a string literal in TSX.

Because unmanaged slots fall back silently to bundled assets (`SiteContentProvider.tsx:221-229`, returning `isCMS: false`), the site looks correct while the CMS is largely inert. Nothing surfaces this gap to an admin.

---

## 1. Website Hierarchy

Routes from `src/App.tsx:58-84`, paths from `src/constants/routes.ts:6-15`.

| Page | Route | Component | SEO |
|---|---|---|---|
| Home | `/` | `src/pages/Home.tsx` | + JSON-LD (`Home.tsx:34-49`) |
| About | `/about` | `src/pages/About.tsx` | + JSON-LD |
| Services | `/services` | `src/pages/Services.tsx` | + JSON-LD |
| Destination Weddings | `/destinations` | `src/pages/DestinationWeddings.tsx` | SEO only |
| Wedding Stories | `/wedding-stories` | `src/pages/WeddingStories.tsx` | SEO only |
| Gallery | `/gallery` | `src/pages/Gallery.tsx` | SEO only |
| Testimonials | `/testimonials` | `src/pages/Testimonials.tsx` | SEO only |
| Contact | `/contact` | `src/pages/Contact.tsx` | SEO only |
| 404 | `*` | `src/pages/not-found.tsx` | none |
| Redirect | `/themes` → `/#royal-themes` | inline (`App.tsx:70-74`) | n/a |
| Redirect | `/wedding-themes` → `/#royal-themes` | inline (`App.tsx:75-79`) | n/a |

Global chrome (mounted in `App.tsx:100-108`): `Navbar`, `FloatingCTA`, `WhatsAppButton` (delayed, `App.tsx:106`), `AdminPreviewToggle`, `BookingModal` (via `BookingContext.tsx:32`). **`Footer` is not global** — each page imports it individually (e.g. `Home.tsx:57`, `Contact.tsx:269`).

## 2. Component Hierarchy

```
App (src/App.tsx)
└── SiteContentProvider ──────────── the ONLY CMS bridge (images only)
    ├── Navbar ....................... inline navLinks (Navbar.tsx:8-17)
    ├── Home (/)
    │   ├── HeroSection .............. 5 CMS slots (HeroSection.tsx:16-47)
    │   │   └── HeroCanvas ........... procedural 3D, no images
    │   └── HomeBelowFold (lazy) ..... 14 sections, 11 CMS slots
    │       ├── Luxury Showcase        #luxury-showcase
    │       ├── About Preview
    │       ├── Signature Services     services[] (10 items, :5-16)
    │       ├── CTA Strip 1
    │       ├── Royal Themes           #royal-themes · themes[] (5, :18-24)
    │       ├── 3D Decor Experience
    │       ├── Cinematic Image Grid
    │       ├── CTA Strip 2
    │       ├── Wedding Stories        stories[] (3, :26-30)
    │       ├── Video Reels
    │       ├── Planning Journey       inline steps[] (5, :579-584)
    │       ├── Testimonials           testimonials[] (3, :32-36)
    │       └── Final CTA
    ├── About (/about) ............... 9 CMS slots · values[] (4, About.tsx:8-13)
    ├── Services (/services) ......... 8 CMS slots · services[] (10, Services.tsx:8-59)
    ├── DestinationWeddings .......... 0 CMS · 13 hardcoded images · 9 arrays
    ├── WeddingStories ............... 8 CMS slots · stories[] (3, :7-41)
    ├── Gallery (/gallery) ........... 8 CMS slots · galleryItems[] (14, :24-39)
    ├── Testimonials ................. 1 CMS slot · testimonials[] (6, :6-43)
    ├── Contact (/contact)
    │   ├── (hero) ................... 1 HARDCODED image (Contact.tsx:81)
    │   └── Consultation ............. inert form
    ├── FloatingCTA · WhatsAppButton · AdminPreviewToggle
    ├── BookingModal (via BookingContext)
    └── Footer (per-page) ............ inline quickLinks (Footer.tsx:19-28)
```

**Orphan components** (verified: zero importers): `src/pages/HomeBelowFold.tsx` (a full duplicate of `src/components/home/HomeBelowFold.tsx` with all images hardcoded), `src/components/DecorCanvas.tsx`, `src/components/InlineSectionCTA.tsx`, `src/components/CustomCursor.tsx`. The `pages/HomeBelowFold.tsx` duplicate is a live trap — editing it changes nothing.

## 3. Section Audit

| Section | Component | Firestore | Cloudinary | SiteContentProvider | Static assets | Constants | CMS-editable? |
|---|---|---|---|---|---|---|---|
| Hero (home) | HeroSection.tsx | via provider | via provider | Yes | fallbacks | landingSlides | 🟡 1 of 5 slots |
| Luxury Showcase | HomeBelowFold.tsx:84 | via provider | via provider | Yes | fallbacks | — | ❌ images only, 0 editable |
| About Preview | HomeBelowFold.tsx:121 | No | No | No | No | inline quotes | ❌ |
| Signature Services | HomeBelowFold.tsx:168 | via provider | via provider | Yes | fallbacks | services[] | ❌ text hardcoded |
| Royal Themes | HomeBelowFold.tsx:236 | via provider | via provider | Yes | fallbacks | themes[] | ❌ |
| 3D Decor | HomeBelowFold.tsx:285 | via provider | via provider | Yes | fallbacks | — | ❌ |
| Cinematic Grid | HomeBelowFold.tsx:370 | via provider | via provider | Yes | fallbacks | — | ❌ |
| Wedding Stories (home) | HomeBelowFold.tsx:478 | No | No | No | No | stories[] | ❌ |
| Video Reels | HomeBelowFold.tsx:517 | via provider | via provider | Yes | fallbacks | — | ❌ |
| Planning Journey | HomeBelowFold.tsx:566 | No | No | No | No | inline steps | ❌ |
| Testimonials (home) | HomeBelowFold.tsx:616 | No | No | No | No | testimonials[] | ❌ |
| About page (all) | About.tsx | via provider | via provider | Yes | fallbacks | values[] | 🟡 1 of 9 slots |
| Services page | Services.tsx | via provider | via provider | Yes | fallbacks | services[] | 🟡 1 of 8 slots |
| Gallery page | Gallery.tsx | via provider | via provider | Yes | fallbacks | galleryItems[] | ❌ **slot-name mismatch** |
| Wedding Stories page | WeddingStories.tsx | via provider | via provider | Yes | fallbacks | stories[] | ❌ |
| Testimonials page | Testimonials.tsx | via provider | via provider | Yes | fallbacks | testimonials[] | ❌ |
| Destination Weddings | DestinationWeddings.tsx | **No** | **No** | **No** | Unsplash + local | 9 arrays | ❌ fully hardcoded |
| Contact | Contact.tsx | No | No | No | hardcoded hero | inline options | ❌ |
| Navbar | Navbar.tsx | No | No | No | inline SVG | navLinks | ❌ |
| Footer | Footer.tsx | No | No | No | icon fonts | quickLinks | ❌ |

## 4. Image Audit

### 4a. CMS-wired slots (30 unique) — editability

Editor = a `SlotManager` bound to that literal slot name. Catalog = present in `DEFAULT_SECTION_SLOTS` (`cms.constants.ts:16-31`).

| Section | Slot | Consumed at | Editor? | Catalog? |
|---|---|---|---|---|
| hero | `hero_main` | Home.tsx:13, HeroSection.tsx:18 | ✅ Images.tsx:110 | ✅ |
| hero | `hero_secondary` | HeroSection.tsx:24 | ❌ | ✅ |
| hero | `hero_slide_3` | HeroSection.tsx:30, HomeBelowFold.tsx:76 | ❌ | ❌ |
| hero | `hero_slide_4` | HeroSection.tsx:36 | ❌ | ❌ |
| hero | `hero_slide_5` | HeroSection.tsx:42 | ❌ | ❌ |
| about | `about_portrait` | About.tsx:19 | ✅ Images.tsx:144 | ✅ |
| about | `about_collage_1` | About.tsx:20 | ❌ | ✅ |
| about | `about_collage_2` | About.tsx:21 | ❌ | ✅ |
| about | `about_floral_stage` | About.tsx:22 | ❌ | ❌ |
| about | `about_bridal_entry` | About.tsx:23 | ❌ | ❌ |
| about | `about_engagement` | About.tsx:24 | ❌ | ❌ |
| about | `about_reception` | About.tsx:25 | ❌ | ❌ |
| about | `about_floral_detail` | About.tsx:26, **Testimonials.tsx:47** | ❌ | ❌ |
| about | `about_founders` | About.tsx:29 | ❌ | ❌ |
| services | `service_mandap` | Services.tsx:65 | ✅ Images.tsx:178 | ✅ |
| services | `service_decor` | Services.tsx:66 | ❌ | ✅ |
| services | `service_floral` | Services.tsx:67 | ❌ | ✅ |
| services | `service_stage` | Services.tsx:68 | ❌ | ❌ |
| services | `service_bridal` | Services.tsx:69 | ❌ | ❌ |
| services | `service_engagement` | Services.tsx:70 | ❌ | ❌ |
| services | `service_reception` | Services.tsx:71 | ❌ | ❌ |
| services | `service_detail` | Services.tsx:72 | ❌ | ❌ |
| gallery | `gallery_grid_1..8` (8 slots) | Gallery.tsx:14-21, WeddingStories.tsx:47-54, HomeBelowFold.tsx:64-71 | ❌ **mismatch** | ✅ |

**Totals: 30 slots · 3 editable (10%) · 16 in catalog · 14 unknown to the data model.**

Notes:
- `about_floral_detail` is reused as the **Testimonials page** hero (`Testimonials.tsx:47`) — a testimonials image living under the `about` section key. Confusing ownership.
- `gallery_grid_4` is bound to two different fallbacks (`HomeBelowFold.tsx:67` floral_stage, `:74` mandap_floral_detail) — one CMS edit changes both, unexpectedly.
- `gallery_grid_2` / `gallery_grid_7` are likewise double-bound (`HomeBelowFold.tsx:65/77`, `:70/78`).
- About fetches `about_bridal_entry`, `about_engagement`, `about_reception` (`About.tsx:23-25`) but never renders them — dead CMS calls.

### 4b. Images bypassing the CMS (14)

| Image | Where | Source |
|---|---|---|
| Unsplash hero `photo-1519225421980` | DestinationWeddings.tsx:151 | Hardcoded remote URL |
| Unsplash ×4 (`weddingStyles[].image`) | DestinationWeddings.tsx:14,21,28,35 | Hardcoded remote |
| Unsplash ×4 (`popularDestinations[].image`) | DestinationWeddings.tsx:43,48,53,58 | Hardcoded remote |
| Unsplash ×3 + `/images/royal_palace_reception.webp` (`realWeddings[].image`) | DestinationWeddings.tsx:94,100,106,112 | Hardcoded |
| `/images/floral_stage.webp` (hero bg) | Contact.tsx:81 | Hardcoded local |

**Destination Weddings depends on Unsplash CDN for 12 production images** — third-party availability risk, no CMS control, and visually inconsistent with the Alankaran-shot photography elsewhere.

### 4c. Brand assets

| Asset | Location | Source |
|---|---|---|
| Site logo | `src/components/Logo.tsx:17-86` | **Inline SVG** + text wordmark (`:91-102`) — not an image file |
| Favicon | `index.html:5` | Inline data-URI SVG (gold ✦ glyph) |
| `public/favicon.svg` | referenced only in JSON-LD `logo` (`Home.tsx:40`) | Static |
| og:image default `/og-image.jpg` | `src/components/SEO.tsx:12` | Static — **but `public/` contains `opengraph.jpg`, not `og-image.jpg`** ⚠️ likely broken social preview |
| Social icons | `Footer.tsx:3` (`react-icons/si`) | Icon components |

### 4d. Static asset inventory — `public/images` (53 files, 39 MB)

- **35 MB (37 files) unreferenced** by any code, yet all 53 ship to `dist/static/images`.
- **23 `.png`/`.webp` duplicate pairs.** Code references only `.webp`; every `.png` (~30 MB total) is dead weight.
- Never-referenced sets: `services-*` (12 files), `insta_*` (4), `gallery-mandap-1`, `gallery-stage-1`, `chaitanya.webp`, `chandrika.webp` (superseded by `founders.webp`).
- Only ~3 MB of the 39 MB is actually reachable.

## 5. Text Audit

**Every user-visible string on the site is hardcoded. CMS coverage: 0%.** `SiteContentProvider` exposes `getSlotImage` and `getSection` only — no text resolver exists (`SiteContentProvider.tsx:26-56`).

| Content | Source | file:line | CMS? |
|---|---|---|---|
| Home hero slides (5× title/subtitle/tagline) | `landingSlides` | HeroSection.tsx:16-47 | ❌ |
| Home headings/CTAs (14 sections) | JSX literals | HomeBelowFold.tsx:84-700 | ❌ |
| Home services (10× name/desc) | `services` | HomeBelowFold.tsx:5-16 | ❌ |
| Royal themes (5× name/sub) | `themes` | HomeBelowFold.tsx:18-24 | ❌ |
| Home stories (3×) | `stories` | HomeBelowFold.tsx:26-30 | ❌ |
| Home testimonials (3×) | `testimonials` | HomeBelowFold.tsx:32-36 | ❌ |
| Planning journey (5 steps) | inline array | HomeBelowFold.tsx:579-584 | ❌ |
| About values (4×) | `values` | About.tsx:8-13 | ❌ |
| About body copy, founder bios, quotes | JSX literals | About.tsx:53-198 | ❌ |
| Services catalog (10× name/desc/tag) | `services` | Services.tsx:8-59 | ❌ |
| Gallery categories (7) + tile labels (14) | `categories`, `galleryItems` | Gallery.tsx:8, :24-39 | ❌ |
| **Testimonials (6× quote/client/location/date)** | `testimonials` | Testimonials.tsx:6-43 | ❌ |
| **Wedding stories (3× couple/date/location/theme/color/story[])** | `stories` | WeddingStories.tsx:7-41 | ❌ |
| Destination content (9 arrays incl. FAQs, budgets, pricing "₹28L to ₹55L") | 9 constants | DestinationWeddings.tsx:8-132 | ❌ |
| Contact form options (event/guests/budget) | inline arrays | Contact.tsx:131,144,161 | ❌ |
| Footer services list (8) | `services` | Footer.tsx:9-16 | ❌ |
| Nav links (8) | `navLinks` | Navbar.tsx:8-17 | ❌ |
| Footer quick links (7) | `quickLinks` | Footer.tsx:19-28 | ❌ |
| Copyright + tagline | JSX | Footer.tsx:167-172 | ❌ |
| All SEO titles/descriptions | per-page props | each page | ❌ |
| JSON-LD business data | inline object | Home.tsx:34-49 | ❌ |

Structural duplication worth noting:
- **Testimonials exist twice**: 3 items on the home page (`HomeBelowFold.tsx:32-36`) and 6 on `/testimonials` (`Testimonials.tsx:6-43`) — different data, no shared source. Testimonial cards have **no photo field** (avatars are the client's first initial, `Testimonials.tsx:100-102`) and **no rating field** (5 stars are hardcoded for every card, `:92-94`).
- **Nav is defined twice** with different contents — `Navbar.navLinks` includes `/destinations`, `Footer.quickLinks` omits it.
- **Home stories vs. Wedding Stories page** are separate hardcoded arrays.

## 6. Contact & Brand Data (0% CMS, heavily duplicated)

Changing a phone number today means editing **five files**.

| Value | Locations |
|---|---|
| `+91 89776 11886` | Contact.tsx:204 · Footer.tsx:114-116 · Footer.tsx:58 & :124 (WhatsApp URL) · WhatsAppButton.tsx:6 · Contact.tsx:221 |
| `+91 88854 41188` | Contact.tsx:206 · Footer.tsx:117-119 |
| `+91 91772 10150` | Contact.tsx:205 **only** (missing from Footer) |
| `chaitanya@alankaran.com` | Contact.tsx:198 · Footer.tsx:111-112 |
| `chandrika@alankaran.com` | Contact.tsx:199 **only** |
| Address (Plot 78, TNGO's Colony Phase 2, Gachibowli, Hyderabad 500046) | Contact.tsx:211 · Contact.tsx:264 · Footer.tsx:120 |
| WhatsApp deep link (byte-identical ×4) | Footer.tsx:58 · Footer.tsx:124 · WhatsAppButton.tsx:6 · Contact.tsx:221 |
| Instagram `instagram.com/alankaranevents` | Contact.tsx:231 · Footer.tsx:56 |
| Facebook `facebook.com/alankaranevents` | Contact.tsx:232 · Footer.tsx:57 |
| Hours "Monday–Saturday, 10:00 AM – 7:00 PM IST" | Contact.tsx:216 **only** |
| Studios (Hyderabad/Delhi/Jaipur) | Contact.tsx:237-239 |
| Google Maps embed (query-based, no coords) | Contact.tsx:254 |
| Copyright + tagline | Footer.tsx:167-172 |
| JSON-LD name/url/logo/address | Home.tsx:38-47 |

**Forms are inert.** The Contact form validates client-side then shows a toast — no `fetch`, no endpoint, no `mailto` (`Contact.tsx:33-44`). The Destination "Request a Plan" form has no state wiring and simply links to `/contact` (`DestinationWeddings.tsx:650-654`). `BookingModal` and `Consultation` likewise only toast. **No inquiry is delivered anywhere today.**

Only `APP_CONFIG` holds brand constants (`src/constants/app.ts:5-11`) — name, CMS title/version, support email, upload limits. No phone/address/social constant exists.

## 7. Firestore Mapping

Schema authority: `src/services/firestore/firestorePaths.ts` (see `docs/CMS_FIRESTORE_REFACTOR.md`).

| Collection | Document | Purpose |
|---|---|---|
| `cmsSiteContent` | `{sectionKey}` — hero, about, services, gallery, settings | Image slot records |
| `cmsVersions` | `{sectionKey}_{versionId}` | Publish snapshots |
| `cmsTrash` | `{trashId}` | Soft-deleted slots |
| `cmsAuditLogs` | `{logId}` | Activity log |
| `cmsSettings` | `system` | Runtime config |

`cmsSiteContent/{sectionKey}` document shape (`src/domains/cms/types/cms.types.ts:37-48`):

| Field | Notes |
|---|---|
| `sectionKey` | hero \| about \| services \| gallery \| settings |
| `slots` | `Record<slotName, CMSSlotMetadata>` — working draft |
| `draftSlots` | draft copy |
| `publishedSlots` | live copy — **what the public site reads** |
| `publishedAt` / `publishedBy` / `publishedVersionId` | publish metadata |
| `updatedAt` / `updatedBy` | audit |

`CMSSlotMetadata` (`cms.types.ts:8-35` → `src/types/image.ts:9-25`): `id`, `sectionKey`, `slotName`, `cloudinaryId`, `url`, `altText`, `width`, `height`, `sizeBytes`, `format`, `resourceType`, `originalFilename`, `createdAt`, `updatedAt`, `updatedBy`. Gallery slots additionally carry `order`, `category`, `isDeleted`.

**Resolution precedence** (`SiteContentProvider.tsx:200-229`):
```
preview + admin → slots[slotName] → draftSlots[slotName]
public          → publishedSlots[slotName] → slots[slotName]
neither         → fallbackUrl (isCMS: false)
```
`CORE_SECTIONS = ["hero","about","services","gallery"]` (`:58`) — `settings` is never fetched publicly. **There is no `footer`, `testimonials`, `contact`, or `stories` document** — those sections have no CMS representation at all.

Versioning: a snapshot is written on every publish (`cms.service.ts:180`); rollback restores into draft (`:190-211`). Trash and version history are now readable (`:284-311`).

## 8. Cloudinary Mapping

| Item | Value | file:line |
|---|---|---|
| Cloud name | `VITE_CLOUDINARY_CLOUD_NAME` (fallback `alankaran`) | config/cloudinary.ts:5,9 |
| Upload preset | `VITE_CLOUDINARY_UPLOAD_PRESET` (fallback `alankaran_cms_preset`) | config/cloudinary.ts:6,10 |
| Folder prefix | `VITE_CLOUDINARY_FOLDER` (fallback `alankaran_website`) | config/cloudinary.ts:11 |
| Upload folder | `alankaran_website/{sectionKey}` | cloudinary.service.ts:38-41 |
| API base | `https://api.cloudinary.com/v1_1` | config/cloudinary.ts:12 |
| Delivery host | `https://res.cloudinary.com` (hardcoded) | cloudinary.storage.ts:231 |
| Signing | **Unsigned** (preset only, no API secret) | cloudinary.storage.ts:40 |
| Transformations | `f_auto,q_auto` + optional `w_`/`h_`/`c_` | cloudinary.storage.ts:225-228 |
| Size limit | 10 MB (`APP_CONFIG.MAX_UPLOAD_SIZE_MB`) | constants/app.ts:10 |

**Naming convention: there isn't one.** `uploadImage` never passes `publicId` (`cloudinary.service.ts:38-41`), so `public_id` is **auto-generated randomly by Cloudinary** for every new upload (`cloudinary.storage.ts:47-54`). Only *replace* reuses an existing id with `overwrite=true` (`cloudinary.storage.ts:141-153`). The CMS's own `ImageAsset.id` is a separate synthetic string `` `${sectionKey}_${slotName}_${Date.now()}` `` (`cloudinary.service.ts:46`) — not the Cloudinary id. Consequence: the Cloudinary media library is unbrowsable by meaning; folders are the only organisation.

**Deletion is unreliable.** Deletes use `delete_by_token` (`cloudinary.storage.ts:167`), valid ~10 minutes after upload and only if the preset grants it. With no token, the code **skips Cloudinary entirely and returns `true`** (`:187-194`) — the UI reports success while the asset stays in Cloudinary forever. Orphaned assets accumulate silently.

**Config drift:** `APP_CONFIG.ALLOWED_IMAGE_TYPES` (jpeg/png/webp/**avif**, `constants/app.ts:11`) is never consumed; `fileValidator.ts:27-33` enforces its own list (jpeg/jpg/png/webp/**svg**). AVIF is advertised but rejected; SVG is accepted but undeclared.

**Unused/duplicate assets:** see §4d — 35 MB unreferenced, 23 duplicate png/webp pairs. Cloudinary-side duplicates cannot be assessed from code (requires dashboard access).

## 9. Missing CMS Features

Ordered by user impact.

| # | Gap | Current implementation | Why it matters |
|---|---|---|---|
| 1 | **Gallery slot-name mismatch** | Upload → `gallery_{name}_{ts}`; site reads `gallery_grid_1..8` | Gallery Manager appears to work but changes nothing publicly |
| 2 | **27 of 30 slots have no editor** | 3 `SlotManager`s (Images.tsx:108,142,176) | Most site imagery is unmanageable |
| 3 | **All text hardcoded** | String literals | Every copy tweak needs a developer + redeploy |
| 4 | **Contact details hardcoded ×5** | Contact.tsx + Footer.tsx + WhatsAppButton.tsx | A phone change requires 5 edits; drift already exists (3rd number missing from Footer) |
| 5 | **Forms deliver nothing** | Toast only (Contact.tsx:33-44) | Every lead is silently lost |
| 6 | **Testimonials not manageable** | 2 separate arrays (6 + 3) | Core social proof; no photo/rating fields |
| 7 | **Destination Weddings fully hardcoded** | 13 images (12 Unsplash), 9 arrays | Whole revenue page outside CMS + third-party image dependency |
| 8 | **Wedding Stories not manageable** | `stories[]` (:7-41) | Flagship content |
| 9 | **Services catalog hardcoded ×3** | Services.tsx:8-59, HomeBelowFold.tsx:5-16, Footer.tsx:9-16 | Three sources drift |
| 10 | **SEO/OG not manageable** | Per-page props; og:image `/og-image.jpg` likely missing (`opengraph.jpg` exists) | Broken social previews |
| 11 | **Footer/Nav not manageable** | Inline arrays, defined twice | Nav already inconsistent |
| 12 | **Logo/favicon not manageable** | Inline SVG | Rebrand = code change |
| 13 | **No Cloudinary naming convention** | Random public_ids | Media library unnavigable |
| 14 | **Cloudinary deletes silently no-op** | delete_by_token only | Orphaned asset cost |
| 15 | **CMS Settings is a stub** | `PlaceholderPage` (AdminRouter.tsx:58-77) | Nav promises a feature that doesn't exist |
| 16 | **35 MB dead assets shipped** | `public/images` | Bandwidth/deploy weight |
| 17 | **Orphan duplicate components** | `pages/HomeBelowFold.tsx` + 3 others | Editing the duplicate does nothing |
| 18 | **No gap visibility** | Silent fallback (`SiteContentProvider.tsx:221-229`) | Admins can't tell managed from unmanaged |

## 10. CMS Expansion Plan

Priority key: **P0** blocking · **P1** high · **P2** medium · **P3** low. Complexity: S/M/L.

| # | Feature | Current | Recommended schema | Cloudinary folder | Admin UI | Pri | Cx |
|---|---|---|---|---|---|---|---|
| 1 | Fix gallery slot naming | `gallery_{name}_{ts}` vs `gallery_grid_N` | Make Gallery.tsx render `publishedSlots` ordered by `order` (drop fixed names), **or** have uploads claim the next free `gallery_grid_N` | `alankaran_website/gallery` | existing GalleryManager | **P0** | S |
| 2 | Slot-driven Page Images | 3 hardcoded SlotManagers | Render editors by iterating `DEFAULT_SECTION_SLOTS[sectionKey]` | existing | `/admin/images` | **P0** | S |
| 3 | Complete the slot catalog | 14 slots unknown | Add `hero_slide_3..5`, `about_floral_stage/founders/…`, `service_stage/bridal/…` to `DEFAULT_SECTION_SLOTS` | existing | inherits #2 | **P0** | S |
| 4 | Wire forms to a backend | inert | Firestore `cmsInquiries/{id}` + email notify | — | `/admin/inquiries` | **P0** | M |
| 5 | Contact/brand singleton | hardcoded ×5 | `cmsSiteContent/contact`: `{phones[], emails[], address, mapQuery, socials{}, hours, whatsapp}`; refactor all 5 sites to read it | — | `/admin/contact` | **P1** | M |
| 6 | Testimonials collection | 2 arrays | `cmsTestimonials/{id}`: `{quote, client, location, date, rating, photo?, featured, order, published}` | `alankaran_website/testimonials` | `/admin/testimonials` CRUD | **P1** | M |
| 7 | Text slots | none | Extend section docs with `text: Record<key,string>` + `getSlotText(section,key,fallback)` mirroring `getSlotImage` | — | inline editors | **P1** | L |
| 8 | Services catalog | 3 arrays | `cmsServices/{id}`: `{name, desc, tag, image, order, published}` | `alankaran_website/services` | `/admin/services` | **P1** | M |
| 9 | Wedding Stories | `stories[]` | `cmsStories/{id}`: `{couple, date, location, theme, color, story[], images[], published}` | `alankaran_website/stories` | `/admin/stories` | **P2** | L |
| 10 | Destination Weddings + de-Unsplash | 13 hardcoded | `cmsDestinations/{id}` + `cmsSiteContent/destinations`; migrate Unsplash → Cloudinary | `alankaran_website/destinations` | `/admin/destinations` | **P2** | L |
| 11 | SEO/OG per page | props | `cmsSeo/{routeKey}`: `{title, description, ogImage}`; fix `/og-image.jpg` vs `opengraph.jpg` | `alankaran_website/seo` | `/admin/seo` | **P2** | M |
| 12 | Nav + Footer | 2 arrays | `cmsSiteContent/navigation`: `{primary[], footer[], footerServices[]}` | — | `/admin/navigation` | **P2** | M |
| 13 | Cloudinary naming | random | `public_id = {sectionKey}/{slotName}_{ts}`; pass `publicId` in `uploadImage` | all | none | **P2** | S |
| 14 | Reliable deletes | token-only, silent no-op | Cloud Function with signed Admin API; surface real failures | — | none | **P2** | M |
| 15 | Build CMS Settings | stub | `cmsSettings/system` already exists — wire the UI | — | `/admin/settings` | **P3** | M |
| 16 | Prune assets | 35 MB dead | Delete unreferenced + `.png` duplicates | — | none | **P3** | S |
| 17 | Delete orphan components | 4 files | Remove `pages/HomeBelowFold.tsx`, `DecorCanvas`, `InlineSectionCTA`, `CustomCursor` | — | none | **P3** | S |
| 18 | Unmanaged-slot visibility | silent | Dev-mode badge / admin report when `isCMS: false` | — | Diagnostics | **P3** | M |
| 19 | Fix ALLOWED_IMAGE_TYPES drift | diverged | Make `fileValidator` consume `APP_CONFIG.ALLOWED_IMAGE_TYPES` | — | none | **P3** | S |

## 11. Recommended Implementation Order

**Phase A — make the existing CMS truthful (P0, ~1 week).** Items 1, 2, 3, 4. After this the Gallery Manager actually changes the gallery and all 30 slots are editable — image coverage 10% → 100% with no new UI concepts. Item 4 stops lead loss.

**Phase B — highest-churn content (P1, ~2 weeks).** Items 5, 6, 8, then 7. Contact details and testimonials change most often and are cheapest to model. Text slots (7) are the biggest lever but should follow the section-doc pattern proven in Phase A.

**Phase C — long-tail content (P2, ~2–3 weeks).** Items 9, 10, 11, 12, 13, 14. Item 10 also removes the Unsplash dependency.

**Phase D — hygiene (P3, ~2 days).** Items 15–19. Item 16 alone cuts ~35 MB from every deploy.

Do Phase A before anything else: today the CMS's most complete-looking feature (Gallery Manager, with upload/reorder/publish/trash/undo) has **zero effect on the public website**, and nothing tells the admin.

---

### Correction to existing docs

`src/pages/admin/Images.tsx:198` states *"Phase 4 (Live Public Website Integration via SiteContentProvider) has NOT been initiated yet"*. This is **false** — `SiteContentProvider` wraps the site (`App.tsx:100`) and 8 components call `getSlotImage`. The admin UI tells admins their edits don't reach the site, when for `hero_main`, `about_portrait`, and `service_mandap` they do.

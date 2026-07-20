# CMS Image Verification Matrix

**Generated from `SLOT_CATALOG` and the actual `getSlotImage()` call sites** — 25 catalog slots,
25 resolved render sites, zero orphans. Regenerating from source is what keeps this accurate.

## Capability support

Every named slot flows through the identical pipeline, so these columns are uniform. They are stated
once here rather than repeated 25 times:

| Capability | Supported | Implementation |
|---|---|---|
| Draft | ✅ | `slots` / `draftSlots` on the section document |
| Published | ✅ | `publishedSlots`, written by `publishSection` |
| Activity Log | ✅ | `auditLogService.log` on every mutation |
| Version History | ✅ | `cmsVersions` snapshot per publish |
| Trash | ✅ | `softDeleteSlot` → `cmsTrash` |
| Restore | ✅ | `restoreFromTrash` / `restoreManyFromTrash` |
| Delete (permanent) | ✅ Firestore · ❌ Cloudinary | `permanentDeleteTrash`; the CDN asset is retained by design |
| Diagnostics | ✅ | `slotCoverageService` counts it in Images X/25 |
| Fallback | ✅ | Bundled asset in `public/images/`, used when no CMS record exists |

> ⚠️ **Runtime status: NOT VERIFIED.** Every capability above is verified by source inspection and
> 77 automated tests against in-memory Firestore fakes. None has been exercised against live
> Firestore, because the security rules have never been deployed.

---

## Matrix

| # | Section | Slot | Firestore | Cloudinary folder | Component | Page | Renders as | Fallback |
|---|---|---|---|---|---|---|---|---|
| 1 | hero | `hero_main` | `cmsSiteContent/hero` | `alankaran_website/hero` | [HeroSection.tsx:18](src/components/home/HeroSection.tsx#L18) | Home | Home hero slide 1 · also the Home page preload image | `/images/hero-mandap.webp` |
| 2 | hero | `hero_main` | `cmsSiteContent/hero` | `alankaran_website/hero` | [Home.tsx:13](src/pages/Home.tsx#L13) | Home | Home hero slide 1 · also the Home page preload image | `/images/hero-mandap.webp` |
| 3 | hero | `hero_secondary` | `cmsSiteContent/hero` | `alankaran_website/hero` | [HeroSection.tsx:24](src/components/home/HeroSection.tsx#L24) | Home | Home hero slide 2 | `/images/gallery-royal-1.webp` |
| 4 | hero | `hero_slide_3` | `cmsSiteContent/hero` | `alankaran_website/hero` | [HeroSection.tsx:30](src/components/home/HeroSection.tsx#L30) | Home | Home hero slide 3 · Home video reels tile 1 | `/images/cinematic_floral_wedding.webp` |
| 5 | hero | `hero_slide_4` | `cmsSiteContent/hero` | `alankaran_website/hero` | [HeroSection.tsx:36](src/components/home/HeroSection.tsx#L36) | Home | Home hero slide 4 | `/images/mughal_garden.webp` |
| 6 | hero | `hero_slide_5` | `cmsSiteContent/hero` | `alankaran_website/hero` | [HeroSection.tsx:42](src/components/home/HeroSection.tsx#L42) | Home | Home hero slide 5 | `/images/hero-couple.webp` |
| 7 | about | `about_hero` | `cmsSiteContent/about` | `alankaran_website/about` | [About.tsx:20](src/pages/About.tsx#L20) | About | About page hero background only | `/images/royal_mandap.webp` |
| 8 | about | `about_collage_3` | `cmsSiteContent/about` | `alankaran_website/about` | [About.tsx:25](src/pages/About.tsx#L25) | About | About page Brand Story, second small tile | `/images/royal_mandap.webp` |
| 9 | about | `about_collage_1` | `cmsSiteContent/about` | `alankaran_website/about` | [About.tsx:23](src/pages/About.tsx#L23) | About | About page Brand Story, large tile | `/images/coastal_wedding.webp` |
| 10 | about | `about_collage_2` | `cmsSiteContent/about` | `alankaran_website/about` | [About.tsx:24](src/pages/About.tsx#L24) | About | About page Brand Story, first small tile | `/images/mughal_garden.webp` |
| 11 | about | `about_floral_stage` | `cmsSiteContent/about` | `alankaran_website/about` | [About.tsx:26](src/pages/About.tsx#L26) | About | About page Heritage section | `/images/floral_stage.webp` |
| 12 | about | `about_founders` | `cmsSiteContent/about` | `alankaran_website/about` | [About.tsx:29](src/pages/About.tsx#L29) | About | About page Founders & Leadership section | `/images/founders.webp` |
| 13 | services | `services_hero` | `cmsSiteContent/services` | `alankaran_website/services` | [Services.tsx:68](src/pages/Services.tsx#L68) | Services | Services page hero background only | `/images/royal_mandap.webp` |
| 14 | services | `service_wedding_planning` | `cmsSiteContent/services` | `alankaran_website/services` | [Services.tsx:76](src/pages/Services.tsx#L76) | Services | Services grid card 1 · “Wedding Planning” | `/images/royal_mandap.webp` |
| 15 | services | `service_luxury_decor` | `cmsSiteContent/services` | `alankaran_website/services` | [Services.tsx:77](src/pages/Services.tsx#L77) | Services | Services grid card 2 · “Luxury Wedding Decor” | `/images/coastal_wedding.webp` |
| 16 | services | `service_floral_styling` | `cmsSiteContent/services` | `alankaran_website/services` | [Services.tsx:78](src/pages/Services.tsx#L78) | Services | Services grid card 3 · “Floral Styling” | `/images/mughal_garden.webp` |
| 17 | services | `service_mandap_design` | `cmsSiteContent/services` | `alankaran_website/services` | [Services.tsx:79](src/pages/Services.tsx#L79) | Services | Services grid card 4 · “Mandap Design” | `/images/floral_stage.webp` |
| 18 | services | `service_engagement_decor` | `cmsSiteContent/services` | `alankaran_website/services` | [Services.tsx:80](src/pages/Services.tsx#L80) | Services | Services grid card 5 · “Engagement Decor” | `/images/engagement_decor.webp` |
| 19 | services | `service_reception_styling` | `cmsSiteContent/services` | `alankaran_website/services` | [Services.tsx:81](src/pages/Services.tsx#L81) | Services | Services grid card 6 · “Reception Styling” | `/images/grand_reception.webp` |
| 20 | services | `service_royal_theme` | `cmsSiteContent/services` | `alankaran_website/services` | [Services.tsx:82](src/pages/Services.tsx#L82) | Services | Services grid card 7 · “Royal Theme Weddings” | `/images/mandap_floral_detail.webp` |
| 21 | services | `service_stage_design` | `cmsSiteContent/services` | `alankaran_website/services` | [Services.tsx:83](src/pages/Services.tsx#L83) | Services | Services grid card 8 · “Wedding Stage Design” | `/images/floral_detail.webp` |
| 22 | services | `service_bridal_entry` | `cmsSiteContent/services` | `alankaran_website/services` | [Services.tsx:84](src/pages/Services.tsx#L84) | Services | Services grid card 9 · “Bridal Entry Concepts” | `/images/bridal_entry.webp` |
| 23 | services | `service_custom_styling` | `cmsSiteContent/services` | `alankaran_website/services` | [Services.tsx:85](src/pages/Services.tsx#L85) | Services | Services grid card 10 · “Custom Event Styling” | `/images/coastal_sunset_wedding.webp` |
| 24 | testimonials | `testimonials_hero` | `cmsSiteContent/testimonials` | `alankaran_website/testimonials` | [Testimonials.tsx:47](src/pages/Testimonials.tsx#L47) | Testimonials | Testimonials page hero background | `/images/floral_detail.webp` |
| 25 | contact | `contact_hero` | `cmsSiteContent/contact` | `alankaran_website/contact` | [Contact.tsx:19](src/pages/Contact.tsx#L19) | Contact | Contact page hero background | `/images/floral_stage.webp` |
| 26 | contact | `site_logo` | `cmsSiteContent/contact` | `alankaran_website/contact` | [Logo.tsx:21](src/components/Logo.tsx#L21) | src/components/Logo.tsx | Navbar (desktop + mobile menu) · Footer — every logo on the website | `—` |

**Total: 25 named slots across 26 rows.**

`hero/hero_main` appears twice: once as the rendered hero slide 1, once as the Home page's SEO
`preloadImage` hint. Both resolve the same slot to the same URL — it is one editable image, not two.

---

## Gallery collection (not a fixed slot list)

| Property | Value |
|---|---|
| Firestore | `cmsSiteContent/gallery` |
| Cloudinary folder | `alankaran_website/gallery` |
| Component | `GalleryManager.tsx` (admin) · `galleryResolver.ts` (public) |
| Pages rendered | Gallery, Wedding Stories, Home (below fold) |
| Fallback | `BUNDLED_GALLERY_FALLBACKS` in `cms.constants.ts` |
| Draft / Published / Trash / Restore / Version / Activity | ✅ — same pipeline as named slots |
| Diagnostics | Excluded from Images X/25 by design (unbounded collection) |

## Website logo

| Property | Value |
|---|---|
| Slot | `site_logo` on `cmsSiteContent/contact` |
| Component | `Logo.tsx` |
| Pages rendered | Navbar (desktop), Navbar (mobile menu), Footer — every page |
| Fallback | Built-in inline SVG mark |
| Full capability support | ✅ — it is an ordinary slot |

## Not CMS-managed

| Image | Location | Reason |
|---|---|---|
| Destination Weddings imagery (~12) | `DestinationWeddings.tsx` | Hardcoded Unsplash URLs; page has no CMS integration |
| Logo vector fallback | `Logo.tsx` | Inline SVG, by design |


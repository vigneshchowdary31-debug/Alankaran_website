# CMS Image Mapping

**Generated from `SLOT_CATALOG` and the actual `getSlotImage()` call sites.** Every row was
verified against source — 25 catalog slots, 25 resolved render sites, zero orphans.

Every named image is a *slot*. A slot with no CMS record falls back to a bundled asset, so the
site always renders. Uploading writes the **draft**; **Publish** copies it to the published record.


## Summary

| Section | Firestore document | Cloudinary folder | Slots |
|---|---|---|---|
| Home Hero Slider | `cmsSiteContent/hero` | `alankaran_website/hero` | 5 |
| About Page | `cmsSiteContent/about` | `alankaran_website/about` | 6 |
| Services Page | `cmsSiteContent/services` | `alankaran_website/services` | 11 |
| Testimonials Page | `cmsSiteContent/testimonials` | `alankaran_website/testimonials` | 1 |
| Contact Page | `cmsSiteContent/contact` | `alankaran_website/contact` | 2 |
| Gallery (dynamic collection) | `cmsSiteContent/gallery` | `alankaran_website/gallery` | unbounded |

All slots support Draft, Publish, Version History, Trash/Restore and Activity Log — the
pipeline is identical for every one, so those columns are omitted from the per-slot tables below.


---

## Home Hero Slider — `cmsSiteContent/hero`

Cloudinary folder: `alankaran_website/hero`

| Slot | Admin label | Component | Page | Appears as | Fallback |
|---|---|---|---|---|---|
| `hero_main` | Hero Slide 1 — Main Banner | [HeroSection.tsx:18](src/components/home/HeroSection.tsx#L18) | Home (`/`) | Home hero slide 1 · also the Home page preload image | `/images/hero-mandap.webp` |
| `hero_main` | Hero Slide 1 — Main Banner | [Home.tsx:13](src/pages/Home.tsx#L13) | Home (`/`) | Home hero slide 1 · also the Home page preload image | `/images/hero-mandap.webp` |
| `hero_secondary` | Hero Slide 2 — Elevated Artistry | [HeroSection.tsx:24](src/components/home/HeroSection.tsx#L24) | Home (`/`) | Home hero slide 2 | `/images/gallery-royal-1.webp` |
| `hero_slide_3` | Hero Slide 3 — Grand Celebrations | [HeroSection.tsx:30](src/components/home/HeroSection.tsx#L30) | Home (`/`) | Home hero slide 3 · Home video reels tile 1 | `/images/cinematic_floral_wedding.webp` |
| `hero_slide_4` | Hero Slide 4 — Mughal Garden Luxury | [HeroSection.tsx:36](src/components/home/HeroSection.tsx#L36) | Home (`/`) | Home hero slide 4 | `/images/mughal_garden.webp` |
| `hero_slide_5` | Hero Slide 5 — Royal Couple Portrait | [HeroSection.tsx:42](src/components/home/HeroSection.tsx#L42) | Home (`/`) | Home hero slide 5 | `/images/hero-couple.webp` |

---

## About Page — `cmsSiteContent/about`

Cloudinary folder: `alankaran_website/about`

| Slot | Admin label | Component | Page | Appears as | Fallback |
|---|---|---|---|---|---|
| `about_hero` | About Hero Background | [About.tsx:20](src/pages/About.tsx#L20) | About (`/about`) | About page hero background only | `/images/royal_mandap.webp` |
| `about_collage_3` | Brand Story — Collage Tile 2 | [About.tsx:25](src/pages/About.tsx#L25) | About (`/about`) | About page Brand Story, second small tile | `/images/royal_mandap.webp` |
| `about_collage_1` | Brand Story — Large Collage Tile | [About.tsx:23](src/pages/About.tsx#L23) | About (`/about`) | About page Brand Story, large tile | `/images/coastal_wedding.webp` |
| `about_collage_2` | Brand Story — Collage Tile 1 | [About.tsx:24](src/pages/About.tsx#L24) | About (`/about`) | About page Brand Story, first small tile | `/images/mughal_garden.webp` |
| `about_floral_stage` | Heritage Section Image | [About.tsx:26](src/pages/About.tsx#L26) | About (`/about`) | About page Heritage section | `/images/floral_stage.webp` |
| `about_founders` | Founders Portrait | [About.tsx:29](src/pages/About.tsx#L29) | About (`/about`) | About page Founders & Leadership section | `/images/founders.webp` |

---

## Services Page — `cmsSiteContent/services`

Cloudinary folder: `alankaran_website/services`

| Slot | Admin label | Component | Page | Appears as | Fallback |
|---|---|---|---|---|---|
| `services_hero` | Services Hero Background | [Services.tsx:68](src/pages/Services.tsx#L68) | Services (`/services`) | Services page hero background only | `/images/royal_mandap.webp` |
| `service_wedding_planning` | Card 1 — Wedding Planning | [Services.tsx:76](src/pages/Services.tsx#L76) | Services (`/services`) | Services grid card 1 · “Wedding Planning” | `/images/royal_mandap.webp` |
| `service_luxury_decor` | Card 2 — Luxury Wedding Decor | [Services.tsx:77](src/pages/Services.tsx#L77) | Services (`/services`) | Services grid card 2 · “Luxury Wedding Decor” | `/images/coastal_wedding.webp` |
| `service_floral_styling` | Card 3 — Floral Styling | [Services.tsx:78](src/pages/Services.tsx#L78) | Services (`/services`) | Services grid card 3 · “Floral Styling” | `/images/mughal_garden.webp` |
| `service_mandap_design` | Card 4 — Mandap Design | [Services.tsx:79](src/pages/Services.tsx#L79) | Services (`/services`) | Services grid card 4 · “Mandap Design” | `/images/floral_stage.webp` |
| `service_engagement_decor` | Card 5 — Engagement Decor | [Services.tsx:80](src/pages/Services.tsx#L80) | Services (`/services`) | Services grid card 5 · “Engagement Decor” | `/images/engagement_decor.webp` |
| `service_reception_styling` | Card 6 — Reception Styling | [Services.tsx:81](src/pages/Services.tsx#L81) | Services (`/services`) | Services grid card 6 · “Reception Styling” | `/images/grand_reception.webp` |
| `service_royal_theme` | Card 7 — Royal Theme Weddings | [Services.tsx:82](src/pages/Services.tsx#L82) | Services (`/services`) | Services grid card 7 · “Royal Theme Weddings” | `/images/mandap_floral_detail.webp` |
| `service_stage_design` | Card 8 — Wedding Stage Design | [Services.tsx:83](src/pages/Services.tsx#L83) | Services (`/services`) | Services grid card 8 · “Wedding Stage Design” | `/images/floral_detail.webp` |
| `service_bridal_entry` | Card 9 — Bridal Entry Concepts | [Services.tsx:84](src/pages/Services.tsx#L84) | Services (`/services`) | Services grid card 9 · “Bridal Entry Concepts” | `/images/bridal_entry.webp` |
| `service_custom_styling` | Card 10 — Custom Event Styling | [Services.tsx:85](src/pages/Services.tsx#L85) | Services (`/services`) | Services grid card 10 · “Custom Event Styling” | `/images/coastal_sunset_wedding.webp` |

---

## Testimonials Page — `cmsSiteContent/testimonials`

Cloudinary folder: `alankaran_website/testimonials`

| Slot | Admin label | Component | Page | Appears as | Fallback |
|---|---|---|---|---|---|
| `testimonials_hero` | Testimonials Hero Background | [Testimonials.tsx:47](src/pages/Testimonials.tsx#L47) | Testimonials (`/testimonials`) | Testimonials page hero background | `/images/floral_detail.webp` |

---

## Contact Page — `cmsSiteContent/contact`

Cloudinary folder: `alankaran_website/contact`

| Slot | Admin label | Component | Page | Appears as | Fallback |
|---|---|---|---|---|---|
| `contact_hero` | Contact Hero Background | [Contact.tsx:19](src/pages/Contact.tsx#L19) | Contact (`/contact`) | Contact page hero background | `/images/floral_stage.webp` |
| `site_logo` | Website Logo | [Logo.tsx:21](src/components/Logo.tsx#L21) | src/components/Logo.tsx | Navbar (desktop + mobile menu) · Footer — every logo on the website | `—` |

---

## Gallery (dynamic collection)

The gallery is **not** a fixed slot list. Admins add unbounded images via the Gallery Manager; each
carries `order`, `category`, `caption` and `altText`. Ordering is by `order`, with `slotName` as a
deterministic tiebreak.

| Property | Value |
|---|---|
| Firestore | `cmsSiteContent/gallery` |
| Resolver | `resolveGalleryImages()` in `src/domains/cms/utils/galleryResolver.ts` |
| Admin | `/admin/gallery` |
| Fallback | `BUNDLED_GALLERY_FALLBACKS` in `cms.constants.ts` |

**One gallery collection feeds three pages** — see `CMS_PAGE_MAPPING.md`.

---

## Website Logo

| Property | Value |
|---|---|
| Slot | `site_logo` on `cmsSiteContent/contact` |
| Admin | `/admin/settings` |
| Component | [Logo.tsx](src/components/Logo.tsx) |
| Appears | Navbar (desktop + mobile menu), Footer |
| Fallback | Built-in inline SVG mark — used whenever no logo is published |

---

## Not CMS-managed

| Image | Location | Why |
|---|---|---|
| Destination Weddings imagery (~12) | [DestinationWeddings.tsx](src/pages/DestinationWeddings.tsx) | Hardcoded Unsplash URLs; page has no CMS integration |
| Logo vector fallback | [Logo.tsx](src/components/Logo.tsx) | Inline SVG in code, by design |


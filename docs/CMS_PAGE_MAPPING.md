# CMS Page Mapping — "If I change this, where does it appear?"

Answers the blast-radius question before you publish. Verified against source: 25 named slots, each
resolved to exactly one render site, plus the gallery collection which deliberately feeds three
pages.

**The short version:** every named slot changes exactly one place. Only the gallery is shared.

---

## Named slots — one slot, one place

### Hero — `cmsSiteContent/hero`

| Slot | Appears |
|---|---|
| `hero_main` | Home → hero slide 1. Also used as the page's `preloadImage` SEO hint (same image, not a second render) |
| `hero_secondary` | Home → hero slide 2 |
| `hero_slide_3` | Home → hero slide 3 |
| `hero_slide_4` | Home → hero slide 4 |
| `hero_slide_5` | Home → hero slide 5 |

### About — `cmsSiteContent/about`

| Slot | Appears |
|---|---|
| `about_hero` | About → hero background **only** |
| `about_collage_1` | About → Brand Story, large 4:3 tile |
| `about_collage_2` | About → Brand Story, first square tile |
| `about_collage_3` | About → Brand Story, second square tile |
| `about_floral_stage` | About → Heritage section |
| `about_founders` | About → Founders & Leadership portrait |

### Services — `cmsSiteContent/services`

| Slot | Appears |
|---|---|
| `services_hero` | Services → hero background **only** |
| `service_wedding_planning` | Services → grid card 1 |
| `service_luxury_decor` | Services → grid card 2 |
| `service_floral_styling` | Services → grid card 3 |
| `service_mandap_design` | Services → grid card 4 |
| `service_engagement_decor` | Services → grid card 5 |
| `service_reception_styling` | Services → grid card 6 |
| `service_royal_theme` | Services → grid card 7 |
| `service_stage_design` | Services → grid card 8 |
| `service_bridal_entry` | Services → grid card 9 |
| `service_custom_styling` | Services → grid card 10 |

### Testimonials / Contact

| Slot | Appears |
|---|---|
| `testimonials_hero` | Testimonials → hero background |
| `contact_hero` | Contact → hero background |

### Website logo — `site_logo` on `cmsSiteContent/contact`

Appears in **three** places, all showing the same mark:
- Navbar (desktop)
- Navbar (mobile menu)
- Footer

Publishing a logo replaces the built-in vector mark everywhere at once. This is intended.

---

## Gallery — the one shared collection

⚠️ **A gallery image is not confined to the Gallery page.** One collection, ordered by `order`,
feeds three surfaces:

| Position | Gallery page | Wedding Stories | Home (below fold) |
|---|---|---|---|
| 1–8 | ✅ grid | ✅ story imagery | ✅ luxury showcase |
| 9 | ✅ grid | — | ✅ mandap detail tile |
| 10–12 | ✅ grid | — | ✅ cinematic tiles |
| 13+ | ✅ grid | — | — |

Additionally:
- **Gallery page hero** = the first published gallery image (`galleryItems[0]`)
- **Wedding Stories hero** = the first published gallery image

So replacing the **first** gallery image changes: the Gallery hero, the Gallery grid, the Wedding
Stories hero, the Wedding Stories imagery, *and* the Home below-fold showcase.

Reordering the gallery therefore reshuffles three pages at once. This is by design, but it is the
single easiest way to cause an unintended change — check here before reordering.

---

## Reverse index — "what controls this page?"

| Page | Controlled by |
|---|---|
| Home (`/`) | `hero.*` (5 slots) + gallery positions 1–12 |
| About (`/about`) | `about.*` (6 slots) |
| Services (`/services`) | `services.*` (11 slots) |
| Gallery (`/gallery`) | Gallery collection (all) |
| Wedding Stories (`/wedding-stories`) | Gallery positions 1–8 |
| Testimonials (`/testimonials`) | `testimonials_hero` |
| Contact (`/contact`) | `contact_hero` + all global text settings |
| Every page | `site_logo`, global contact settings (Footer) |
| Destination Weddings (`/destinations`) | ❌ Nothing — hardcoded, not CMS-managed |

---

## Global text settings

Editing any of these changes **every page** that renders them:

| Setting | Appears |
|---|---|
| Phone numbers | Footer, Contact page (`tel:` links) |
| Email addresses | Footer, Contact page (`mailto:` links) |
| WhatsApp number | Floating WhatsApp button (all pages), Footer icon, Contact page |
| Address | Footer, Contact page, map caption |
| Google Maps query | Contact page embedded map |
| Instagram URL | Footer, Contact page |
| Facebook URL | Footer, Contact page |

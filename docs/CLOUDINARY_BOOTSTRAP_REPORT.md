# Cloudinary Bootstrap Report



| Metric | Count |
|---|---|
| Slot mappings | 24 |
| Distinct local files | 15 |
| Uploaded | 15 |
| Reused (already in Cloudinary) | 0 |
| Failed | 0 |
| Missing local files | 0 |
| Firestore documents updated | 5 |
| Firestore failures | 0 |
| Broken delivery URLs | 0 |
| Duration | 18.5s |

## Assets

| File | public_id | Status | Dimensions |
|---|---|---|---|
| `hero-mandap.webp` | `alankaran_website/hero/hero-mandap` | Uploaded | 1408×768 |
| `gallery-royal-1.webp` | `alankaran_website/hero/gallery-royal-1` | Uploaded | 896×1280 |
| `cinematic_floral_wedding.webp` | `alankaran_website/hero/cinematic_floral_wedding` | Uploaded | 1024×1024 |
| `mughal_garden.webp` | `alankaran_website/hero/mughal_garden` | Uploaded | 1024×1024 |
| `hero-couple.webp` | `alankaran_website/hero/hero-couple` | Uploaded | 1024×1024 |
| `royal_mandap.webp` | `alankaran_website/about/royal_mandap` | Uploaded | 1024×1024 |
| `coastal_wedding.webp` | `alankaran_website/about/coastal_wedding` | Uploaded | 1024×1024 |
| `floral_stage.webp` | `alankaran_website/about/floral_stage` | Uploaded | 1024×1024 |
| `founders.webp` | `alankaran_website/about/founders` | Uploaded | 682×1024 |
| `engagement_decor.webp` | `alankaran_website/services/engagement_decor` | Uploaded | 1024×1024 |
| `grand_reception.webp` | `alankaran_website/services/grand_reception` | Uploaded | 1024×1024 |
| `mandap_floral_detail.webp` | `alankaran_website/services/mandap_floral_detail` | Uploaded | 1024×1024 |
| `floral_detail.webp` | `alankaran_website/services/floral_detail` | Uploaded | 1024×1024 |
| `bridal_entry.webp` | `alankaran_website/services/bridal_entry` | Uploaded | 1024×1024 |
| `coastal_sunset_wedding.webp` | `alankaran_website/services/coastal_sunset_wedding` | Uploaded | 1024×1024 |

## Firestore documents updated

- `cmsSiteContent/hero`
- `cmsSiteContent/about`
- `cmsSiteContent/services`
- `cmsSiteContent/testimonials`
- `cmsSiteContent/contact`

## Failures

_none_

## Broken URLs

_none_

## Deliberately skipped

- `contact/site_logo` — No local asset — the logo falls back to an inline SVG.
- `gallery/*` — Gallery slot names are generated at upload time; not bootstrapped.

## Local fallbacks

All 16 files in `public/images` are retained. The resolver serves the Cloudinary URL when it
loads and falls back to the local asset when it does not, so a Cloudinary outage or a dead URL
still renders a real image.

## Rollback

Nothing here is destructive, so rollback is a matter of removing references:

1. **Revert Firestore** — in the Firebase console delete the `slots`, `draftSlots` and
   `publishedSlots` fields on the affected `cmsSiteContent/*` documents. The site immediately
   returns to bundled local images.
2. **Cloudinary assets** — harmless to leave. To remove them, delete the
   `alankaran_website/*` folders from the Cloudinary console (the browser and this script
   cannot delete: that needs the signed Admin API).
3. **Re-running is safe** — deterministic `public_id`s mean a second run reuses the existing
   assets rather than duplicating them.

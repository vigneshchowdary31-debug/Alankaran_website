# Gallery Bootstrap Report



| Metric | Count |
|---|---|
| Gallery entries discovered | 14 |
| Distinct source images | 8 |
| Cloudinary assets uploaded/reused | 8 |
| Gallery documents created | 14 |
| Failed uploads | 0 |
| Missing local images | 0 |
| Skipped entries | 0 |
| Broken URLs | 0 |
| Duration | 17.8s |

## Discovered gallery — website order preserved

| Order | Local Image | Label | Category | Slot Name |
|---|---|---|---|---|
| 0 | `royal_mandap.webp` | Royal Mandap, Udaipur | Mandaps & Stages | `gallery_bootstrap_00_royal_mandap` |
| 1 | `floral_stage.webp` | Garden Floristry, Jaipur | Floral Details | `gallery_bootstrap_01_floral_stage` |
| 2 | `grand_reception.webp` | Grand Reception, Mumbai | Grand Reception | `gallery_bootstrap_02_grand_reception` |
| 3 | `bridal_entry.webp` | Floral Tunnel, Goa | Bridal & Groom Entry | `gallery_bootstrap_03_bridal_entry` |
| 4 | `mughal_garden.webp` | Rajputana Theme, Jodhpur | Royal Weddings | `gallery_bootstrap_04_mughal_garden` |
| 5 | `engagement_decor.webp` | Baroque Stage, Delhi | Palace Decor | `gallery_bootstrap_05_engagement_decor` |
| 6 | `royal_mandap.webp` | Mughal Mandap, Agra | Mandaps & Stages | `gallery_bootstrap_06_royal_mandap` |
| 7 | `floral_detail.webp` | Rose Canopy, Lucknow | Floral Details | `gallery_bootstrap_07_floral_detail` |
| 8 | `grand_reception.webp` | Crystal Reception, Hyderabad | Grand Reception | `gallery_bootstrap_08_grand_reception` |
| 9 | `bridal_entry.webp` | Smoke & Light Entry, Chennai | Bridal & Groom Entry | `gallery_bootstrap_09_bridal_entry` |
| 10 | `mughal_garden.webp` | Mughal Garden, Jaisalmer | Royal Weddings | `gallery_bootstrap_10_mughal_garden` |
| 11 | `engagement_decor.webp` | Ivory Stage, Pune | Palace Decor | `gallery_bootstrap_11_engagement_decor` |
| 12 | `coastal_wedding.webp` | Floral Arch Mandap, Goa | Mandaps & Stages | `gallery_bootstrap_12_coastal_wedding` |
| 13 | `floral_stage.webp` | Jasmine Wall, Udaipur | Floral Details | `gallery_bootstrap_13_floral_stage` |

## Cloudinary assets

6 of the 8 source images back two gallery positions each under different labels. Each image is
uploaded **once**; the two positions become separate gallery documents sharing one `public_id`,
because both positions render on the live site.

| Source | public_id | Dimensions |
|---|---|---|
| `royal_mandap.webp` | `alankaran_website/gallery/royal_mandap` | 1024×1024 |
| `floral_stage.webp` | `alankaran_website/gallery/floral_stage` | 1024×1024 |
| `grand_reception.webp` | `alankaran_website/gallery/grand_reception` | 1024×1024 |
| `bridal_entry.webp` | `alankaran_website/gallery/bridal_entry` | 1024×1024 |
| `mughal_garden.webp` | `alankaran_website/gallery/mughal_garden` | 1024×1024 |
| `engagement_decor.webp` | `alankaran_website/gallery/engagement_decor` | 1024×1024 |
| `floral_detail.webp` | `alankaran_website/gallery/floral_detail` | 1024×1024 |
| `coastal_wedding.webp` | `alankaran_website/gallery/coastal_wedding` | 1024×1024 |

## Categories assigned

- Mandaps & Stages — 3 entries
- Floral Details — 3 entries
- Grand Reception — 2 entries
- Bridal & Groom Entry — 2 entries
- Royal Weddings — 2 entries
- Palace Decor — 2 entries

## Failures

_none_

## Validation

| Check | Result | Detail |
|---|---|---|
| Every Cloudinary URL returns HTTP 200 | PASS | 8/8 reachable |
| Every URL contains /v<version>/ | PASS | all versioned |
| Gallery documents created and readable | PASS | 14 slots in cmsSiteContent/gallery |
| Ordering matches the current website | PASS | orders 0..13, no alphabetical sort |
| Wedding Story positions 0-7 populated | PASS | all present |
| Home Below Fold positions 0-11 populated | PASS | all present |

## Broken URLs

_none_

## Notes

- **Schema unchanged.** Documents match exactly what `BulkUploadModal` writes
  (`altText`, `caption`, `category`, `order`, `visibility`), so the Gallery Manager reads them
  with no special-casing. The requested `title`/`description`/`published` names were not used —
  they would produce records the Gallery Manager cannot read.
- **Order preserved.** `order` is the website's index (0-13). Nothing is alphabetically sorted.
- **Local fallbacks retained.** All 16 files in `public/images` are untouched.
- **Idempotent.** Deterministic slot names and `public_id`s mean a re-run overwrites the same
  keys and reuses the same assets rather than duplicating either.
- **Versioned URLs only.** Every stored URL is the `secure_url` returned by the upload API.
  Hand-built versionless URLs are unreliable on this account and can 404.

## Rollback

1. In the Firebase console, delete the `gallery_bootstrap_*` keys from `slots`, `draftSlots`
   and `publishedSlots` on `cmsSiteContent/gallery`. The site returns to bundled fallbacks.
2. Cloudinary assets under `alankaran_website/gallery/` can be left (harmless) or deleted from
   the Cloudinary console.

import type { SectionKey, CMSSectionContent } from "../types";

/**
 * Firestore locations are NOT declared here. `FirestorePaths` in `@/services/firestore` is the single
 * source of truth — build every address with `FirestorePaths.siteContent(sectionKey)` and friends.
 */

export const CACHE_CONFIG = {
  DEFAULT_TTL_MS: 30 * 60 * 1000, // 30 minutes
  STORAGE_PREFIX: "alankaran_cms_cache_",
} as const;

/**
 * A single named image slot the public website renders.
 */
export interface SlotDefinition {
  slotName: string;
  /** Human label shown in the admin editor. */
  label: string;
  /** Upload guidance shown under the dropzone. */
  description: string;
  /** Where this image appears on the public site — shown to admins so the slot is identifiable. */
  usage: string;
}

/**
 * A section whose slots are a fixed, named catalog (as opposed to `gallery`, which is a dynamic
 * collection). Every entry here is rendered as an editor in `/admin/images` automatically —
 * adding a slot to this catalog is the ONLY step needed to make it editable.
 */
export interface SectionDefinition {
  sectionKey: SectionKey;
  title: string;
  description: string;
  /** Cloudinary folder new uploads land in. */
  folder: string;
  slots: SlotDefinition[];
}

/**
 * THE SLOT CATALOG — the single source of truth for every named image the website renders.
 *
 * This must stay in lockstep with the `getSlotImage(...)` calls in the public pages. A slot the site
 * requests but that is missing here has no editor; a slot listed here that the site never requests is
 * reported as "unused" by Diagnostics. `slotCoverageService` audits both directions at runtime.
 *
 * `gallery` is deliberately absent: it is a dynamic collection managed by the Gallery Manager, not a
 * fixed slot list. See `getGalleryImages()` in `SiteContentProvider`.
 */
export const SLOT_CATALOG: SectionDefinition[] = [
  {
    sectionKey: "hero",
    title: "Home Hero Slider",
    description: "The five full-screen slides rotating above the fold on the home page.",
    folder: "alankaran_website/hero",
    slots: [
      {
        slotName: "hero_main",
        label: "Hero Slide 1 — Main Banner",
        description: "Recommended: 1920 × 1080 px (landscape). WebP or JPG.",
        usage: "Home hero slide 1 · also the Home page preload image",
      },
      {
        slotName: "hero_secondary",
        label: "Hero Slide 2 — Elevated Artistry",
        description: "Recommended: 1920 × 1080 px (landscape).",
        usage: "Home hero slide 2",
      },
      {
        slotName: "hero_slide_3",
        label: "Hero Slide 3 — Grand Celebrations",
        description: "Recommended: 1920 × 1080 px (landscape).",
        usage: "Home hero slide 3 · Home video reels tile 1",
      },
      {
        slotName: "hero_slide_4",
        label: "Hero Slide 4 — Mughal Garden Luxury",
        description: "Recommended: 1920 × 1080 px (landscape).",
        usage: "Home hero slide 4",
      },
      {
        slotName: "hero_slide_5",
        label: "Hero Slide 5 — Royal Couple Portrait",
        description: "Recommended: 1920 × 1080 px (landscape).",
        usage: "Home hero slide 5",
      },
    ],
  },
  {
    sectionKey: "about",
    title: "About Page",
    description: "Imagery across the About page — hero, story collage, heritage, and founders.",
    folder: "alankaran_website/about",
    slots: [
      {
        slotName: "about_hero",
        label: "About Hero Background",
        description: "Recommended: 1920 × 1080 px (landscape).",
        usage: "About page hero background only",
      },
      {
        slotName: "about_collage_3",
        label: "Brand Story — Collage Tile 2",
        description: "Recommended: 800 × 800 px (square).",
        usage: "About page Brand Story, second small tile",
      },
      {
        slotName: "about_collage_1",
        label: "Brand Story — Large Collage Tile",
        description: "Recommended: 1200 × 1500 px (vertical).",
        usage: "About page Brand Story, large tile",
      },
      {
        slotName: "about_collage_2",
        label: "Brand Story — Collage Tile 1",
        description: "Recommended: 800 × 800 px (square).",
        usage: "About page Brand Story, first small tile",
      },
      {
        slotName: "about_floral_stage",
        label: "Heritage Section Image",
        description: "Recommended: 1200 × 900 px (landscape).",
        usage: "About page Heritage section",
      },
      {
        slotName: "about_founders",
        label: "Founders Portrait",
        description: "Recommended: 1200 × 1500 px (vertical). Chaitanya & Chandrika Kulkarni.",
        usage: "About page Founders & Leadership section",
      },
    ],
  },
  {
    sectionKey: "services",
    title: "Services Page",
    description:
      "One image per service card, plus the page hero. Each slot maps to exactly one card — the slot " +
      "order below is the render order in the services grid.",
    folder: "alankaran_website/services",
    slots: [
      {
        slotName: "services_hero",
        label: "Services Hero Background",
        description: "Recommended: 1600 × 900 px (wide landscape).",
        usage: "Services page hero background only",
      },
      {
        slotName: "service_wedding_planning",
        label: "Card 1 — Wedding Planning",
        description: "Recommended: 1200 × 900 px (16:9).",
        usage: "Services grid card 1 · “Wedding Planning”",
      },
      {
        slotName: "service_luxury_decor",
        label: "Card 2 — Luxury Wedding Decor",
        description: "Recommended: 1200 × 900 px (16:9).",
        usage: "Services grid card 2 · “Luxury Wedding Decor”",
      },
      {
        slotName: "service_floral_styling",
        label: "Card 3 — Floral Styling",
        description: "Recommended: 1200 × 900 px (16:9).",
        usage: "Services grid card 3 · “Floral Styling”",
      },
      {
        slotName: "service_mandap_design",
        label: "Card 4 — Mandap Design",
        description: "Recommended: 1200 × 900 px (16:9).",
        usage: "Services grid card 4 · “Mandap Design”",
      },
      {
        slotName: "service_engagement_decor",
        label: "Card 5 — Engagement Decor",
        description: "Recommended: 1200 × 900 px (16:9).",
        usage: "Services grid card 5 · “Engagement Decor”",
      },
      {
        slotName: "service_reception_styling",
        label: "Card 6 — Reception Styling",
        description: "Recommended: 1200 × 900 px (16:9).",
        usage: "Services grid card 6 · “Reception Styling”",
      },
      {
        slotName: "service_royal_theme",
        label: "Card 7 — Royal Theme Weddings",
        description: "Recommended: 1200 × 900 px (16:9).",
        usage: "Services grid card 7 · “Royal Theme Weddings”",
      },
      {
        slotName: "service_stage_design",
        label: "Card 8 — Wedding Stage Design",
        description: "Recommended: 1200 × 900 px (16:9).",
        usage: "Services grid card 8 · “Wedding Stage Design”",
      },
      {
        slotName: "service_bridal_entry",
        label: "Card 9 — Bridal Entry Concepts",
        description: "Recommended: 1200 × 900 px (16:9).",
        usage: "Services grid card 9 · “Bridal Entry Concepts”",
      },
      {
        slotName: "service_custom_styling",
        label: "Card 10 — Custom Event Styling",
        description: "Recommended: 1200 × 900 px (16:9).",
        usage: "Services grid card 10 · “Custom Event Styling”",
      },
    ],
  },
  {
    sectionKey: "testimonials",
    title: "Testimonials Page",
    description: "Imagery on the client testimonials page.",
    folder: "alankaran_website/testimonials",
    slots: [
      {
        slotName: "testimonials_hero",
        label: "Testimonials Hero Background",
        description: "Recommended: 1920 × 1080 px (landscape).",
        usage: "Testimonials page hero background",
      },
    ],
  },
  {
    sectionKey: "contact",
    title: "Contact Page",
    description:
      "Imagery on the contact page, plus the site-wide logo. The global text settings (phone, " +
      "email, WhatsApp, address, map, social links) live on this same document.",
    folder: "alankaran_website/contact",
    slots: [
      {
        slotName: "contact_hero",
        label: "Contact Hero Background",
        description: "Recommended: 1920 × 1080 px (landscape).",
        usage: "Contact page hero background",
      },
      {
        slotName: "site_logo",
        label: "Website Logo",
        description:
          "Recommended: transparent PNG or SVG, at least 200 × 230 px. Leave empty to keep the " +
          "built-in vector logo.",
        usage: "Navbar (desktop + mobile menu) · Footer — every logo on the website",
      },
    ],
  },
];

/**
 * `gallery` holds an unbounded, admin-uploaded collection ordered by `slot.order` rather than a fixed
 * slot list, so it is excluded from the named catalog and from `/admin/images`.
 */
export const DYNAMIC_COLLECTION_SECTIONS: SectionKey[] = ["gallery"];

/**
 * The gallery category vocabulary — shared by the admin upload/metadata editors AND the public
 * gallery filter bar, so an admin-assigned category always matches a public filter.
 */
export const GALLERY_CATEGORIES = [
  "Royal Weddings",
  "Palace Decor",
  "Mandaps & Stages",
  "Bridal & Groom Entry",
  "Engagement & Haldi",
  "Grand Reception",
  "Floral Details",
] as const;

export const DEFAULT_GALLERY_CATEGORY = "Royal Weddings";

export interface GalleryFallbackItem {
  url: string;
  label: string;
  category: string;
}

/**
 * Bundled gallery shown only while the CMS gallery is empty (fresh install / offline).
 * As soon as an admin publishes gallery images, `getGalleryImages()` returns those instead and this
 * list is never rendered.
 */
export const BUNDLED_GALLERY_FALLBACKS: GalleryFallbackItem[] = [
  { url: "/images/royal_mandap.webp", label: "Royal Mandap, Udaipur", category: "Mandaps & Stages" },
  { url: "/images/floral_stage.webp", label: "Garden Floristry, Jaipur", category: "Floral Details" },
  { url: "/images/grand_reception.webp", label: "Grand Reception, Mumbai", category: "Grand Reception" },
  { url: "/images/bridal_entry.webp", label: "Floral Tunnel, Goa", category: "Bridal & Groom Entry" },
  { url: "/images/mughal_garden.webp", label: "Rajputana Theme, Jodhpur", category: "Royal Weddings" },
  { url: "/images/engagement_decor.webp", label: "Baroque Stage, Delhi", category: "Palace Decor" },
  { url: "/images/royal_mandap.webp", label: "Mughal Mandap, Agra", category: "Mandaps & Stages" },
  { url: "/images/floral_detail.webp", label: "Rose Canopy, Lucknow", category: "Floral Details" },
  { url: "/images/grand_reception.webp", label: "Crystal Reception, Hyderabad", category: "Grand Reception" },
  { url: "/images/bridal_entry.webp", label: "Smoke & Light Entry, Chennai", category: "Bridal & Groom Entry" },
  { url: "/images/mughal_garden.webp", label: "Mughal Garden, Jaisalmer", category: "Royal Weddings" },
  { url: "/images/engagement_decor.webp", label: "Ivory Stage, Pune", category: "Palace Decor" },
  { url: "/images/coastal_wedding.webp", label: "Floral Arch Mandap, Goa", category: "Mandaps & Stages" },
  { url: "/images/floral_stage.webp", label: "Jasmine Wall, Udaipur", category: "Floral Details" },
];

/** Every section the public site reads (named catalog + dynamic collections). */
export const PUBLIC_SECTIONS: SectionKey[] = [
  ...SLOT_CATALOG.map((s) => s.sectionKey),
  ...DYNAMIC_COLLECTION_SECTIONS,
];

export function getSectionDefinition(sectionKey: SectionKey | string): SectionDefinition | undefined {
  return SLOT_CATALOG.find((s) => s.sectionKey === sectionKey);
}

export function getSlotDefinition(
  sectionKey: SectionKey | string,
  slotName: string
): SlotDefinition | undefined {
  return getSectionDefinition(sectionKey)?.slots.find((s) => s.slotName === slotName);
}

/**
 * Named slots per section, derived from `SLOT_CATALOG` so the two can never drift.
 * `gallery` is empty by design — it is a dynamic collection.
 */
export const DEFAULT_SECTION_SLOTS: Record<SectionKey, string[]> = {
  hero: [],
  about: [],
  services: [],
  testimonials: [],
  contact: [],
  gallery: [],
  settings: [],
};
for (const section of SLOT_CATALOG) {
  DEFAULT_SECTION_SLOTS[section.sectionKey] = section.slots.map((s) => s.slotName);
}

/** Total number of named slots the website renders — used by the coverage report. */
export const TOTAL_CATALOG_SLOTS = SLOT_CATALOG.reduce((sum, s) => sum + s.slots.length, 0);

/**
 * Generates an empty default section document structure when Firestore has no existing record yet.
 */
export function createEmptySection(sectionKey: SectionKey | string): CMSSectionContent {
  const def = getSectionDefinition(sectionKey);
  return {
    sectionKey,
    title: def?.title || `${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} Section`,
    description: def?.description || `Managed image slots for the ${sectionKey} area of the website.`,
    slots: {},
    updatedAt: Date.now(),
    updatedBy: "system@alankaran.com",
  };
}

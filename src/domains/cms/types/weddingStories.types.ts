/**
 * Wedding Stories CMS types.
 *
 * A story is stored one-per-document in the `weddingStories` collection; the hero lives in the
 * reserved `__hero` document of the same collection. Field names follow the same conventions as the
 * rest of the CMS — Cloudinary assets carry `url` + `cloudinaryId` (never a hand-built URL), and
 * publish state is a `status` string, mirroring the draft/published model used elsewhere.
 */

/** One Cloudinary-backed image within a story. Matches the metadata the upload service returns. */
export interface WeddingStoryImage {
  url: string; // Cloudinary secure_url (versioned) — never constructed
  cloudinaryId: string;
  width?: number;
  height?: number;
  format?: string;
  version?: number;
  altText?: string;
}

export type WeddingStoryStatus = "draft" | "published" | "archived";

/**
 * A single wedding story.
 *
 * `bride`/`groom` and `month`/`year` are stored split (per the editor) but rendered joined on the
 * public page (`{bride} & {groom}`, `{month} {year}`), so the page stays byte-identical to the
 * original hardcoded version.
 */
export interface WeddingStory {
  id: string;
  bride: string;
  groom: string;
  location: string;
  month: string;
  year: string;
  theme: string;
  palette: string;
  paragraph1: string;
  paragraph2: string;
  /** Exactly four positions: [0] header, [1] large grid, [2] small-top, [3] small-bottom. */
  images: (WeddingStoryImage | null)[];
  // Optional SEO
  photographer?: string;
  venue?: string;
  tags?: string[];
  order: number;
  status: WeddingStoryStatus;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number | null;
  updatedBy?: string;
}

/**
 * The Wedding Stories hero.
 *
 * `overlayOpacity` multiplies the existing three-stop gradient (default 1.0 = the current
 * appearance) rather than replacing it, so the hero's falloff is preserved.
 */
export interface WeddingStoriesHero {
  image: WeddingStoryImage | null;
  subtitle: string;
  titleLine1: string;
  titleLine2: string;
  overlayOpacity: number;
  status: WeddingStoryStatus;
  updatedAt: number;
  publishedAt?: number | null;
  updatedBy?: string;
  // Draft/published split, mirroring the rest of the CMS.
  publishedImage?: WeddingStoryImage | null;
  publishedSubtitle?: string;
  publishedTitleLine1?: string;
  publishedTitleLine2?: string;
  publishedOverlayOpacity?: number;
}

export const EMPTY_STORY_IMAGES: (WeddingStoryImage | null)[] = [null, null, null, null];

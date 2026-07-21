import type { CMSSlotMetadata } from "../types";

/**
 * One image in the dynamic gallery collection, resolved for public rendering.
 */
export interface ResolvedGalleryImage {
  url: string;
  altText: string;
  caption?: string;
  category?: string;
  order: number;
  slotName: string;
  cloudinaryId?: string;
}

/**
 * Phase A Task 1 — the single rule that decides what the public gallery shows.
 *
 * Kept as a pure function (rather than inline in `SiteContentProvider`) so the exact contract the
 * Gallery Manager writes against — order ascending, deleted and hidden excluded — is testable in
 * isolation and cannot drift from the provider.
 *
 * Slots without a `url` are dropped: a record can exist mid-upload before Cloudinary returns.
 * Slots without an `order` sort last, then by slotName, so a legacy record never lands first by luck.
 */
export function resolveGalleryImages(
  slotMap: Record<string, CMSSlotMetadata> | undefined | null
): ResolvedGalleryImage[] {
  if (!slotMap || typeof slotMap !== "object") return [];

  return Object.values(slotMap)
    .filter(
      (slot): slot is CMSSlotMetadata =>
        Boolean(slot?.url) && !slot?.isDeleted && slot?.visibility !== false
    )
    .map((slot) => ({
      url: slot.url,
      altText: slot.altText || slot.caption || "Alankaran wedding gallery image",
      caption: slot.caption,
      category: slot.category,
      order: typeof slot.order === "number" ? slot.order : Number.MAX_SAFE_INTEGER,
      slotName: slot.slotName,
      cloudinaryId: slot.cloudinaryId,
    }))
    .sort((a, b) => a.order - b.order || a.slotName.localeCompare(b.slotName));
}

/**
 * Chooses which slot map the public site reads for a section.
 * Admins in Preview Mode see the working draft; everyone else sees only published content, falling
 * back to `slots` for legacy records written before the publish workflow existed.
 */
export function selectPublicSlotMap(
  section: any,
  previewMode: boolean
): Record<string, CMSSlotMetadata> {
  if (!section) return {};
  if (previewMode) {
    return { ...(section.draftSlots || {}), ...(section.slots || {}) };
  }
  return section.publishedSlots || section.slots || {};
}

/**
 * The gallery's working-draft slot map for the admin Gallery Manager.
 *
 * `slots` is the single source of truth: every gallery write (`saveSlot`, reorder, delete, restore)
 * maintains `slots`. The `draftSlots` field is a legacy artifact left by the one-time bootstrap; it
 * is NOT kept current, so reading it renders stale data. Both admin gallery reads (the grid and the
 * Live Preview) go through this one function so they can never diverge.
 */
export function selectGalleryDraftSlots(section: any): Record<string, CMSSlotMetadata> {
  return (section?.slots || {}) as Record<string, CMSSlotMetadata>;
}

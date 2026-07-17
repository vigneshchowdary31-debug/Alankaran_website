import type { CMSSlotMetadata, ImageUsageReference } from "../types";

/**
 * Phase 3.5 Enterprise Image Usage Tracking Service (`Task 9`).
 * Tracks exact references to every uploaded asset across sections (`hero`, `about`, `services`, `gallery`).
 * Prevents orphaned deletions and provides immediate pre-deletion warning diagnostics.
 */

const DISPLAY_NAME_MAP: Record<string, string> = {
  hero_main: "Hero Section — Primary Background Banner",
  hero_secondary: "Hero Section — Secondary Mobile Overlay",
  about_portrait: "About Section — Royal Couple Arch Portrait",
  about_collage_1: "About Section — Heritage Detail 1",
  about_collage_2: "About Section — Heritage Detail 2",
  service_mandap: "Services Section — Royal Mandap Architectural Cover",
  service_decor: "Services Section — Bespoke Decor Detail",
  service_floral: "Services Section — Artisanal Floral Arrangement",
};

class ImageUsageService {
  /**
   * Scans a collection of slot maps and returns all active references matching a `cloudinaryId` or `url`.
   */
  findReferences(
    targetCloudinaryId: string,
    allSections: Record<string, Record<string, CMSSlotMetadata>>
  ): ImageUsageReference[] {
    const refs: ImageUsageReference[] = [];
    if (!targetCloudinaryId) return refs;

    for (const [sectionKey, slots] of Object.entries(allSections)) {
      if (!slots) continue;
      for (const [slotName, slot] of Object.entries(slots)) {
        if (slot && (slot.cloudinaryId === targetCloudinaryId || slot.url === targetCloudinaryId)) {
          refs.push({
            slotId: slot.id || `${sectionKey}_${slotName}`,
            sectionKey,
            slotName,
            displayName: DISPLAY_NAME_MAP[slotName] || `${sectionKey.toUpperCase()} (${slotName})`,
            url: slot.url,
            cloudinaryId: slot.cloudinaryId,
          });
        }
      }
    }
    return refs;
  }

  /**
   * Validates if a slot can be safely deleted or replaced without severing critical active references.
   */
  checkDeletionSafety(
    slot: CMSSlotMetadata,
    allSections: Record<string, any>
  ): { isSafe: boolean; isPublishedLive: boolean; warningMessage: string; activeReferences: ImageUsageReference[] } {
    if (!slot || !slot.cloudinaryId) {
      return { isSafe: true, isPublishedLive: false, warningMessage: "", activeReferences: [] };
    }

    const draftSlotsMap: Record<string, Record<string, CMSSlotMetadata>> = {};
    const publishedSlotsMap: Record<string, Record<string, CMSSlotMetadata>> = {};

    for (const [key, sec] of Object.entries(allSections)) {
      if (sec?.slots) draftSlotsMap[key] = sec.slots;
      if (sec?.publishedSlots) publishedSlotsMap[key] = sec.publishedSlots;
    }

    const draftRefs = this.findReferences(slot.cloudinaryId, draftSlotsMap);
    const publishedRefs = this.findReferences(slot.cloudinaryId, publishedSlotsMap);
    const isPublishedLive = publishedRefs.length > 0;
    const allRefs = [...draftRefs, ...publishedRefs.filter((pr) => !draftRefs.some((dr) => dr.slotId === pr.slotId))];

    if (isPublishedLive) {
      const names = publishedRefs.map((r) => r.displayName).join(", ");
      return {
        isSafe: false,
        isPublishedLive: true,
        warningMessage: `CRITICAL PROTECTION (Task 15): This asset (${slot.cloudinaryId}) is currently PUBLISHED AND LIVE on the public website inside: ${names}. You cannot delete a live published image without replacing or unpublishing it first.`,
        activeReferences: allRefs,
      };
    }

    if (draftRefs.length > 1) {
      const names = draftRefs.map((r) => r.displayName).join(", ");
      return {
        isSafe: false,
        isPublishedLive: false,
        warningMessage: `Caution: This image (${slot.cloudinaryId}) is referenced across ${draftRefs.length} working draft slots (${names}). Deleting or replacing it will impact those slots.`,
        activeReferences: allRefs,
      };
    }

    return {
      isSafe: true,
      isPublishedLive: false,
      warningMessage: "",
      activeReferences: allRefs,
    };
  }
}

export const imageUsageService = new ImageUsageService();
export default imageUsageService;

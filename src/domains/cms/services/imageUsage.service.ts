import type { CMSSlotMetadata, ImageUsageReference } from "../types";
import { getSlotDefinition, getSectionDefinition } from "../constants";

/**
 * Phase 3.5 Enterprise Image Usage Tracking Service (`Task 9`).
 * Tracks exact references to every uploaded asset across sections (`hero`, `about`, `services`, `gallery`).
 * Prevents orphaned deletions and provides immediate pre-deletion warning diagnostics.
 */

/**
 * Human label for a slot, derived from `SLOT_CATALOG` rather than a hand-maintained map.
 *
 * This was previously a hardcoded `DISPLAY_NAME_MAP` covering only 8 of the 21 named slots, and it
 * had drifted: it still described slot names that no longer existed, and mislabelled `hero_secondary`
 * as a "Secondary Mobile Overlay" when it is hero slide 2's full background. Reading the catalog
 * means a slot can never be renamed or added without its label following automatically.
 */
function displayNameFor(sectionKey: string, slotName: string): string {
  const def = getSlotDefinition(sectionKey, slotName);
  if (def) return `${getSectionDefinition(sectionKey)?.title || sectionKey} — ${def.label}`;
  return `${sectionKey.toUpperCase()} (${slotName})`;
}

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
            displayName: displayNameFor(sectionKey, slotName),
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

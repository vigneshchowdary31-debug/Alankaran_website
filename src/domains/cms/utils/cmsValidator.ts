import type { CMSSlotMetadata, CMSSectionContent } from "../types";

/**
 * Validates a CMSSlotMetadata object before persistence to Firestore (`Task 14`).
 * Prevents invalid documents, missing metadata, duplicate/empty IDs, and corrupt image structures.
 */
export function validateCMSSlotMetadata(metadata: Partial<CMSSlotMetadata>): { valid: boolean; error?: string } {
  if (!metadata) {
    return { valid: false, error: "Metadata object is missing or null." };
  }
  if (!metadata.id || typeof metadata.id !== "string" || !metadata.id.trim()) {
    return { valid: false, error: "Slot record has an empty or invalid domain ID." };
  }
  if (!metadata.sectionKey || typeof metadata.sectionKey !== "string" || !metadata.sectionKey.trim()) {
    return { valid: false, error: "Slot record is missing a sectionKey." };
  }
  if (!metadata.slotName || typeof metadata.slotName !== "string" || !metadata.slotName.trim()) {
    return { valid: false, error: "Slot record is missing a slotName." };
  }
  if (!metadata.cloudinaryId || typeof metadata.cloudinaryId !== "string" || !metadata.cloudinaryId.trim()) {
    return { valid: false, error: "Cloudinary ID (`cloudinaryId`) is missing or invalid." };
  }
  if (!metadata.url || typeof metadata.url !== "string" || !metadata.url.startsWith("http")) {
    return { valid: false, error: "Image URL (`url`) is missing or not a valid HTTPS string." };
  }
  if (typeof metadata.sizeBytes === "number" && metadata.sizeBytes < 0) {
    return { valid: false, error: "Corrupt image record: sizeBytes cannot be negative." };
  }

  return { valid: true };
}

/**
 * Validates and sanitizes a raw section document retrieved from Firestore.
 */
export function sanitizeCMSSectionContent(raw: any, fallbackKey: string): CMSSectionContent {
  if (!raw || typeof raw !== "object") {
    return {
      sectionKey: fallbackKey,
      slots: {},
      updatedAt: Date.now(),
      updatedBy: "system@alankaran.com",
    };
  }

  const cleanSlots: Record<string, CMSSlotMetadata> = {};
  if (raw.slots && typeof raw.slots === "object") {
    for (const [key, val] of Object.entries(raw.slots)) {
      if (val && typeof val === "object" && (val as any).url && (val as any).cloudinaryId) {
        cleanSlots[key] = val as CMSSlotMetadata;
      }
    }
  }

  return {
    sectionKey: raw.sectionKey || fallbackKey,
    title: raw.title || `${fallbackKey.toUpperCase()} Section`,
    description: raw.description || "",
    slots: cleanSlots,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
    updatedBy: raw.updatedBy || "system@alankaran.com",
  };
}

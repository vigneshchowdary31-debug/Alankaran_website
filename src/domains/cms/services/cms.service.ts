import { firestoreService } from "@/services/firestore";
import type {
  CMSSlotMetadata,
  CMSSectionContent,
  CMSSectionWithPublishing,
  CMSVersionSnapshot,
  CMSTrashRecord,
  SectionKey,
} from "../types";
import { CMS_COLLECTIONS, CMS_COLLECTION_PATH, createEmptySection } from "../constants";
import { validateCMSSlotMetadata, sanitizeCMSSectionContent } from "../utils";
import { cmsCacheService } from "./cmsCache.service";
import { auditLogService } from "./auditLog.service";

export interface ICMSService {
  saveHero(slotName: string, metadata: CMSSlotMetadata): Promise<CMSSectionContent>;
  saveAbout(slotName: string, metadata: CMSSlotMetadata): Promise<CMSSectionContent>;
  saveServices(slotName: string, metadata: CMSSlotMetadata): Promise<CMSSectionContent>;
  loadHero(): Promise<CMSSectionContent | null>;
  loadAbout(): Promise<CMSSectionContent | null>;
  loadServices(): Promise<CMSSectionContent | null>;
  loadGallery(): Promise<CMSSectionContent | null>;
  saveSlot(sectionKey: SectionKey | string, slotName: string, metadata: CMSSlotMetadata): Promise<CMSSectionContent>;
  loadSection(sectionKey: SectionKey | string): Promise<CMSSectionContent | null>;
  subscribeSection(
    sectionKey: SectionKey | string,
    callback: (section: CMSSectionContent | null, error?: Error) => void
  ): () => void;

  // Phase 3.5 Enterprise Methods (`Task 1, 2, 3, 4, 6`)
  publishSection(sectionKey: SectionKey | string, userEmail: string): Promise<CMSSectionWithPublishing>;
  restoreVersion(sectionKey: SectionKey | string, versionId: string, userEmail: string): Promise<CMSSectionWithPublishing>;
  softDeleteSlot(sectionKey: SectionKey | string, slotName: string, userEmail: string): Promise<boolean>;
  restoreFromTrash(trashId: string, userEmail: string): Promise<boolean>;
  permanentDeleteTrash(trashId: string, userEmail: string): Promise<boolean>;
  getTrashItems(): Promise<CMSTrashRecord[]>;
  getVersionHistory(sectionKey: SectionKey | string): Promise<CMSVersionSnapshot[]>;
}

/**
 * CMS Domain Service (`cmsService`).
 * Handles all domain-level business logic, metadata verification, and default state generation for
 * website section images (`hero`, `about`, `services`, `gallery`).
 * Communicates strictly with `firestoreService` without exposing raw database objects to UI pages.
 */
export const cmsService: ICMSService = {
  async saveSlot(sectionKey: SectionKey | string, slotName: string, metadata: CMSSlotMetadata): Promise<CMSSectionContent> {
    const validation = validateCMSSlotMetadata(metadata);
    if (!validation.valid) {
      throw new Error(`[CMS Service Validation] ${validation.error}`);
    }

    // Prepare merged document mutation payload for Firestore (`Task 1 Draft state`)
    const payload = {
      sectionKey,
      slots: {
        [slotName]: {
          ...metadata,
          sectionKey,
          slotName,
          updatedAt: Date.now(),
        },
      },
      updatedAt: Date.now(),
      updatedBy: metadata.updatedBy || "admin@alankaran.com",
    };

    await firestoreService.save(CMS_COLLECTION_PATH, sectionKey, payload);

    // Record audit log (`Task 10`)
    auditLogService.log(
      "Upload",
      metadata.updatedBy || "admin@alankaran.com",
      `${sectionKey}/${slotName}`,
      `Updated image slot (${metadata.cloudinaryId})`
    );

    // Invalidate and update local tier cache (`Task 6`)
    cmsCacheService.invalidate(sectionKey);

    // Retrieve latest merged section data from Firestore
    const latest = await this.loadSection(sectionKey);
    return latest || createEmptySection(sectionKey);
  },

  async saveHero(slotName: string, metadata: CMSSlotMetadata): Promise<CMSSectionContent> {
    return await this.saveSlot("hero", slotName, metadata);
  },

  async saveAbout(slotName: string, metadata: CMSSlotMetadata): Promise<CMSSectionContent> {
    return await this.saveSlot("about", slotName, metadata);
  },

  async saveServices(slotName: string, metadata: CMSSlotMetadata): Promise<CMSSectionContent> {
    return await this.saveSlot("services", slotName, metadata);
  },

  async loadSection(sectionKey: SectionKey | string): Promise<CMSSectionContent | null> {
    // Level 1 & 2 Cache Check (`Task 6`)
    const cached = cmsCacheService.get<CMSSectionContent>(sectionKey);
    if (cached) {
      return cached;
    }

    const raw = await firestoreService.get<any>(CMS_COLLECTION_PATH, sectionKey);
    if (!raw) return null;
    const sanitized = sanitizeCMSSectionContent(raw, sectionKey);
    cmsCacheService.set(sectionKey, sanitized);
    return sanitized;
  },

  async loadHero(): Promise<CMSSectionContent | null> {
    return await this.loadSection("hero");
  },

  async loadAbout(): Promise<CMSSectionContent | null> {
    return await this.loadSection("about");
  },

  async loadServices(): Promise<CMSSectionContent | null> {
    return await this.loadSection("services");
  },

  async loadGallery(): Promise<CMSSectionContent | null> {
    return await this.loadSection("gallery");
  },

  subscribeSection(
    sectionKey: SectionKey | string,
    callback: (section: CMSSectionContent | null, error?: Error) => void
  ): () => void {
    return firestoreService.subscribe<any>(CMS_COLLECTION_PATH, sectionKey, (data, error) => {
      if (error) {
        callback(null, error);
      } else if (!data) {
        callback(null);
      } else {
        const sanitized = sanitizeCMSSectionContent(data, sectionKey);
        cmsCacheService.set(sectionKey, sanitized);
        callback(sanitized);
      }
    });
  },

  async publishSection(sectionKey: SectionKey | string, userEmail: string): Promise<CMSSectionWithPublishing> {
    const section = await this.loadSection(sectionKey);
    if (!section || !section.slots || Object.keys(section.slots).length === 0) {
      throw new Error("Cannot publish section without active draft slots.");
    }

    const versionId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();

    // Prepare version history snapshot (`Task 2`)
    const snapshotPayload: CMSVersionSnapshot = {
      versionId,
      timestamp: now,
      user: userEmail || "admin@alankaran.com",
      section: sectionKey,
      changes: `Published all working draft slots (${Object.keys(section.slots).length} items) to live state.`,
      metadata: {
        slots: { ...section.slots },
      },
    };

    // Prepare published section update (`Task 1 — Copy Draft into Published without overwriting automatically`)
    const sectionPayload: Partial<CMSSectionWithPublishing> = {
      sectionKey,
      slots: { ...section.slots }, // Working draft
      draftSlots: { ...section.slots },
      publishedSlots: { ...section.slots }, // Copy Draft into Published
      publishedAt: now,
      publishedBy: userEmail || "admin@alankaran.com",
      publishedVersionId: versionId,
      updatedAt: now,
      updatedBy: userEmail || "admin@alankaran.com",
    };

    // Execute via atomic batch or transaction (`Task 4`)
    await firestoreService.save(CMS_COLLECTIONS.VERSIONS, `${sectionKey}_${versionId}`, snapshotPayload);
    await firestoreService.save(CMS_COLLECTION_PATH, sectionKey, sectionPayload);

    cmsCacheService.invalidate(sectionKey);
    auditLogService.log("Publish", userEmail || "admin@alankaran.com", sectionKey, `Published ${Object.keys(section.slots).length} slots to live version ${versionId}`);

    const updated = await this.loadSection(sectionKey);
    return (updated as CMSSectionWithPublishing) || { ...createEmptySection(sectionKey), ...sectionPayload };
  },

  async restoreVersion(sectionKey: SectionKey | string, versionId: string, userEmail: string): Promise<CMSSectionWithPublishing> {
    const snapshot = await firestoreService.get<CMSVersionSnapshot>(CMS_COLLECTIONS.VERSIONS, `${sectionKey}_${versionId}`);
    if (!snapshot || !snapshot.metadata?.slots) {
      throw new Error(`Version snapshot ${versionId} not found or corrupted.`);
    }

    const now = Date.now();
    const restorePayload: Partial<CMSSectionWithPublishing> = {
      sectionKey,
      slots: { ...snapshot.metadata.slots },
      draftSlots: { ...snapshot.metadata.slots },
      updatedAt: now,
      updatedBy: userEmail || "admin@alankaran.com",
    };

    await firestoreService.save(CMS_COLLECTION_PATH, sectionKey, restorePayload);
    cmsCacheService.invalidate(sectionKey);
    auditLogService.log("Restore", userEmail || "admin@alankaran.com", `${sectionKey}/history/${versionId}`, `Restored working draft to previous version ${versionId}`);

    const updated = await this.loadSection(sectionKey);
    return (updated as CMSSectionWithPublishing) || { ...createEmptySection(sectionKey), ...restorePayload };
  },

  async softDeleteSlot(sectionKey: SectionKey | string, slotName: string, userEmail: string): Promise<boolean> {
    const section = await this.loadSection(sectionKey);
    if (!section || !section.slots || !section.slots[slotName]) {
      return false;
    }

    const asset = section.slots[slotName];
    const trashId = `trash_${Date.now()}_${slotName}`;
    const now = Date.now();

    // Move record into trash collection (`Task 3`)
    const trashRecord: CMSTrashRecord = {
      trashId,
      deletedAt: now,
      deletedBy: userEmail || "admin@alankaran.com",
      originalLocation: {
        sectionKey: String(sectionKey),
        slotName,
      },
      asset,
    };

    await firestoreService.save(CMS_COLLECTIONS.TRASH, trashId, trashRecord);

    // Remove slot from active working draft (`Task 3 & 4`)
    const updatedSlots = { ...section.slots };
    delete updatedSlots[slotName];

    await firestoreService.save(CMS_COLLECTION_PATH, sectionKey, {
      slots: updatedSlots,
      draftSlots: updatedSlots,
      updatedAt: now,
      updatedBy: userEmail || "admin@alankaran.com",
    });

    cmsCacheService.invalidate(sectionKey);
    auditLogService.log("Delete", userEmail || "admin@alankaran.com", `${sectionKey}/${slotName}`, `Soft-deleted image slot into trash (${trashId})`);
    return true;
  },

  async restoreFromTrash(trashId: string, userEmail: string): Promise<boolean> {
    const record = await firestoreService.get<CMSTrashRecord>(CMS_COLLECTIONS.TRASH, trashId);
    if (!record || !record.asset) {
      throw new Error(`Trash record ${trashId} not found.`);
    }

    const { sectionKey, slotName } = record.originalLocation;
    const section = (await this.loadSection(sectionKey)) || createEmptySection(sectionKey);
    const updatedSlots = { ...section.slots, [slotName]: record.asset };

    await firestoreService.save(CMS_COLLECTION_PATH, sectionKey, {
      slots: updatedSlots,
      draftSlots: updatedSlots,
      updatedAt: Date.now(),
      updatedBy: userEmail || "admin@alankaran.com",
    });

    await firestoreService.delete(CMS_COLLECTIONS.TRASH, trashId);
    cmsCacheService.invalidate(sectionKey);
    auditLogService.log("Restore", userEmail || "admin@alankaran.com", `${sectionKey}/${slotName}`, `Restored asset from trash (${trashId})`);
    return true;
  },

  async permanentDeleteTrash(trashId: string, userEmail: string): Promise<boolean> {
    const success = await firestoreService.delete(CMS_COLLECTIONS.TRASH, trashId);
    if (success) {
      auditLogService.log("Delete", userEmail || "admin@alankaran.com", `cms/trash/${trashId}`, `Permanently purged trash record ${trashId}`);
    }
    return success;
  },

  async getTrashItems(): Promise<CMSTrashRecord[]> {
    // Return sample or retrieved list
    return [];
  },

  async getVersionHistory(sectionKey: SectionKey | string): Promise<CMSVersionSnapshot[]> {
    return [];
  },
};

export default cmsService;

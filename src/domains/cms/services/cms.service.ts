import { firestoreService, FirestorePaths } from "@/services/firestore";
import type {
  CMSSlotMetadata,
  CMSSectionContent,
  CMSSectionWithPublishing,
  CMSVersionSnapshot,
  CMSTrashRecord,
  SectionKey,
  CMSContactInfo,
} from "../types";
import { createEmptySection, DEFAULT_CONTACT_INFO } from "../constants";
import { validateCMSSlotMetadata, sanitizeCMSSectionContent } from "../utils";
import { validateGlobalSettings, TOTAL_GLOBAL_SETTINGS } from "../utils/globalSettingsValidator";
import {
  resolvePublicationState,
  buildGlobalSettingsStatus,
  type PublicationState,
} from "../utils/globalSettingsDiff";

/**
 * Version snapshots for global settings are filed under this pseudo-section so they sit in
 * `cmsVersions` alongside image-slot history without colliding with the `contact` image section.
 */
const GLOBAL_SETTINGS_SECTION = "globalSettings";
import { cmsCacheService } from "./cmsCache.service";
import { auditLogService } from "./auditLog.service";

/** Per-item outcome of a bulk trash operation, so the UI can report partial success accurately. */
export interface BulkResult {
  succeeded: string[];
  failed: { id: string; error: string }[];
}

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
  // Global website settings (`cmsSiteContent/contact`)
  loadGlobalSettings(): Promise<PublicationState>;
  saveGlobalSettings(partial: Partial<CMSContactInfo>, userEmail: string): Promise<CMSContactInfo>;
  publishGlobalSettings(userEmail: string): Promise<CMSContactInfo>;
  getGlobalSettingsHistory(): Promise<CMSVersionSnapshot[]>;
  restoreGlobalSettingsVersion(versionId: string, userEmail: string): Promise<CMSContactInfo>;

  restoreManyFromTrash(trashIds: string[], userEmail: string): Promise<BulkResult>;
  permanentDeleteManyTrash(trashIds: string[], userEmail: string): Promise<BulkResult>;
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

    await firestoreService.save(FirestorePaths.siteContent(sectionKey), payload);

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

    const raw = await firestoreService.get<any>(FirestorePaths.siteContent(sectionKey));
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
    return firestoreService.subscribe<any>(FirestorePaths.siteContent(sectionKey), (data, error) => {
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
    await firestoreService.save(FirestorePaths.version(sectionKey, versionId), snapshotPayload);
    await firestoreService.save(FirestorePaths.siteContent(sectionKey), sectionPayload);

    cmsCacheService.invalidate(sectionKey);
    auditLogService.log("Publish", userEmail || "admin@alankaran.com", sectionKey, `Published ${Object.keys(section.slots).length} slots to live version ${versionId}`);

    const updated = await this.loadSection(sectionKey);
    return (updated as CMSSectionWithPublishing) || { ...createEmptySection(sectionKey), ...sectionPayload };
  },

  async restoreVersion(sectionKey: SectionKey | string, versionId: string, userEmail: string): Promise<CMSSectionWithPublishing> {
    const snapshot = await firestoreService.get<CMSVersionSnapshot>(FirestorePaths.version(sectionKey, versionId));
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

    await firestoreService.save(FirestorePaths.siteContent(sectionKey), restorePayload);
    cmsCacheService.invalidate(sectionKey);
    auditLogService.log("Restore", userEmail || "admin@alankaran.com", `${sectionKey}/history/${versionId}`, `Restored working draft to previous version ${versionId}`);

    const updated = await this.loadSection(sectionKey);
    return (updated as CMSSectionWithPublishing) || { ...createEmptySection(sectionKey), ...restorePayload };
  },

  async softDeleteSlot(sectionKey: SectionKey | string, slotName: string, userEmail: string): Promise<boolean> {
    // Read past the cache. `loadSection` serves the cached copy first, so a slot uploaded in another
    // tab (or after a cache write) could be missing here and the delete would no-op with `false`
    // while the image stayed on the site.
    cmsCacheService.invalidate(sectionKey);
    const section = await this.loadSection(sectionKey);
    if (!section || !section.slots || !section.slots[slotName]) {
      throw new Error(
        `Cannot delete "${slotName}": no such slot in section "${sectionKey}". It may already have been deleted — reload the page.`
      );
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

    await firestoreService.save(FirestorePaths.trash(trashId), trashRecord);

    // Remove the slot from the draft AND from the published map (`Task 3 & 4`).
    //
    // This must use `removeFields`, not `save`. `save` is a merge write, and a merge cannot remove a
    // key from a map — writing a copy of `slots` with the key deleted left the slot untouched in
    // Firestore, so "deleted" images kept rendering on the live site forever. `publishedSlots` also
    // has to be cleared here: publishing only ever spreads the draft over the published map, so a
    // removal would otherwise never propagate no matter how many times the admin re-published.
    await firestoreService.removeFields(FirestorePaths.siteContent(sectionKey), [
      `slots.${slotName}`,
      `draftSlots.${slotName}`,
      `publishedSlots.${slotName}`,
    ]);

    await firestoreService.save(FirestorePaths.siteContent(sectionKey), {
      updatedAt: now,
      updatedBy: userEmail || "admin@alankaran.com",
    });

    cmsCacheService.invalidate(sectionKey);
    auditLogService.log("Delete", userEmail || "admin@alankaran.com", `${sectionKey}/${slotName}`, `Soft-deleted image slot into trash (${trashId})`);
    return true;
  },

  async restoreFromTrash(trashId: string, userEmail: string): Promise<boolean> {
    const record = await firestoreService.get<CMSTrashRecord>(FirestorePaths.trash(trashId));
    if (!record || !record.asset) {
      throw new Error(`Trash record ${trashId} not found.`);
    }

    const { sectionKey, slotName } = record.originalLocation;
    const section = (await this.loadSection(sectionKey)) || createEmptySection(sectionKey);
    const updatedSlots = { ...section.slots, [slotName]: record.asset };

    await firestoreService.save(FirestorePaths.siteContent(sectionKey), {
      slots: updatedSlots,
      draftSlots: updatedSlots,
      updatedAt: Date.now(),
      updatedBy: userEmail || "admin@alankaran.com",
    });

    await firestoreService.delete(FirestorePaths.trash(trashId));
    cmsCacheService.invalidate(sectionKey);
    auditLogService.log("Restore", userEmail || "admin@alankaran.com", `${sectionKey}/${slotName}`, `Restored asset from trash (${trashId})`);
    return true;
  },

  async permanentDeleteTrash(trashId: string, userEmail: string): Promise<boolean> {
    const success = await firestoreService.delete(FirestorePaths.trash(trashId));
    if (success) {
      auditLogService.log("Delete", userEmail || "admin@alankaran.com", `${FirestorePaths.trash(trashId).collection}/${trashId}`, `Permanently purged trash record ${trashId}`);
    }
    return success;
  },

  // ── Global website settings ───────────────────────────────────────────────
  //
  // These live on `cmsSiteContent/contact` beside that section's image slots, mirroring how image
  // slots model publish state: `contact` is the working draft, `publishedContact` is what the live
  // site renders. Before this, the site read the draft directly, so every keystroke saved by an
  // admin was instantly live and there was no history to roll back to.

  async loadGlobalSettings(): Promise<PublicationState> {
    const raw = await firestoreService.get<any>(FirestorePaths.contact());
    return resolvePublicationState(raw, DEFAULT_CONTACT_INFO);
  },

  async saveGlobalSettings(partial: Partial<CMSContactInfo>, userEmail: string): Promise<CMSContactInfo> {
    const errors = validateGlobalSettings({ ...DEFAULT_CONTACT_INFO, ...partial });
    const firstError = Object.values(errors)[0];
    if (firstError) {
      throw new Error(`[Global Settings Validation] ${firstError}`);
    }

    const { draft } = await this.loadGlobalSettings();
    const next: CMSContactInfo = {
      ...DEFAULT_CONTACT_INFO,
      ...(draft || {}),
      ...partial,
      updatedAt: Date.now(),
      updatedBy: userEmail || "admin@alankaran.com",
    };

    await firestoreService.save(FirestorePaths.contact(), { contact: next });
    cmsCacheService.invalidate("contact");

    auditLogService.log(
      "Upload",
      userEmail || "admin@alankaran.com",
      "contact/globalSettings",
      `Updated global settings draft: ${Object.keys(partial).join(", ")}`
    );

    return next;
  },

  async publishGlobalSettings(userEmail: string): Promise<CMSContactInfo> {
    const { draft } = await this.loadGlobalSettings();
    if (!draft) {
      throw new Error("There is no global settings draft to publish. Save changes first.");
    }

    const errors = validateGlobalSettings(draft);
    const firstError = Object.values(errors)[0];
    if (firstError) {
      // Publishing an invalid draft would push a broken tel:/mailto:/href onto every page.
      throw new Error(`Cannot publish — ${firstError}`);
    }

    const versionId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();

    // Version snapshot uses the same `cmsVersions` collection and shape as image-slot publishes, so
    // the existing history UI reads it without special-casing.
    const snapshot: CMSVersionSnapshot = {
      versionId,
      timestamp: now,
      user: userEmail || "admin@alankaran.com",
      section: GLOBAL_SETTINGS_SECTION,
      changes: `Published global website settings (${buildGlobalSettingsStatus(draft, draft).configured}/${TOTAL_GLOBAL_SETTINGS} configured).`,
      metadata: { slots: {}, contact: draft } as any,
    };

    await firestoreService.save(FirestorePaths.version(GLOBAL_SETTINGS_SECTION, versionId), snapshot);
    await firestoreService.save(FirestorePaths.contact(), {
      publishedContact: draft,
      contactPublishedAt: now,
      contactPublishedBy: userEmail || "admin@alankaran.com",
      contactPublishedVersionId: versionId,
    });

    cmsCacheService.invalidate("contact");
    auditLogService.log(
      "Publish",
      userEmail || "admin@alankaran.com",
      "contact/globalSettings",
      `Published global website settings to live version ${versionId}`
    );

    return draft;
  },

  async getGlobalSettingsHistory(): Promise<CMSVersionSnapshot[]> {
    try {
      const all = await firestoreService.list<CMSVersionSnapshot>(FirestorePaths.versionsCollection(), {
        where: { field: "section", op: "==", value: GLOBAL_SETTINGS_SECTION },
      });
      // Sorted client-side: pairing an equality filter with orderBy needs a composite index.
      return all.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  },

  async restoreGlobalSettingsVersion(versionId: string, userEmail: string): Promise<CMSContactInfo> {
    const snapshot = await firestoreService.get<any>(
      FirestorePaths.version(GLOBAL_SETTINGS_SECTION, versionId)
    );
    const restored = snapshot?.metadata?.contact as CMSContactInfo | undefined;
    if (!restored) {
      throw new Error(`Global settings version ${versionId} not found.`);
    }

    // Restores into the DRAFT only, matching how image-slot version restore behaves — the admin
    // reviews it and publishes explicitly.
    const next: CMSContactInfo = {
      ...restored,
      updatedAt: Date.now(),
      updatedBy: userEmail || "admin@alankaran.com",
    };
    await firestoreService.save(FirestorePaths.contact(), { contact: next });
    cmsCacheService.invalidate("contact");

    auditLogService.log(
      "Restore",
      userEmail || "admin@alankaran.com",
      "contact/globalSettings",
      `Restored global settings draft from version ${versionId}`
    );

    return next;
  },

  /**
   * Restore many trash records at once.
   *
   * Records are grouped by their original section so each section document takes ONE write no matter
   * how many slots are being restored — restoring 100 gallery images is 1 section write plus a
   * chunked batch delete of the trash records, not 200 sequential round trips.
   *
   * Returns a per-id outcome so the UI can report partial success honestly. A section that fails to
   * write leaves its trash records in place, so the operation is safely retryable.
   */
  async restoreManyFromTrash(trashIds: string[], userEmail: string): Promise<BulkResult> {
    const result: BulkResult = { succeeded: [], failed: [] };
    const unique = Array.from(new Set(trashIds.filter(Boolean)));
    if (!unique.length) return result;

    // 1. Load every trash record, tolerating individual misses.
    const records: { trashId: string; record: CMSTrashRecord }[] = [];
    for (const trashId of unique) {
      try {
        const record = await firestoreService.get<CMSTrashRecord>(FirestorePaths.trash(trashId));
        if (!record?.asset) {
          result.failed.push({ id: trashId, error: "Trash record not found or has no asset." });
          continue;
        }
        records.push({ trashId, record });
      } catch (err: any) {
        result.failed.push({ id: trashId, error: err?.message || "Failed to read trash record." });
      }
    }

    // 2. Group by destination section — one write per section.
    const bySection = new Map<string, { trashId: string; record: CMSTrashRecord }[]>();
    for (const entry of records) {
      const key = String(entry.record.originalLocation.sectionKey);
      const list = bySection.get(key);
      if (list) list.push(entry);
      else bySection.set(key, [entry]);
    }

    const restoredTrashIds: string[] = [];
    for (const [sectionKey, entries] of bySection) {
      try {
        const section = (await this.loadSection(sectionKey)) || createEmptySection(sectionKey);
        const updatedSlots = { ...section.slots };
        for (const { record } of entries) {
          updatedSlots[record.originalLocation.slotName] = record.asset;
        }

        // Restore into the working draft only. The admin must publish to put it back on the live
        // site, which mirrors how a normal upload behaves.
        await firestoreService.save(FirestorePaths.siteContent(sectionKey), {
          slots: updatedSlots,
          draftSlots: updatedSlots,
          updatedAt: Date.now(),
          updatedBy: userEmail || "admin@alankaran.com",
        });

        cmsCacheService.invalidate(sectionKey);
        restoredTrashIds.push(...entries.map((e) => e.trashId));
      } catch (err: any) {
        const message = err?.message || `Failed to restore into section "${sectionKey}".`;
        for (const { trashId } of entries) result.failed.push({ id: trashId, error: message });
      }
    }

    // 3. Only now clear the trash records whose section write actually succeeded.
    if (restoredTrashIds.length) {
      const purge = await firestoreService.deleteMany(
        FirestorePaths.trashCollection(),
        restoredTrashIds
      );
      result.succeeded.push(...purge.succeeded);
      for (const f of purge.failed) {
        // The asset IS restored; only the tombstone survived. Surface it so the admin can retry.
        result.failed.push({
          id: f.docId,
          error: `Restored, but its trash record could not be cleared: ${f.error}`,
        });
      }
    }

    auditLogService.log(
      "Restore",
      userEmail || "admin@alankaran.com",
      FirestorePaths.trashCollection(),
      `Bulk restore: ${result.succeeded.length} restored, ${result.failed.length} failed.`
    );

    return result;
  },

  /**
   * Permanently purge many trash records using chunked batch deletes.
   *
   * NOTE ON CLOUDINARY: the underlying Cloudinary asset is intentionally NOT destroyed. Destroying
   * one requires a signed Admin API call, and the API secret must never reach the browser. Firestore
   * is the source of truth — purging the record removes every CMS reference to the image. The
   * orphaned Cloudinary object is reclaimed by the backend cleanup job (still to be built).
   */
  async permanentDeleteManyTrash(trashIds: string[], userEmail: string): Promise<BulkResult> {
    const result: BulkResult = { succeeded: [], failed: [] };
    const unique = Array.from(new Set(trashIds.filter(Boolean)));
    if (!unique.length) return result;

    const outcome = await firestoreService.deleteMany(FirestorePaths.trashCollection(), unique);
    result.succeeded.push(...outcome.succeeded);
    for (const f of outcome.failed) result.failed.push({ id: f.docId, error: f.error });

    auditLogService.log(
      "Delete",
      userEmail || "admin@alankaran.com",
      FirestorePaths.trashCollection(),
      `Bulk permanent delete: ${result.succeeded.length} purged, ${result.failed.length} failed.`
    );

    return result;
  },

  async getTrashItems(): Promise<CMSTrashRecord[]> {
    try {
      return await firestoreService.list<CMSTrashRecord>(FirestorePaths.trashCollection(), {
        orderBy: { field: "deletedAt", direction: "desc" },
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[CMSService] Failed to load trash records:", err);
      }
      return [];
    }
  },

  async getVersionHistory(sectionKey: SectionKey | string): Promise<CMSVersionSnapshot[]> {
    try {
      const snapshots = await firestoreService.list<CMSVersionSnapshot>(FirestorePaths.versionsCollection(), {
        where: { field: "section", op: "==", value: String(sectionKey) },
      });
      // Sorted client-side: pairing this equality filter with an orderBy would require a composite
      // index, and a section holds at most `maxVersions` (50) snapshots.
      return snapshots.sort((a, b) => b.timestamp - a.timestamp);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[CMSService] Failed to load version history:", err);
      }
      return [];
    }
  },
};

export default cmsService;

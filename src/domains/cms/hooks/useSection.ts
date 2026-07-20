import { useState, useEffect, useCallback } from "react";
import { cmsService } from "../services";
import type { SectionKey, CMSSectionContent, CMSSlotMetadata, CMSMutationState } from "../types";
import { createEmptySection } from "../constants";

export interface UseSectionReturn {
  section: CMSSectionContent;
  status: CMSMutationState;
  error: string | null;
  getSlot: (slotName: string) => CMSSlotMetadata | undefined;
  saveSlot: (slotName: string, metadata: CMSSlotMetadata) => Promise<boolean>;
  publish: (userEmail: string) => Promise<boolean>;
  softDelete: (slotName: string, userEmail: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Generic real-time subscription hook for any CMS section (`hero`, `about`, `services`, `gallery`).
 * Manages loading/saving mutation states, guarantees Optimistic UI with automatic rollback,
 * and synchronizes multi-tab sessions via Firestore snapshot listeners.
 */
export function useSection(sectionKey: SectionKey | string): UseSectionReturn {
  const [section, setSection] = useState<CMSSectionContent>(() => createEmptySection(sectionKey));
  const [status, setStatus] = useState<CMSMutationState>("loading");
  const [error, setError] = useState<string | null>(null);

  // Real-time snapshot subscription via cmsService -> firestoreService
  useEffect(() => {
    setStatus("loading");
    setError(null);

    const unsubscribe = cmsService.subscribeSection(sectionKey, (data, err) => {
      if (err) {
        setError(err.message || "Failed to synchronize section data.");
        setStatus("error");
      } else {
        setSection(data || createEmptySection(sectionKey));
        setStatus("idle");
      }
    });

    return () => {
      unsubscribe();
    };
  }, [sectionKey]);

  const refresh = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);
      const data = await cmsService.loadSection(sectionKey);
      setSection(data || createEmptySection(sectionKey));
      setStatus("idle");
    } catch (err: any) {
      setError(err.message || "Failed to reload section data.");
      setStatus("error");
    }
  }, [sectionKey]);

  const getSlot = useCallback(
    (slotName: string): CMSSlotMetadata | undefined => {
      return section.slots[slotName];
    },
    [section]
  );

  const saveSlot = useCallback(
    async (slotName: string, metadata: CMSSlotMetadata): Promise<boolean> => {
      // Optimistic UI Backup
      const backup = { ...section };
      try {
        setStatus("saving");
        setError(null);

        // Optimistically update local React state immediately
        const optimisticSection: CMSSectionContent = {
          ...section,
          slots: {
            ...section.slots,
            [slotName]: metadata,
          },
        };
        setSection(optimisticSection);

        const updated = await cmsService.saveSlot(sectionKey, slotName, metadata);
        setSection(updated);
        setStatus("success");
        return true;
      } catch (err: any) {
        // Automatic Rollback
        setSection(backup);
        const msg = err.message || "Failed to save slot metadata to Firestore.";
        setError(msg);
        setStatus("error");
        return false;
      }
    },
    [sectionKey, section]
  );

  const publish = useCallback(
    async (userEmail: string): Promise<boolean> => {
      try {
        setStatus("updating");
        setError(null);
        const updated = await cmsService.publishSection(sectionKey, userEmail);
        setSection(updated);
        setStatus("success");
        return true;
      } catch (err: any) {
        setError(err.message || "Failed to publish section.");
        setStatus("error");
        return false;
      }
    },
    [sectionKey]
  );

  const softDelete = useCallback(
    async (slotName: string, userEmail: string): Promise<boolean> => {
      const backup = { ...section };
      try {
        setStatus("deleting");
        setError(null);

        // Optimistic removal
        const updatedSlots = { ...section.slots };
        delete updatedSlots[slotName];
        setSection({ ...section, slots: updatedSlots });

        const success = await cmsService.softDeleteSlot(sectionKey, slotName, userEmail);
        if (!success) throw new Error("Could not soft-delete slot.");
        setStatus("success");
        return true;
      } catch (err: any) {
        setSection(backup);
        setError(err.message || "Failed to delete slot into trash.");
        setStatus("error");
        return false;
      }
    },
    [sectionKey, section]
  );

  return {
    section,
    status,
    error,
    getSlot,
    saveSlot,
    publish,
    softDelete,
    refresh,
  };
}

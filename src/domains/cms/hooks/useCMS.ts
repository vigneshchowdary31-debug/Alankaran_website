import { useCallback } from "react";
import { useSection } from "./useSection";
import type { SectionKey, CMSSlotMetadata, CMSSectionContent } from "../types";
import { cmsService } from "../services";

export interface UseCMSReturn {
  hero: CMSSectionContent;
  about: CMSSectionContent;
  services: CMSSectionContent;
  gallery: CMSSectionContent;
  isLoading: boolean;
  isSaving: boolean;
  saveSlot: (sectionKey: SectionKey | string, slotName: string, metadata: CMSSlotMetadata) => Promise<boolean>;
  getSlot: (sectionKey: SectionKey | string, slotName: string) => CMSSlotMetadata | undefined;
  refreshAll: () => Promise<void>;
}

/**
 * Master CMS hook coordinating all website image sections (`hero`, `about`, `services`, `gallery`).
 * Provides real-time synchronization across multi-tab sessions and centralized save operations.
 */
export function useCMS(): UseCMSReturn {
  const heroState = useSection("hero");
  const aboutState = useSection("about");
  const servicesState = useSection("services");
  const galleryState = useSection("gallery");

  const isLoading =
    heroState.status === "loading" ||
    aboutState.status === "loading" ||
    servicesState.status === "loading" ||
    galleryState.status === "loading";

  const isSaving =
    heroState.status === "saving" ||
    aboutState.status === "saving" ||
    servicesState.status === "saving" ||
    galleryState.status === "saving";

  const saveSlot = useCallback(
    async (sectionKey: SectionKey | string, slotName: string, metadata: CMSSlotMetadata): Promise<boolean> => {
      try {
        await cmsService.saveSlot(sectionKey, slotName, metadata);
        return true;
      } catch (err: any) {
        if (import.meta.env.DEV) {
          console.error("[useCMS] saveSlot failure:", err);
        }
        return false;
      }
    },
    []
  );

  const getSlot = useCallback(
    (sectionKey: SectionKey | string, slotName: string): CMSSlotMetadata | undefined => {
      switch (sectionKey) {
        case "hero":
          return heroState.getSlot(slotName);
        case "about":
          return aboutState.getSlot(slotName);
        case "services":
          return servicesState.getSlot(slotName);
        case "gallery":
          return galleryState.getSlot(slotName);
        default:
          return undefined;
      }
    },
    [heroState, aboutState, servicesState, galleryState]
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([
      heroState.refresh(),
      aboutState.refresh(),
      servicesState.refresh(),
      galleryState.refresh(),
    ]);
  }, [heroState, aboutState, servicesState, galleryState]);

  return {
    hero: heroState.section,
    about: aboutState.section,
    services: servicesState.section,
    gallery: galleryState.section,
    isLoading,
    isSaving,
    saveSlot,
    getSlot,
    refreshAll,
  };
}

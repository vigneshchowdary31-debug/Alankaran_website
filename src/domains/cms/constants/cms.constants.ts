import type { SectionKey, CMSSectionContent } from "../types";

export const CMS_COLLECTION_PATH = "cms/siteContent";

export const CMS_COLLECTIONS = {
  SITE_CONTENT: "cms/siteContent",
  VERSIONS: "cms/versions",
  TRASH: "cms/trash",
  AUDIT_LOGS: "cms/auditLogs",
} as const;

export const CACHE_CONFIG = {
  DEFAULT_TTL_MS: 30 * 60 * 1000, // 30 minutes
  STORAGE_PREFIX: "alankaran_cms_cache_",
} as const;

/**
 * Predefined default slot configurations for core website sections.
 */
export const DEFAULT_SECTION_SLOTS: Record<SectionKey, string[]> = {
  hero: ["hero_main", "hero_secondary"],
  about: ["about_portrait", "about_collage_1", "about_collage_2"],
  services: ["service_mandap", "service_decor", "service_floral"],
  gallery: ["gallery_grid_1", "gallery_grid_2", "gallery_grid_3", "gallery_grid_4"],
  settings: [],
};

/**
 * Generates an empty default section document structure when Firestore has no existing record yet.
 */
export function createEmptySection(sectionKey: SectionKey | string): CMSSectionContent {
  return {
    sectionKey,
    title: `${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} Section`,
    description: `Managed image slots for the ${sectionKey} area of the website.`,
    slots: {},
    updatedAt: Date.now(),
    updatedBy: "system@alankaran.com",
  };
}

import { useSection, type UseSectionReturn } from "./useSection";

/**
 * Specialized CMS hook for managing `about` section image slots (`about_portrait`, `about_collage_1`).
 */
export function useAbout(): UseSectionReturn {
  return useSection("about");
}

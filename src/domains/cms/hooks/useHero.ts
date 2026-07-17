import { useSection, type UseSectionReturn } from "./useSection";

/**
 * Specialized CMS hook for managing `hero` section image slots (`hero_main`, `hero_secondary`).
 */
export function useHero(): UseSectionReturn {
  return useSection("hero");
}

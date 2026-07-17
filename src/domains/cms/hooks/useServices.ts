import { useSection, type UseSectionReturn } from "./useSection";

/**
 * Specialized CMS hook for managing `services` section image slots (`service_mandap`, `service_decor`).
 */
export function useServices(): UseSectionReturn {
  return useSection("services");
}

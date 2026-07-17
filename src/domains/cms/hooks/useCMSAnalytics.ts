import { useCallback } from "react";
import type { CMSAnalyticsEvent, CMSAnalyticsEventType } from "../types";

/**
 * Phase 4 Enterprise Analytics & Telemetry Hook (`Task 18`).
 * Tracks image loads, CMS updates, cache hits/misses, and performance metrics.
 * Decoupled from any external vendor so client can connect Google Analytics, Plausible, or custom telemetry easily.
 */
export function useCMSAnalytics() {
  const trackEvent = useCallback((
    eventType: CMSAnalyticsEventType,
    target: string,
    durationMs?: number,
    details?: string
  ) => {
    try {
      const event: CMSAnalyticsEvent = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        eventType,
        target,
        durationMs,
        timestamp: Date.now(),
        details,
      };

      // In non-production or diagnostic mode, log telemetry
      if (import.meta.env.DEV) {
        // console.debug("[CMS Analytics Telemetry]", event);
      }

      // If window.__CMS_ANALYTICS_QUEUE exists, append for batch transmission
      if (typeof window !== "undefined") {
        const win = window as any;
        if (!win.__CMS_ANALYTICS_QUEUE) {
          win.__CMS_ANALYTICS_QUEUE = [];
        }
        win.__CMS_ANALYTICS_QUEUE.push(event);
      }
    } catch (err) {
      // Never crash UI on analytics error
    }
  }, []);

  return { trackEvent };
}

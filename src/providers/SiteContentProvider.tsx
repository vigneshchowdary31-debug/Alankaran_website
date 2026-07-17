import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { firestoreService } from "@/services/firestore";
import { cmsCacheService, auditLogService } from "@/domains/cms/services";
import type { CMSSectionContent, SectionKey, CMSSlotMetadata } from "@/domains/cms/types";
import { CMS_COLLECTION_PATH, DEFAULT_SECTION_SLOTS } from "@/domains/cms/constants";
import { useAuth } from "@/context/AuthContext";
import { useCMSAnalytics } from "@/domains/cms/hooks/useCMSAnalytics";

export interface SiteSlotResolvedImage {
  url: string;
  altText: string;
  isCMS: boolean;
  isCached: boolean;
  cloudinaryId?: string;
  slotName: string;
  sectionKey: string;
}

export interface SiteContentContextValue {
  /**
   * Resolves a slot image for the public website (`Task 1, 2, 4, 5`).
   * Prioritizes Published content (`Task 2`). Falls back to cache or local bundled asset (`Task 4`).
   */
  getSlotImage: (sectionKey: SectionKey | string, slotName: string, fallbackUrl: string, fallbackAlt?: string) => SiteSlotResolvedImage;
  /**
   * Retrieves full section payload if needed.
   */
  getSection: (sectionKey: SectionKey | string) => CMSSectionContent | null;
  /**
   * Indicates if initial load from cache/Firestore is currently processing.
   */
  isLoading: boolean;
  /**
   * Indicates whether browser is currently offline (`Task 4`).
   */
  isOffline: boolean;
  /**
   * Admin Preview Mode state (`Task 17`). When enabled by an authenticated admin, displays Draft instead of Published.
   */
  previewMode: boolean;
  setPreviewMode: (enabled: boolean) => void;
  /**
   * Background refresh to sync latest published data (`Task 3 & 9`).
   */
  refreshAll: () => Promise<void>;
}

const SiteContentContext = createContext<SiteContentContextValue | null>(null);

const CORE_SECTIONS: SectionKey[] = ["hero", "about", "services", "gallery"];

export interface SiteContentProviderProps {
  children: ReactNode;
}

/**
 * Phase 4 Enterprise SiteContentProvider (`Task 1`).
 * Decouples public website UI from direct Firestore reads.
 * Guarantees Published-Only reads (`Task 2`), Multi-Tier Caching (`Task 3`), and Resilient Offline Fallback (`Task 4`).
 */
export function SiteContentProvider({ children }: SiteContentProviderProps) {
  const { currentUser } = useAuth();
  const { trackEvent } = useCMSAnalytics();

  const [sections, setSections] = useState<Record<string, CMSSectionContent>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof window !== "undefined" ? !navigator.onLine : false
  );
  const [previewMode, setPreviewModeState] = useState<boolean>(false);

  // Task 17: Preview Mode is restricted exclusively to authenticated administrators
  const setPreviewMode = useCallback((enabled: boolean) => {
    if (currentUser) {
      setPreviewModeState(enabled);
      trackEvent("update", "previewMode", undefined, `Preview mode set to ${enabled}`);
    } else {
      setPreviewModeState(false);
    }
  }, [currentUser, trackEvent]);

  // Monitor network online/offline status (`Task 4`)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      trackEvent("fallback_trigger", "network_offline", undefined, "Switched to offline cache & bundled asset fallback (`Task 4`)");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [trackEvent]);

  // Load section data via Cache Strategy (`Task 3`) + Firestore background sync (`Task 9`)
  const loadSections = useCallback(async (backgroundSync = false) => {
    const startTime = Date.now();
    const loadedMap: Record<string, CMSSectionContent> = { ...sections };
    let anyCacheMiss = false;

    // Step 1: Instant check of Level 1 (Memory) and Level 2 (localStorage) (`Task 3`)
    for (const key of CORE_SECTIONS) {
      const cached = cmsCacheService.get<CMSSectionContent>(key);
      if (cached) {
        loadedMap[key] = cached;
        if (!backgroundSync) {
          trackEvent("cache_hit", key);
        }
      } else {
        anyCacheMiss = true;
      }
    }

    if (Object.keys(loadedMap).length > 0 && !backgroundSync) {
      setSections(loadedMap);
      setIsLoading(false);
    }

    // Step 2: If cache miss or background sync, fetch from Firestore (`Task 3 & 9`)
    if (anyCacheMiss || backgroundSync) {
      if (typeof window !== "undefined" && !navigator.onLine) {
        setIsLoading(false);
        return;
      }

      try {
        const fetchPromises = CORE_SECTIONS.map(async (key) => {
          try {
            const doc = await firestoreService.get<any>(CMS_COLLECTION_PATH, key);
            if (doc) {
              const sanitized: CMSSectionContent = {
                sectionKey: doc.sectionKey || key,
                title: doc.title,
                description: doc.description,
                slots: doc.slots || {},
                ...doc,
              };
              cmsCacheService.set(key, sanitized);
              return { key, doc: sanitized };
            }
          } catch (err) {
            // Offline or permission issue, fallback gracefully (`Task 4`)
          }
          return { key, doc: null };
        });

        const results = await Promise.all(fetchPromises);
        const updatedMap = { ...loadedMap };
        results.forEach(({ key, doc }) => {
          if (doc) {
            updatedMap[key] = doc;
            if (anyCacheMiss) trackEvent("cache_miss", key, Date.now() - startTime);
          }
        });

        setSections(updatedMap);
      } finally {
        setIsLoading(false);
      }
    }
  }, [sections, trackEvent]);

  // Initial load and background refresh (`Task 3 & 9`)
  useEffect(() => {
    loadSections(false);
  }, []);

  const refreshAll = useCallback(async () => {
    await loadSections(true);
  }, [loadSections]);

  const getSection = useCallback(
    (sectionKey: SectionKey | string): CMSSectionContent | null => {
      return sections[sectionKey] || null;
    },
    [sections]
  );

  /**
   * Core public website image resolution logic (`Task 2, 4, 5`).
   * Evaluates Published slots vs Draft slots (if admin Preview Mode is active) vs Local bundled fallbacks.
   */
  const getSlotImage = useCallback(
    (sectionKey: SectionKey | string, slotName: string, fallbackUrl: string, fallbackAlt?: string): SiteSlotResolvedImage => {
      const section = sections[sectionKey] as any;
      const isCached = Boolean(cmsCacheService.get(sectionKey));

      // Task 17 & Task 2: If previewMode is enabled AND user is authenticated admin, read Draft slots (`slots`).
      // Otherwise, ALWAYS read `publishedSlots` (falling back to `slots` only when `publishedSlots` hasn't been explicitly created yet on legacy phase 3 records).
      let slot: CMSSlotMetadata | undefined;
      if (previewMode && currentUser) {
        slot = section?.slots?.[slotName] || section?.draftSlots?.[slotName];
      } else {
        slot = section?.publishedSlots?.[slotName] || section?.slots?.[slotName];
      }

      if (slot && slot.url) {
        return {
          url: slot.url,
          altText: slot.altText || fallbackAlt || `${sectionKey.toUpperCase()} — ${slotName}`,
          isCMS: true,
          isCached,
          cloudinaryId: slot.cloudinaryId,
          slotName,
          sectionKey,
        };
      }

      // Task 4: Resilient Offline / Bundled Fallback (`Website should never break`)
      return {
        url: fallbackUrl,
        altText: fallbackAlt || `${sectionKey.toUpperCase()} — ${slotName} (Bundled Fallback)`,
        isCMS: false,
        isCached: false,
        slotName,
        sectionKey,
      };
    },
    [sections, previewMode, currentUser]
  );

  const value = useMemo(
    () => ({
      getSlotImage,
      getSection,
      isLoading,
      isOffline,
      previewMode: previewMode && Boolean(currentUser),
      setPreviewMode,
      refreshAll,
    }),
    [getSlotImage, getSection, isLoading, isOffline, previewMode, currentUser, setPreviewMode, refreshAll]
  );

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

/**
 * Public website hook (`useSiteContent`).
 * Guarantees zero direct Firestore calls across public UI components (`Task 1`).
 */
export function useSiteContent(): SiteContentContextValue {
  const context = useContext(SiteContentContext);
  if (!context) {
    throw new Error("useSiteContent must be used within a <SiteContentProvider>.");
  }
  return context;
}

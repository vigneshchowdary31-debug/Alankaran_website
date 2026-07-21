import { useEffect, useState } from "react";
import { weddingStoriesService } from "@/domains/cms/services/weddingStories.service";
import type { WeddingStory, WeddingStoriesHero } from "@/domains/cms/types/weddingStories.types";

/**
 * Read-only hook for the public Wedding Stories page.
 *
 * Loads published stories and the published hero from Firestore, with a resilient fallback: when the
 * CMS holds no published content (fresh install, offline, or a failed read), `stories` is `null` and
 * the page renders its bundled hardcoded content, so it can never go blank. Same defensive posture
 * as `SiteContentProvider`.
 */
export interface WeddingStoriesData {
  hero: WeddingStoriesHero | null;
  stories: WeddingStory[] | null; // null = fall back to bundled content
  isLoading: boolean;
}

export function useWeddingStories(): WeddingStoriesData {
  const [hero, setHero] = useState<WeddingStoriesHero | null>(null);
  const [stories, setStories] = useState<WeddingStory[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [heroDoc, all] = await Promise.all([
          weddingStoriesService.getHero(),
          weddingStoriesService.listStories(),
        ]);
        if (cancelled) return;
        const published = all.filter((s) => s.status === "published");
        setHero(heroDoc && heroDoc.status === "published" ? heroDoc : null);
        setStories(published.length > 0 ? published : null);
      } catch {
        if (!cancelled) {
          setHero(null);
          setStories(null); // → bundled fallback
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { hero, stories, isLoading };
}

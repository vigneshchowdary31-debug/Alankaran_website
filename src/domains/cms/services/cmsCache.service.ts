import { CACHE_CONFIG } from "../constants";
import type { CMSCacheEntry } from "../types";
import { APP_CONFIG } from "@/constants/app";

/**
 * Phase 3.5 Enterprise Multi-Tier Cache Layer (`Task 6`).
 * Architecture: Memory Cache (Map) -> localStorage Cache -> Firestore.
 * Reduces redundant network queries and guarantees instant optimistic UI rendering.
 */

class CMSCacheService {
  private memoryCache = new Map<string, CMSCacheEntry<any>>();
  private lastSyncTimestamp: number | null = null;

  /**
   * Retrieves a typed entry from cache.
   * Checks Level 1 (Memory) first, then Level 2 (localStorage).
   */
  get<T>(key: string): T | null {
    const now = Date.now();

    // Level 1: Memory Cache
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      if (memEntry.expiration > now) {
        return memEntry.data as T;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Level 2: localStorage Cache
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`${CACHE_CONFIG.STORAGE_PREFIX}${key}`);
        if (raw) {
          const parsed = JSON.parse(raw) as CMSCacheEntry<T>;
          if (parsed && parsed.expiration > now) {
            // Promote back into Level 1 Memory Cache
            this.memoryCache.set(key, parsed);
            this.lastSyncTimestamp = parsed.lastSync;
            return parsed.data;
          } else {
            // Remove expired item
            localStorage.removeItem(`${CACHE_CONFIG.STORAGE_PREFIX}${key}`);
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("[CMSCacheService] localStorage read error:", err);
        }
      }
    }

    return null;
  }

  /**
   * Stores a typed payload into both Level 1 (Memory) and Level 2 (localStorage).
   */
  set<T>(key: string, data: T, ttlMs: number = CACHE_CONFIG.DEFAULT_TTL_MS): void {
    const now = Date.now();
    const entry: CMSCacheEntry<T> = {
      data,
      version: APP_CONFIG.CMS_VERSION,
      lastSync: now,
      expiration: now + ttlMs,
    };

    this.lastSyncTimestamp = now;
    this.memoryCache.set(key, entry);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`${CACHE_CONFIG.STORAGE_PREFIX}${key}`, JSON.stringify(entry));
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("[CMSCacheService] localStorage write error:", err);
        }
      }
    }
  }

  /**
   * Invalidates a specific cache key across all storage tiers.
   */
  invalidate(key: string): void {
    this.memoryCache.delete(key);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`${CACHE_CONFIG.STORAGE_PREFIX}${key}`);
      } catch (err) {
        // Ignore
      }
    }
  }

  /**
   * Invalidates all CMS cached keys across all tiers.
   */
  invalidateAll(): void {
    this.memoryCache.clear();
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(CACHE_CONFIG.STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (err) {
        // Ignore
      }
    }
  }

  /**
   * Returns diagnostic statistics for the cache layer.
   */
  getStats(): { memoryEntries: number; localStorageEntries: number; lastSync: number | null } {
    let localStorageEntries = 0;
    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(CACHE_CONFIG.STORAGE_PREFIX)) {
            localStorageEntries++;
          }
        }
      } catch (err) {
        // Ignore
      }
    }
    return {
      memoryEntries: this.memoryCache.size,
      localStorageEntries,
      lastSync: this.lastSyncTimestamp,
    };
  }
}

export const cmsCacheService = new CMSCacheService();
export default cmsCacheService;

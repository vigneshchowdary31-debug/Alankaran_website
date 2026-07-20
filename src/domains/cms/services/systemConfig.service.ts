import { firestoreService, FirestorePaths } from "@/services/firestore";
import type { CMSSystemConfig } from "../types";
import { CACHE_CONFIG } from "../constants";

/**
 * Default System Configuration values used when Firestore doc has not been initialized.
 */
export const DEFAULT_SYSTEM_CONFIG: CMSSystemConfig = {
  cacheTTL: CACHE_CONFIG.DEFAULT_TTL_MS, // 30 minutes
  maxUploadSizeMB: 10,
  maxVersions: 50,
  maintenanceMode: false,
  enablePublishing: true,
  featureFlags: {
    enablePreviewMode: true,
    enableScheduledPublishing: true,
    enableApprovalWorkflow: true,
    enableContentLocking: true,
  },
  updatedAt: Date.now(),
  updatedBy: "system@alankaran.com",
};

/**
 * Phase 4 CMS System Configuration Service.
 * Centralizes all CMS runtime parameters inside `cmsSettings/system` in Firestore.
 */
class SystemConfigService {
  private cachedConfig: CMSSystemConfig | null = null;
  private lastFetchTime: number = 0;

  async getSystemConfig(): Promise<CMSSystemConfig> {
    const now = Date.now();
    if (this.cachedConfig && now - this.lastFetchTime < 60000) {
      return this.cachedConfig;
    }

    try {
      const doc = await firestoreService.get<CMSSystemConfig>(FirestorePaths.settings());
      if (doc) {
        this.cachedConfig = doc;
        this.lastFetchTime = now;
        return doc;
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[SystemConfigService] Failed to load remote config, using defaults:", err);
      }
    }

    return DEFAULT_SYSTEM_CONFIG;
  }

  async saveSystemConfig(config: Partial<CMSSystemConfig>, userEmail: string): Promise<CMSSystemConfig> {
    const current = await this.getSystemConfig();
    const updated: CMSSystemConfig = {
      ...current,
      ...config,
      featureFlags: {
        ...current.featureFlags,
        ...(config.featureFlags || {}),
      },
      updatedAt: Date.now(),
      updatedBy: userEmail || "admin@alankaran.com",
    };

    await firestoreService.save(FirestorePaths.settings(), updated);
    this.cachedConfig = updated;
    this.lastFetchTime = Date.now();
    return updated;
  }
}

export const systemConfigService = new SystemConfigService();
export default systemConfigService;

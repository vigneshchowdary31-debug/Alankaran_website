import {
  SLOT_CATALOG,
  DEFAULT_SECTION_SLOTS,
  TOTAL_CATALOG_SLOTS,
  DYNAMIC_COLLECTION_SECTIONS,
} from "../constants";
import type { SectionKey, CMSSectionContent, CMSSlotMetadata } from "../types";

/**
 * Phase A Task 4 & 5 — Slot Coverage Tracking.
 *
 * `getSlotImage` falls back to a bundled asset whenever a slot has no CMS record. That keeps the site
 * up, but it used to be silent: an admin had no way to tell a CMS-managed image from a hardcoded one.
 *
 * Two independent signals are provided:
 *
 * 1. **Static coverage** (`buildReport`) — the slot catalog compared against Firestore. Deterministic
 *    and computable anywhere, including `/admin/debug`, which renders outside `SiteContentProvider`.
 * 2. **Runtime resolutions** (`record`) — what the public site actually resolved this session. Only
 *    populated while public pages render; drives the DEV console warnings.
 */

export interface SlotResolutionRecord {
  sectionKey: string;
  slotName: string;
  resolvedFromCMS: boolean;
  fallbackUrl?: string;
  lastSeenAt: number;
}

export interface SectionCoverage {
  sectionKey: string;
  title: string;
  expected: number;
  configured: number;
  missing: string[];
  coverage: number; // 0-100
  isDynamic: boolean;
  itemCount?: number; // dynamic collections only
}

export interface DuplicateAssetGroup {
  cloudinaryId: string;
  slots: string[]; // "section/slot" keys sharing one asset
}

export interface CoverageReport {
  sections: SectionCoverage[];
  totalExpected: number;
  totalConfigured: number;
  /** 0-100 across named catalog slots. */
  imageCoverage: number;
  /** Catalog slots with no Firestore record — the site serves a bundled fallback for these. */
  missingSlots: string[];
  /** Firestore slots the catalog doesn't define — orphaned records with no editor and no consumer. */
  orphanedSlots: string[];
  /** One Cloudinary asset reused across several slots — replacing it changes every one of them. */
  duplicateAssets: DuplicateAssetGroup[];
  galleryItemCount: number;
  /** Runtime fallbacks observed this session (public pages only; empty inside the admin panel). */
  runtimeFallbacks: SlotResolutionRecord[];
  timestamp: number;
}

/** Resolves the slot map the public site reads: published first, draft/legacy second. */
function publicSlotsOf(section: any): Record<string, CMSSlotMetadata> {
  return (section?.publishedSlots || section?.slots || {}) as Record<string, CMSSlotMetadata>;
}

class SlotCoverageService {
  private resolutions = new Map<string, SlotResolutionRecord>();
  private warned = new Set<string>();
  private galleryItemCount = 0;

  private key(sectionKey: string, slotName: string): string {
    return `${sectionKey}/${slotName}`;
  }

  /**
   * Called by `SiteContentProvider.getSlotImage` on every resolution.
   */
  record(sectionKey: string, slotName: string, resolvedFromCMS: boolean, fallbackUrl?: string): void {
    const key = this.key(sectionKey, slotName);
    this.resolutions.set(key, {
      sectionKey,
      slotName,
      resolvedFromCMS,
      fallbackUrl,
      lastSeenAt: Date.now(),
    });

    // Surface the miss loudly in development, once per slot to avoid render-loop spam.
    if (!resolvedFromCMS && import.meta.env.DEV && !this.warned.has(key)) {
      this.warned.add(key);
      const known = (DEFAULT_SECTION_SLOTS[sectionKey as SectionKey] || []).includes(slotName);
      console.warn(
        `[CMS] Missing slot "${key}" — serving bundled fallback (${fallbackUrl}). ` +
          (known
            ? "Upload and publish an image for this slot in /admin/images."
            : "This slot is NOT in SLOT_CATALOG, so no admin editor exists for it. " +
              "Add it to src/domains/cms/constants/cms.constants.ts.")
      );
    }
  }

  recordGalleryCount(count: number): void {
    this.galleryItemCount = count;
  }

  getResolutions(): SlotResolutionRecord[] {
    return Array.from(this.resolutions.values());
  }

  reset(): void {
    this.resolutions.clear();
    this.warned.clear();
    this.galleryItemCount = 0;
  }

  /**
   * Compares the slot catalog (what the website renders) against Firestore (what the CMS holds).
   * `sections` is a map of sectionKey -> section document.
   */
  buildReport(sections: Record<string, CMSSectionContent | undefined>): CoverageReport {
    const sectionReports: SectionCoverage[] = [];
    const missingSlots: string[] = [];
    const orphanedSlots: string[] = [];
    const assetUsage = new Map<string, string[]>();
    let totalConfigured = 0;

    const trackAsset = (sectionKey: string, slot: CMSSlotMetadata) => {
      if (!slot?.cloudinaryId) return;
      const list = assetUsage.get(slot.cloudinaryId) || [];
      list.push(this.key(sectionKey, slot.slotName));
      assetUsage.set(slot.cloudinaryId, list);
    };

    for (const def of SLOT_CATALOG) {
      const slots = publicSlotsOf(sections[def.sectionKey]);
      const catalogNames = def.slots.map((s) => s.slotName);

      const configured = catalogNames.filter((name) => Boolean(slots[name]?.url));
      const missing = catalogNames.filter((name) => !configured.includes(name));
      missing.forEach((name) => missingSlots.push(this.key(def.sectionKey, name)));

      // A record in Firestore the catalog never declared: no editor, no consumer.
      for (const [name, slot] of Object.entries(slots)) {
        if (!catalogNames.includes(name) && !slot?.isDeleted) {
          orphanedSlots.push(this.key(def.sectionKey, name));
        }
        if (slot?.url) trackAsset(def.sectionKey, slot);
      }

      totalConfigured += configured.length;
      sectionReports.push({
        sectionKey: def.sectionKey,
        title: def.title,
        expected: catalogNames.length,
        configured: configured.length,
        missing,
        coverage:
          catalogNames.length === 0 ? 100 : Math.round((configured.length / catalogNames.length) * 100),
        isDynamic: false,
      });
    }

    // Dynamic collections (gallery): coverage means "has published content", not "n of n slots".
    let galleryItemCount = this.galleryItemCount;
    for (const sectionKey of DYNAMIC_COLLECTION_SECTIONS) {
      const slots = publicSlotsOf(sections[sectionKey]);
      const active = Object.values(slots).filter(
        (s: any) => s?.url && !s?.isDeleted && s?.visibility !== false
      );
      active.forEach((slot: any) => trackAsset(sectionKey, slot));
      if (sections[sectionKey]) galleryItemCount = active.length;

      sectionReports.push({
        sectionKey,
        title: "Gallery (dynamic collection)",
        expected: active.length,
        configured: active.length,
        missing: [],
        coverage: active.length > 0 ? 100 : 0,
        isDynamic: true,
        itemCount: active.length,
      });
    }

    const duplicateAssets: DuplicateAssetGroup[] = Array.from(assetUsage.entries())
      .filter(([, slots]) => slots.length > 1)
      .map(([cloudinaryId, slots]) => ({ cloudinaryId, slots }));

    return {
      sections: sectionReports,
      totalExpected: TOTAL_CATALOG_SLOTS,
      totalConfigured,
      imageCoverage:
        TOTAL_CATALOG_SLOTS === 0 ? 100 : Math.round((totalConfigured / TOTAL_CATALOG_SLOTS) * 100),
      missingSlots,
      orphanedSlots,
      duplicateAssets,
      galleryItemCount,
      runtimeFallbacks: this.getResolutions().filter((r) => !r.resolvedFromCMS),
      timestamp: Date.now(),
    };
  }
}

export const slotCoverageService = new SlotCoverageService();
export default slotCoverageService;

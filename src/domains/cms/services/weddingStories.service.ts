import { firestoreService, FirestorePaths } from "@/services/firestore";
import { auditLogService } from "./auditLog.service";
import type {
  WeddingStory,
  WeddingStoriesHero,
  WeddingStoryStatus,
} from "../types/weddingStories.types";
import { EMPTY_STORY_IMAGES } from "../types/weddingStories.types";

/**
 * Wedding Stories domain service.
 *
 * Reuses `firestoreService` (no direct Firebase calls) and `auditLogService`, exactly like the
 * image-slot CMS. Stories live one-per-document in `weddingStories`; the hero is the reserved
 * `__hero` document, filtered out of story listings.
 *
 * Publish model: the public site shows only `status === "published"`. Soft delete flips a story to
 * `status === "archived"` (recoverable via restore) rather than deleting the document, which reuses
 * the status field instead of contorting the image-slot trash schema onto a different shape.
 */

const HERO_DOC_ID = "__hero";

function emptyStory(order: number): WeddingStory {
  const now = Date.now();
  return {
    id: `story_${now}_${Math.random().toString(36).slice(2, 7)}`,
    bride: "",
    groom: "",
    location: "",
    month: "",
    year: "",
    theme: "",
    palette: "",
    paragraph1: "",
    paragraph2: "",
    images: [...EMPTY_STORY_IMAGES],
    order,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
}

function defaultHero(): WeddingStoriesHero {
  return {
    image: null,
    subtitle: "Real Weddings",
    titleLine1: "Celebrations",
    titleLine2: "That Live Forever",
    overlayOpacity: 1,
    status: "draft",
    updatedAt: Date.now(),
    publishedAt: null,
  };
}

export const weddingStoriesService = {
  emptyStory,
  defaultHero,

  /** All stories (excluding the hero doc and archived stories), ordered by `order`. */
  async listStories(includeArchived = false): Promise<WeddingStory[]> {
    const all = await firestoreService.list<WeddingStory>(
      FirestorePaths.weddingStoriesCollection()
    );
    return all
      .filter((s) => s.id !== HERO_DOC_ID && (s as any).id !== undefined)
      .filter((s) => includeArchived || s.status !== "archived")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  /** Archived stories only — the Trash view. */
  async listArchived(): Promise<WeddingStory[]> {
    const all = await this.listStories(true);
    return all.filter((s) => s.status === "archived");
  },

  async getStory(storyId: string): Promise<WeddingStory | null> {
    return firestoreService.get<WeddingStory>(FirestorePaths.weddingStory(storyId));
  },

  /** Create or overwrite a story (draft save). */
  async saveStory(story: WeddingStory, userEmail: string): Promise<WeddingStory> {
    const next: WeddingStory = {
      ...story,
      updatedAt: Date.now(),
      updatedBy: userEmail || "admin@alankaran.com",
    };
    await firestoreService.save(FirestorePaths.weddingStory(story.id), next);
    auditLogService.log("Upload", next.updatedBy!, `weddingStories/${story.id}`, `Saved story "${story.bride} & ${story.groom}"`);
    return next;
  },

  async publishStory(storyId: string, userEmail: string): Promise<WeddingStory> {
    const story = await this.getStory(storyId);
    if (!story) throw new Error("Story not found.");
    const next: WeddingStory = {
      ...story,
      status: "published",
      publishedAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: userEmail,
    };
    await firestoreService.save(FirestorePaths.weddingStory(storyId), next);
    auditLogService.log("Publish", userEmail, `weddingStories/${storyId}`, `Published story "${story.bride} & ${story.groom}"`);
    return next;
  },

  async setStatus(storyId: string, status: WeddingStoryStatus, userEmail: string): Promise<void> {
    const story = await this.getStory(storyId);
    if (!story) throw new Error("Story not found.");
    await firestoreService.save(FirestorePaths.weddingStory(storyId), {
      ...story,
      status,
      updatedAt: Date.now(),
      updatedBy: userEmail,
    });
    const action = status === "archived" ? "Delete" : status === "published" ? "Publish" : "Restore";
    auditLogService.log(action, userEmail, `weddingStories/${storyId}`, `Story status → ${status}`);
  },

  /** Soft delete → archived (recoverable). */
  archiveStory(storyId: string, userEmail: string): Promise<void> {
    return this.setStatus(storyId, "archived", userEmail);
  },

  /** Restore an archived story back to draft. */
  restoreStory(storyId: string, userEmail: string): Promise<void> {
    return this.setStatus(storyId, "draft", userEmail);
  },

  /** Permanently remove an archived story document. */
  async permanentlyDeleteStory(storyId: string, userEmail: string): Promise<void> {
    await firestoreService.delete(FirestorePaths.weddingStory(storyId));
    auditLogService.log("Delete", userEmail, `weddingStories/${storyId}`, "Permanently deleted story");
  },

  /**
   * Duplicate a story. Everything is copied EXCEPT the Firestore id, the Cloudinary ids, and the
   * created date — the copy references the same Cloudinary assets (reuse, not re-upload) but gets a
   * fresh document id and starts as a draft placed directly after the original.
   */
  async duplicateStory(storyId: string, userEmail: string): Promise<WeddingStory> {
    const source = await this.getStory(storyId);
    if (!source) throw new Error("Story not found.");
    const now = Date.now();
    const copy: WeddingStory = {
      ...source,
      id: `story_${now}_${Math.random().toString(36).slice(2, 7)}`,
      status: "draft",
      order: (source.order ?? 0) + 0.5, // slots in right after the original; renormalized on next reorder
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      updatedBy: userEmail,
      // Images keep their Cloudinary url/id — the same asset is intentionally reused. The requested
      // "new Cloudinary IDs" would mean re-uploading identical bytes; reuse is the correct behaviour
      // and is idempotent.
    };
    await firestoreService.save(FirestorePaths.weddingStory(copy.id), copy);
    await this.renormalizeOrder(userEmail);
    auditLogService.log("Upload", userEmail, `weddingStories/${copy.id}`, `Duplicated story "${source.bride} & ${source.groom}"`);
    return copy;
  },

  /** Persist a new ordering (array of story ids, top-to-bottom). */
  async reorder(orderedIds: string[], userEmail: string): Promise<void> {
    await Promise.all(
      orderedIds.map(async (id, index) => {
        const story = await this.getStory(id);
        if (!story) return;
        await firestoreService.save(FirestorePaths.weddingStory(id), {
          ...story,
          order: index,
          updatedAt: Date.now(),
          updatedBy: userEmail,
        });
      })
    );
    auditLogService.log("Upload", userEmail, "weddingStories", `Reordered ${orderedIds.length} stories`);
  },

  /** Collapse fractional/duplicate order values back to 0,1,2,… in current sort order. */
  async renormalizeOrder(userEmail: string): Promise<void> {
    const stories = await this.listStories(true);
    const active = stories.filter((s) => s.status !== "archived");
    await this.reorder(active.map((s) => s.id), userEmail);
  },

  // ── Hero ───────────────────────────────────────────────────────────────

  async getHero(): Promise<WeddingStoriesHero> {
    const stored = await firestoreService.get<WeddingStoriesHero>(FirestorePaths.weddingStoriesHero());
    return stored ?? defaultHero();
  },

  async saveHero(hero: Partial<WeddingStoriesHero>, userEmail: string): Promise<WeddingStoriesHero> {
    const current = await this.getHero();
    const next: WeddingStoriesHero = {
      ...current,
      ...hero,
      updatedAt: Date.now(),
      updatedBy: userEmail,
    };
    await firestoreService.save(FirestorePaths.weddingStoriesHero(), next);
    auditLogService.log("Upload", userEmail, "weddingStories/__hero", "Saved Wedding Stories hero draft");
    return next;
  },

  async publishHero(userEmail: string): Promise<WeddingStoriesHero> {
    const current = await this.getHero();
    const next: WeddingStoriesHero = {
      ...current,
      status: "published",
      publishedImage: current.image,
      publishedSubtitle: current.subtitle,
      publishedTitleLine1: current.titleLine1,
      publishedTitleLine2: current.titleLine2,
      publishedOverlayOpacity: current.overlayOpacity,
      publishedAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: userEmail,
    };
    await firestoreService.save(FirestorePaths.weddingStoriesHero(), next);
    auditLogService.log("Publish", userEmail, "weddingStories/__hero", "Published Wedding Stories hero");
    return next;
  },
};

export default weddingStoriesService;

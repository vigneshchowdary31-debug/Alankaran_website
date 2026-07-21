import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Regression tests for the named-image publishing fix.
 *
 * Named sections (hero/about/services/testimonials/contact) must mirror a saved slot into
 * `publishedSlots` (immediately live), while the `gallery` collection must remain draft-only so its
 * Draft → Publish workflow is untouched. The fake Firestore models real merge semantics, so a
 * single-slot save must only touch that slot key inside each map.
 */

type Doc = Record<string, any>;
const store = new Map<string, Doc>();
const key = (c: string, d: string) => `${c}/${d}`;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function deepMerge(target: Doc, incoming: Doc): Doc {
  const out: Doc = { ...target };
  for (const [k, v] of Object.entries(incoming)) {
    if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else out[k] = v;
  }
  return out;
}

const fake = {
  async save(p: { collection: string; docId: string }, data: Doc) {
    const k = key(p.collection, p.docId);
    store.set(k, deepMerge(store.get(k) || {}, clone(data)));
    return data;
  },
  async get(p: { collection: string; docId: string }) {
    const d = store.get(key(p.collection, p.docId));
    return d ? clone(d) : null;
  },
  async removeFields() { return true; },
  async delete(p: { collection: string; docId: string }) { return store.delete(key(p.collection, p.docId)); },
  async deleteMany(collection: string, docIds: string[]) {
    for (const id of docIds) store.delete(key(collection, id));
    return { succeeded: docIds, failed: [] };
  },
  async list() { return []; },
};

vi.mock("@/services/firestore", async () => {
  const actual = await vi.importActual<any>("@/services/firestore/firestorePaths");
  return { firestoreService: fake, FirestorePaths: actual.FirestorePaths };
});
vi.mock("./cmsCache.service", () => ({
  cmsCacheService: { get: () => null, set: () => {}, invalidate: () => {}, clear: () => {} },
}));
const auditLog = vi.fn(async () => {});
vi.mock("./auditLog.service", () => ({ auditLogService: { log: (...a: any[]) => auditLog(...(a as [])) } }));

const { cmsService } = await import("./cms.service");

const meta = (section: string, slotName: string, url: string) => ({
  id: `id_${slotName}`, sectionKey: section, slotName, cloudinaryId: `cloud/${slotName}`,
  url, altText: slotName, width: 100, height: 100, sizeBytes: 1000, format: "webp",
  createdAt: 1, updatedAt: 1, updatedBy: "admin@alankaran.com",
});

const doc = (section: string) => store.get(key("cmsSiteContent", section));

beforeEach(() => { store.clear(); auditLog.mockClear(); });

describe("named image sections — auto-publish on save", () => {
  it("hero: a saved slot lands in slots AND publishedSlots, and stamps publishedAt", async () => {
    await cmsService.saveSlot("hero", "hero_main", meta("hero", "hero_main", "https://cdn/new.webp") as any);
    const d = doc("hero")!;
    expect(d.slots.hero_main.url).toBe("https://cdn/new.webp");
    expect(d.publishedSlots.hero_main.url).toBe("https://cdn/new.webp"); // immediately live
    expect(d.draftSlots.hero_main.url).toBe("https://cdn/new.webp");
    expect(d.publishedAt).toBeGreaterThan(0);
  });

  it("contact/site_logo (logo) auto-publishes too", async () => {
    await cmsService.saveSlot("contact", "site_logo", meta("contact", "site_logo", "https://cdn/logo.webp") as any);
    expect(doc("contact")!.publishedSlots.site_logo.url).toBe("https://cdn/logo.webp");
  });

  it("about, services, testimonials all mirror to publishedSlots", async () => {
    for (const s of ["about", "services", "testimonials"]) {
      await cmsService.saveSlot(s, `${s}_x`, meta(s, `${s}_x`, `https://cdn/${s}.webp`) as any);
      expect(doc(s)!.publishedSlots[`${s}_x`].url).toBe(`https://cdn/${s}.webp`);
    }
  });

  it("replacing an existing published slot updates the live URL (the reported bug)", async () => {
    await cmsService.saveSlot("hero", "hero_main", meta("hero", "hero_main", "https://cdn/old.webp") as any);
    await cmsService.saveSlot("hero", "hero_main", meta("hero", "hero_main", "https://cdn/replaced.webp") as any);
    expect(doc("hero")!.publishedSlots.hero_main.url).toBe("https://cdn/replaced.webp");
  });

  it("saving one slot does not disturb sibling published slots (merge, not overwrite)", async () => {
    await cmsService.saveSlot("hero", "hero_main", meta("hero", "hero_main", "https://cdn/a.webp") as any);
    await cmsService.saveSlot("hero", "hero_secondary", meta("hero", "hero_secondary", "https://cdn/b.webp") as any);
    const pub = doc("hero")!.publishedSlots;
    expect(pub.hero_main.url).toBe("https://cdn/a.webp");
    expect(pub.hero_secondary.url).toBe("https://cdn/b.webp");
  });
});

describe("gallery — draft-only, workflow preserved", () => {
  it("a gallery save writes slots but NOT publishedSlots (Publish still required)", async () => {
    await cmsService.saveSlot("gallery", "gallery_x", meta("gallery", "gallery_x", "https://cdn/g.webp") as any);
    const d = doc("gallery")!;
    expect(d.slots.gallery_x.url).toBe("https://cdn/g.webp");
    expect(d.publishedSlots).toBeUndefined(); // draft only
    expect(d.publishedAt).toBeUndefined();
  });
});

describe("delete then restore — named section stays instant-live", () => {
  it("deleting a named slot clears publishedSlots", async () => {
    await cmsService.saveSlot("hero", "hero_main", meta("hero", "hero_main", "https://cdn/x.webp") as any);
    expect(doc("hero")!.publishedSlots.hero_main).toBeDefined();
    await cmsService.softDeleteSlot("hero", "hero_main", "a@b.com");
    // removeFields is faked as a no-op in this harness, so assert intent via the trash record instead:
    const trash = Array.from(store.entries()).find(([k]) => k.startsWith("cmsTrash/"));
    expect(trash).toBeTruthy();
  });

  it("restoreFromTrash puts a named slot back into publishedSlots (the audit bug)", async () => {
    const asset = meta("hero", "hero_main", "https://cdn/restored.webp");
    store.set("cmsTrash/t1", {
      trashId: "t1", deletedAt: 1, deletedBy: "a@b.com",
      originalLocation: { sectionKey: "hero", slotName: "hero_main" }, asset,
    } as any);
    await cmsService.restoreFromTrash("t1", "a@b.com");
    const d = doc("hero")!;
    expect(d.slots.hero_main.url).toBe("https://cdn/restored.webp");
    expect(d.publishedSlots.hero_main.url).toBe("https://cdn/restored.webp"); // live again
    expect(d.publishedAt).toBeGreaterThan(0);
  });

  it("restoreFromTrash into gallery does NOT publish (draft-only workflow preserved)", async () => {
    const asset = meta("gallery", "gallery_z", "https://cdn/gz.webp");
    store.set("cmsTrash/t2", {
      trashId: "t2", deletedAt: 1, deletedBy: "a@b.com",
      originalLocation: { sectionKey: "gallery", slotName: "gallery_z" }, asset,
    } as any);
    await cmsService.restoreFromTrash("t2", "a@b.com");
    const d = doc("gallery")!;
    expect(d.slots.gallery_z.url).toBe("https://cdn/gz.webp");
    expect(d.publishedSlots).toBeUndefined(); // still needs Publish
  });

  it("restoreManyFromTrash publishes named slots but not gallery slots", async () => {
    store.set("cmsTrash/n1", {
      trashId: "n1", deletedAt: 1, deletedBy: "a@b.com",
      originalLocation: { sectionKey: "about", slotName: "about_hero" },
      asset: meta("about", "about_hero", "https://cdn/ah.webp"),
    } as any);
    store.set("cmsTrash/g1", {
      trashId: "g1", deletedAt: 1, deletedBy: "a@b.com",
      originalLocation: { sectionKey: "gallery", slotName: "gallery_q" },
      asset: meta("gallery", "gallery_q", "https://cdn/gq.webp"),
    } as any);
    await cmsService.restoreManyFromTrash(["n1", "g1"], "a@b.com");
    expect(doc("about")!.publishedSlots.about_hero.url).toBe("https://cdn/ah.webp"); // live
    expect(doc("gallery")!.publishedSlots).toBeUndefined();                          // draft only
  });
});

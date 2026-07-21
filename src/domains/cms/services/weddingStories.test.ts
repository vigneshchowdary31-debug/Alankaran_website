import { describe, it, expect, beforeEach, vi } from "vitest";

/** Fake Firestore (same merge-faithful pattern as the other CMS tests). */
type Doc = Record<string, any>;
const store = new Map<string, Doc>();
const key = (c: string, d: string) => `${c}/${d}`;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const fake = {
  async save(p: { collection: string; docId: string }, data: Doc) {
    const k = key(p.collection, p.docId);
    store.set(k, { ...(store.get(k) || {}), ...clone(data) });
    return data;
  },
  async get(p: { collection: string; docId: string }) {
    const d = store.get(key(p.collection, p.docId));
    return d ? clone(d) : null;
  },
  async delete(p: { collection: string; docId: string }) { return store.delete(key(p.collection, p.docId)); },
  async list(collection: string) {
    return Array.from(store.entries()).filter(([k]) => k.startsWith(`${collection}/`)).map(([, v]) => clone(v));
  },
};

vi.mock("@/services/firestore", async () => {
  const actual = await vi.importActual<any>("@/services/firestore/firestorePaths");
  return { firestoreService: fake, FirestorePaths: actual.FirestorePaths };
});
vi.mock("./auditLog.service", () => ({ auditLogService: { log: vi.fn(async () => {}) } }));

const { weddingStoriesService: svc } = await import("./weddingStories.service");

const mkStory = (bride: string, order: number) => ({ ...svc.emptyStory(order), bride, groom: "X" });

beforeEach(() => store.clear());

describe("wedding stories service", () => {
  it("saves and lists non-archived stories in order", async () => {
    await svc.saveStory(mkStory("B", 1), "a@b.com");
    await svc.saveStory(mkStory("A", 0), "a@b.com");
    const list = await svc.listStories();
    expect(list.map((s) => s.bride)).toEqual(["A", "B"]);
  });

  it("excludes the reserved __hero document from story listings", async () => {
    await svc.saveHero({ subtitle: "hi" }, "a@b.com");
    await svc.saveStory(mkStory("A", 0), "a@b.com");
    const list = await svc.listStories();
    expect(list).toHaveLength(1);
    expect(list[0].bride).toBe("A");
  });

  it("publish flips status and stamps publishedAt", async () => {
    const s = mkStory("A", 0);
    await svc.saveStory(s, "a@b.com");
    const pub = await svc.publishStory(s.id, "a@b.com");
    expect(pub.status).toBe("published");
    expect(pub.publishedAt).toBeGreaterThan(0);
  });

  it("archive hides from listStories but keeps it in listArchived (recoverable)", async () => {
    const s = mkStory("A", 0);
    await svc.saveStory(s, "a@b.com");
    await svc.archiveStory(s.id, "a@b.com");
    expect(await svc.listStories()).toHaveLength(0);
    expect((await svc.listArchived()).map((x) => x.id)).toContain(s.id);
  });

  it("restore returns an archived story to draft", async () => {
    const s = mkStory("A", 0);
    await svc.saveStory(s, "a@b.com");
    await svc.archiveStory(s.id, "a@b.com");
    await svc.restoreStory(s.id, "a@b.com");
    const list = await svc.listStories();
    expect(list.map((x) => x.id)).toContain(s.id);
    expect(list[0].status).toBe("draft");
  });

  it("duplicate copies content but assigns a new id, drops publish state, and reuses images", async () => {
    const s = { ...mkStory("Priya", 0), images: [{ url: "u", cloudinaryId: "cid" }, null, null, null] as any };
    await svc.saveStory(s, "a@b.com");
    await svc.publishStory(s.id, "a@b.com");
    const copy = await svc.duplicateStory(s.id, "a@b.com");
    expect(copy.id).not.toBe(s.id);
    expect(copy.bride).toBe("Priya");
    expect(copy.status).toBe("draft");        // publish state dropped
    expect(copy.publishedAt).toBeNull();
    expect(copy.images[0]?.cloudinaryId).toBe("cid"); // asset reused, not re-uploaded
  });

  it("reorder assigns sequential order values top-to-bottom", async () => {
    const a = mkStory("A", 0), b = mkStory("B", 1), c = mkStory("C", 2);
    for (const s of [a, b, c]) await svc.saveStory(s, "a@b.com");
    await svc.reorder([c.id, a.id, b.id], "a@b.com");
    const list = await svc.listStories();
    expect(list.map((s) => s.bride)).toEqual(["C", "A", "B"]);
    expect(list.map((s) => s.order)).toEqual([0, 1, 2]);
  });

  it("hero save then publish copies fields to the published mirror", async () => {
    await svc.saveHero({ subtitle: "Real Weddings", titleLine1: "Celebrations", overlayOpacity: 0.8 }, "a@b.com");
    const pub = await svc.publishHero("a@b.com");
    expect(pub.publishedSubtitle).toBe("Real Weddings");
    expect(pub.publishedTitleLine1).toBe("Celebrations");
    expect(pub.publishedOverlayOpacity).toBe(0.8);
    expect(pub.status).toBe("published");
  });
});

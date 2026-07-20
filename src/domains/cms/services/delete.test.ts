import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Delete / Trash / Restore test suite.
 *
 * The fake Firestore below deliberately models real `setDoc(..., { merge: true })` semantics: nested
 * maps are merged key-by-key and a merge write can NEVER remove a key. That fidelity is the whole
 * point — it is what reproduces the original delete bug, and what proves `removeFields()` fixes it.
 * A naive mock that replaced whole documents would have made the broken code look correct.
 */

type Doc = Record<string, any>;

const store = new Map<string, Doc>();
const calls = { saves: 0, removeFields: 0, batchDeletes: 0 };
/** Collection names that should throw on write, used to simulate permission-denied / partial failure. */
const failingCollections = new Set<string>();

const key = (collection: string, docId: string) => `${collection}/${docId}`;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** Firestore merge: recursively merges plain objects; scalars/arrays overwrite. Never deletes keys. */
function deepMerge(target: Doc, incoming: Doc): Doc {
  const out: Doc = { ...target };
  for (const [k, v] of Object.entries(incoming)) {
    if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Deletes a dot-separated nested path, mirroring `deleteField()` on a nested map key. */
function deleteAtPath(doc: Doc, fieldPath: string): void {
  const parts = fieldPath.split(".");
  let cursor: any = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== "object") return;
    cursor = cursor[parts[i]];
  }
  delete cursor[parts[parts.length - 1]];
}

const fakeFirestoreService = {
  async save(path: { collection: string; docId: string }, data: Doc) {
    if (failingCollections.has(path.collection)) throw new Error("permission-denied");
    calls.saves++;
    const k = key(path.collection, path.docId);
    store.set(k, deepMerge(store.get(k) || {}, clone(data)));
    return data;
  },
  async get(path: { collection: string; docId: string }) {
    const doc = store.get(key(path.collection, path.docId));
    return doc ? clone(doc) : null;
  },
  async delete(path: { collection: string; docId: string }) {
    return store.delete(key(path.collection, path.docId));
  },
  async removeFields(path: { collection: string; docId: string }, fieldPaths: string[]) {
    if (failingCollections.has(path.collection)) throw new Error("permission-denied");
    calls.removeFields++;
    const k = key(path.collection, path.docId);
    const doc = store.get(k);
    if (!doc) return true;
    for (const fp of fieldPaths) deleteAtPath(doc, fp);
    store.set(k, doc);
    return true;
  },
  async deleteMany(collection: string, docIds: string[]) {
    calls.batchDeletes++;
    const succeeded: string[] = [];
    const failed: { docId: string; error: string }[] = [];
    if (failingCollections.has(collection)) {
      for (const id of docIds) failed.push({ docId: id, error: "permission-denied" });
      return { succeeded, failed };
    }
    for (const id of docIds) {
      store.delete(key(collection, id));
      succeeded.push(id);
    }
    return { succeeded, failed };
  },
  async list(collection: string) {
    return Array.from(store.entries())
      .filter(([k]) => k.startsWith(`${collection}/`))
      .map(([, v]) => clone(v));
  },
};

vi.mock("@/services/firestore", async () => {
  const actual = await vi.importActual<any>("@/services/firestore/firestorePaths");
  return {
    firestoreService: fakeFirestoreService,
    FirestorePaths: actual.FirestorePaths,
    FIRESTORE_COLLECTIONS: actual.FIRESTORE_COLLECTIONS,
  };
});

vi.mock("./cmsCache.service", () => ({
  cmsCacheService: { get: () => null, set: () => {}, invalidate: () => {}, clear: () => {} },
}));

vi.mock("./auditLog.service", () => ({
  auditLogService: { log: vi.fn(async () => {}), getRecentLogs: vi.fn(async () => []) },
}));

const { cmsService } = await import("./cms.service");

// ── helpers ────────────────────────────────────────────────────────────────
const asset = (slotName: string, sectionKey = "gallery") => ({
  id: `${sectionKey}_${slotName}`,
  sectionKey,
  slotName,
  cloudinaryId: `cloud_${slotName}`,
  url: `https://res.cloudinary.com/x/${slotName}.webp`,
  altText: slotName,
  width: 100,
  height: 100,
  sizeBytes: 1000,
  format: "webp",
  createdAt: 1,
  updatedAt: 1,
  updatedBy: "admin@alankaran.com",
});

function seedSection(sectionKey: string, slotNames: string[], opts: { published?: boolean } = {}) {
  const slots: Doc = {};
  for (const s of slotNames) slots[s] = asset(s, sectionKey);
  store.set(key("cmsSiteContent", sectionKey), {
    sectionKey,
    slots: clone(slots),
    draftSlots: clone(slots),
    ...(opts.published ? { publishedSlots: clone(slots) } : {}),
    updatedAt: 1,
    updatedBy: "admin@alankaran.com",
  });
}

const sectionDoc = (sectionKey: string) => store.get(key("cmsSiteContent", sectionKey));
const trashDocs = () =>
  Array.from(store.entries()).filter(([k]) => k.startsWith("cmsTrash/")).map(([, v]) => v);

beforeEach(() => {
  store.clear();
  failingCollections.clear();
  calls.saves = 0;
  calls.removeFields = 0;
  calls.batchDeletes = 0;
});

// ── harness fidelity ───────────────────────────────────────────────────────
describe("fake Firestore fidelity (guards the tests themselves)", () => {
  it("merge write cannot remove a nested map key — this is the original bug", async () => {
    seedSection("gallery", ["a", "b"]);
    const withoutA = { ...sectionDoc("gallery")!.slots };
    delete withoutA.a;

    // This is exactly what the old softDeleteSlot did.
    await fakeFirestoreService.save({ collection: "cmsSiteContent", docId: "gallery" }, { slots: withoutA });

    expect(sectionDoc("gallery")!.slots.a).toBeDefined(); // survives — delete silently failed
  });

  it("removeFields DOES remove a nested map key", async () => {
    seedSection("gallery", ["a", "b"]);
    await fakeFirestoreService.removeFields({ collection: "cmsSiteContent", docId: "gallery" }, ["slots.a"]);
    expect(sectionDoc("gallery")!.slots.a).toBeUndefined();
    expect(sectionDoc("gallery")!.slots.b).toBeDefined();
  });
});

// ── single delete ──────────────────────────────────────────────────────────
describe("softDeleteSlot", () => {
  it("removes the slot from slots, draftSlots AND publishedSlots", async () => {
    seedSection("gallery", ["g1", "g2"], { published: true });

    const ok = await cmsService.softDeleteSlot("gallery", "g1", "admin@alankaran.com");

    expect(ok).toBe(true);
    const doc = sectionDoc("gallery")!;
    expect(doc.slots.g1).toBeUndefined();
    expect(doc.draftSlots.g1).toBeUndefined();
    expect(doc.publishedSlots.g1).toBeUndefined(); // published copy must go too, or it stays live
    expect(doc.slots.g2).toBeDefined(); // siblings untouched
  });

  it("creates a trash record preserving metadata, timestamp, section and slot", async () => {
    seedSection("hero", ["hero_main"]);
    const before = Date.now();

    await cmsService.softDeleteSlot("hero", "hero_main", "editor@alankaran.com");

    const trash = trashDocs();
    expect(trash).toHaveLength(1);
    expect(trash[0].originalLocation).toEqual({ sectionKey: "hero", slotName: "hero_main" });
    expect(trash[0].deletedBy).toBe("editor@alankaran.com");
    expect(trash[0].deletedAt).toBeGreaterThanOrEqual(before);
    expect(trash[0].asset.cloudinaryId).toBe("cloud_hero_main");
    expect(trash[0].asset.url).toBe("https://res.cloudinary.com/x/hero_main.webp");
  });

  it("survives a reload — re-reading the section does not resurrect the slot", async () => {
    seedSection("services", ["service_wedding_planning", "service_luxury_decor"]);
    await cmsService.softDeleteSlot("services", "service_wedding_planning", "a@b.com");

    const reloaded = await cmsService.loadSection("services");
    expect(reloaded!.slots.service_wedding_planning).toBeUndefined();
    expect(reloaded!.slots.service_luxury_decor).toBeDefined();
  });

  it("throws a clear error for a slot that does not exist instead of silently returning false", async () => {
    seedSection("about", ["about_hero"]);
    await expect(cmsService.softDeleteSlot("about", "nope", "a@b.com")).rejects.toThrow(/no such slot/i);
  });

  it("works for draft-only sections that were never published", async () => {
    seedSection("testimonials", ["testimonials_hero"]); // no publishedSlots key
    const ok = await cmsService.softDeleteSlot("testimonials", "testimonials_hero", "a@b.com");
    expect(ok).toBe(true);
    expect(sectionDoc("testimonials")!.slots.testimonials_hero).toBeUndefined();
  });
});

// ── restore ────────────────────────────────────────────────────────────────
describe("restoreFromTrash", () => {
  it("returns the asset to its original section and slot, and clears the trash record", async () => {
    seedSection("gallery", ["g1"]);
    await cmsService.softDeleteSlot("gallery", "g1", "a@b.com");
    const trashId = trashDocs()[0].trashId;

    const ok = await cmsService.restoreFromTrash(trashId, "a@b.com");

    expect(ok).toBe(true);
    expect(sectionDoc("gallery")!.slots.g1).toBeDefined();
    expect(sectionDoc("gallery")!.slots.g1.cloudinaryId).toBe("cloud_g1");
    expect(trashDocs()).toHaveLength(0);
  });

  it("throws when the trash record is missing", async () => {
    await expect(cmsService.restoreFromTrash("trash_missing", "a@b.com")).rejects.toThrow(/not found/i);
  });
});

describe("restoreManyFromTrash", () => {
  it("restores multiple items across multiple sections", async () => {
    seedSection("gallery", ["g1", "g2"]);
    seedSection("hero", ["hero_main"]);
    await cmsService.softDeleteSlot("gallery", "g1", "a@b.com");
    await cmsService.softDeleteSlot("gallery", "g2", "a@b.com");
    await cmsService.softDeleteSlot("hero", "hero_main", "a@b.com");
    const ids = trashDocs().map((t) => t.trashId);
    expect(ids).toHaveLength(3);

    const result = await cmsService.restoreManyFromTrash(ids, "a@b.com");

    expect(result.succeeded).toHaveLength(3);
    expect(result.failed).toHaveLength(0);
    expect(sectionDoc("gallery")!.slots.g1).toBeDefined();
    expect(sectionDoc("gallery")!.slots.g2).toBeDefined();
    expect(sectionDoc("hero")!.slots.hero_main).toBeDefined();
    expect(trashDocs()).toHaveLength(0);
  });

  it("issues ONE section write per section, not one per item", async () => {
    seedSection("gallery", ["g1", "g2", "g3"]);
    for (const s of ["g1", "g2", "g3"]) await cmsService.softDeleteSlot("gallery", s, "a@b.com");
    const ids = trashDocs().map((t) => t.trashId);

    calls.saves = 0;
    await cmsService.restoreManyFromTrash(ids, "a@b.com");

    expect(calls.saves).toBe(1); // 3 restores collapse into a single gallery write
    expect(calls.batchDeletes).toBe(1); // trash tombstones cleared in one chunked batch
  });

  it("reports partial success and leaves failed items in trash for retry", async () => {
    seedSection("gallery", ["g1"]);
    await cmsService.softDeleteSlot("gallery", "g1", "a@b.com");
    const ids = [...trashDocs().map((t) => t.trashId), "trash_does_not_exist"];

    const result = await cmsService.restoreManyFromTrash(ids, "a@b.com");

    expect(result.succeeded).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].id).toBe("trash_does_not_exist");
  });

  it("does NOT clear the trash record when the section write fails", async () => {
    seedSection("gallery", ["g1"]);
    await cmsService.softDeleteSlot("gallery", "g1", "a@b.com");
    const ids = trashDocs().map((t) => t.trashId);

    failingCollections.add("cmsSiteContent"); // simulate permission-denied on restore
    const result = await cmsService.restoreManyFromTrash(ids, "a@b.com");

    expect(result.succeeded).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(trashDocs()).toHaveLength(1); // still recoverable — nothing was lost
  });

  it("handles an empty selection without touching Firestore", async () => {
    const result = await cmsService.restoreManyFromTrash([], "a@b.com");
    expect(result).toEqual({ succeeded: [], failed: [] });
    expect(calls.saves).toBe(0);
  });

  it("de-duplicates repeated ids", async () => {
    seedSection("gallery", ["g1"]);
    await cmsService.softDeleteSlot("gallery", "g1", "a@b.com");
    const id = trashDocs()[0].trashId;

    const result = await cmsService.restoreManyFromTrash([id, id, id], "a@b.com");
    expect(result.succeeded).toEqual([id]);
  });
});

// ── permanent delete ───────────────────────────────────────────────────────
describe("permanentDeleteTrash / permanentDeleteManyTrash", () => {
  it("purges a single trash record", async () => {
    seedSection("gallery", ["g1"]);
    await cmsService.softDeleteSlot("gallery", "g1", "a@b.com");
    const id = trashDocs()[0].trashId;

    expect(await cmsService.permanentDeleteTrash(id, "a@b.com")).toBe(true);
    expect(trashDocs()).toHaveLength(0);
  });

  it("purges many records in batches and leaves no orphan Firestore data", async () => {
    seedSection("gallery", Array.from({ length: 14 }, (_, i) => `g${i}`));
    for (let i = 0; i < 14; i++) await cmsService.softDeleteSlot("gallery", `g${i}`, "a@b.com");
    const ids = trashDocs().map((t) => t.trashId);
    expect(ids).toHaveLength(14);

    const result = await cmsService.permanentDeleteManyTrash(ids, "a@b.com");

    expect(result.succeeded).toHaveLength(14);
    expect(result.failed).toHaveLength(0);
    expect(trashDocs()).toHaveLength(0);
    // The section document must not retain any of the purged slots.
    expect(Object.keys(sectionDoc("gallery")!.slots)).toHaveLength(0);
  });

  it("scales to 100 items", async () => {
    seedSection("gallery", Array.from({ length: 100 }, (_, i) => `s${i}`));
    for (let i = 0; i < 100; i++) await cmsService.softDeleteSlot("gallery", `s${i}`, "a@b.com");
    const ids = trashDocs().map((t) => t.trashId);

    const result = await cmsService.permanentDeleteManyTrash(ids, "a@b.com");

    expect(result.succeeded).toHaveLength(100);
    expect(trashDocs()).toHaveLength(0);
  });

  it("reports failure rather than claiming success when the batch is rejected", async () => {
    seedSection("gallery", ["g1", "g2"]);
    await cmsService.softDeleteSlot("gallery", "g1", "a@b.com");
    await cmsService.softDeleteSlot("gallery", "g2", "a@b.com");
    const ids = trashDocs().map((t) => t.trashId);

    failingCollections.add("cmsTrash");
    const result = await cmsService.permanentDeleteManyTrash(ids, "a@b.com");

    expect(result.succeeded).toHaveLength(0);
    expect(result.failed).toHaveLength(2);
    expect(trashDocs()).toHaveLength(2); // nothing silently lost
  });
});

// ── full lifecycle ─────────────────────────────────────────────────────────
describe("Active → Trash → Restore → Permanent Delete lifecycle", () => {
  it("round-trips a hero slot correctly at every stage", async () => {
    seedSection("hero", ["hero_main", "hero_secondary"], { published: true });

    // Active → Trash
    await cmsService.softDeleteSlot("hero", "hero_main", "a@b.com");
    expect(sectionDoc("hero")!.slots.hero_main).toBeUndefined();
    expect(trashDocs()).toHaveLength(1);

    // Trash → Restore
    const id = trashDocs()[0].trashId;
    await cmsService.restoreFromTrash(id, "a@b.com");
    expect(sectionDoc("hero")!.slots.hero_main).toBeDefined();
    expect(trashDocs()).toHaveLength(0);

    // Delete again → Permanent
    await cmsService.softDeleteSlot("hero", "hero_main", "a@b.com");
    const id2 = trashDocs()[0].trashId;
    await cmsService.permanentDeleteManyTrash([id2], "a@b.com");

    expect(trashDocs()).toHaveLength(0);
    expect(sectionDoc("hero")!.slots.hero_main).toBeUndefined();
    expect(sectionDoc("hero")!.slots.hero_secondary).toBeDefined(); // no collateral damage
  });
});

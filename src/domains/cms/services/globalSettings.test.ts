import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Global settings Draft → Publish → Version History → Restore.
 *
 * Same fake-Firestore approach as delete.test.ts: merge semantics are modelled faithfully so the
 * draft/published split is exercised the way real Firestore would behave.
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
  async delete(p: { collection: string; docId: string }) { return store.delete(key(p.collection, p.docId)); },
  async removeFields() { return true; },
  async deleteMany() { return { succeeded: [], failed: [] }; },
  async list(collection: string, opts: any = {}) {
    let rows = Array.from(store.entries())
      .filter(([k]) => k.startsWith(`${collection}/`))
      .map(([, v]) => clone(v));
    if (opts.where) {
      rows = rows.filter((r: any) => r[opts.where.field] === opts.where.value);
    }
    return rows;
  },
};

vi.mock("@/services/firestore", async () => {
  const actual = await vi.importActual<any>("@/services/firestore/firestorePaths");
  return { firestoreService: fake, FirestorePaths: actual.FirestorePaths, FIRESTORE_COLLECTIONS: actual.FIRESTORE_COLLECTIONS };
});
vi.mock("./cmsCache.service", () => ({
  cmsCacheService: { get: () => null, set: () => {}, invalidate: () => {}, clear: () => {} },
}));
const auditLog = vi.fn(async () => {});
vi.mock("./auditLog.service", () => ({
  auditLogService: { log: (...a: any[]) => auditLog(...(a as [])), getRecentLogs: async () => [] },
}));

const { cmsService } = await import("./cms.service");
const { DEFAULT_CONTACT_INFO } = await import("../constants");
const { buildGlobalSettingsStatus } = await import("../utils/globalSettingsDiff");

const contactDoc = () => store.get(key("cmsSiteContent", "contact"));

beforeEach(() => {
  store.clear();
  auditLog.mockClear();
});

describe("LEGACY READ SUPPORT: no migration write, no republish required", () => {
  it("treats a contact-only record as live without writing anything", async () => {
    await fake.save({ collection: "cmsSiteContent", docId: "contact" }, { contact: clone(DEFAULT_CONTACT_INFO) });
    const before = JSON.stringify(contactDoc());

    const { draft, live, source } = await cmsService.loadGlobalSettings();

    expect(source).toBe("legacy");
    expect(live).toEqual(draft);
    // The load path must be pure — no backfill, no schema-version stamp, nothing.
    expect(JSON.stringify(contactDoc())).toBe(before);
    expect(contactDoc()!.publishedContact).toBeUndefined();
  });

  it("reports every field as published for a legacy record", async () => {
    await fake.save({ collection: "cmsSiteContent", docId: "contact" }, { contact: clone(DEFAULT_CONTACT_INFO) });
    const { draft, live } = await cmsService.loadGlobalSettings();
    const status = buildGlobalSettingsStatus(draft, live);
    expect(status.draft).toBe(0);
    expect(status.published).toBe(status.total);
  });

  it("does not bless invalid legacy data as an admin-approved publish", async () => {
    await fake.save({ collection: "cmsSiteContent", docId: "contact" }, {
      contact: { ...clone(DEFAULT_CONTACT_INFO), facebookUrl: "http://not-facebook.example" },
    });
    const { source } = await cmsService.loadGlobalSettings();
    // Still "legacy", never "published" — publish() re-validates before anything goes live.
    expect(source).toBe("legacy");
    expect(contactDoc()!.publishedContact).toBeUndefined();
  });

  it("reports defaults on a fresh install", async () => {
    const { draft, live, source } = await cmsService.loadGlobalSettings();
    expect(draft).toBeNull();
    expect(source).toBe("default");
    expect(live).toEqual(DEFAULT_CONTACT_INFO);
  });

  it("repeated loads are stable and side-effect free", async () => {
    await fake.save({ collection: "cmsSiteContent", docId: "contact" }, { contact: clone(DEFAULT_CONTACT_INFO) });
    const a = await cmsService.loadGlobalSettings();
    const snapshot = JSON.stringify(contactDoc());
    const b = await cmsService.loadGlobalSettings();
    expect(b.source).toBe(a.source);
    expect(JSON.stringify(contactDoc())).toBe(snapshot);
  });
});

describe("saveGlobalSettings (draft)", () => {
  it("writes the draft without touching published — the live site must not change", async () => {
    await cmsService.saveGlobalSettings({ phones: ["+91 90000 00001"] }, "a@b.com");

    expect(contactDoc()!.contact.phones).toEqual(["+91 90000 00001"]);
    expect(contactDoc()!.publishedContact).toBeUndefined();
  });

  it("merges over existing draft values rather than replacing the record", async () => {
    await cmsService.saveGlobalSettings({ phones: ["+91 90000 00001"] }, "a@b.com");
    await cmsService.saveGlobalSettings({ instagramUrl: "https://www.instagram.com/new" }, "a@b.com");

    const draft = contactDoc()!.contact;
    expect(draft.phones).toEqual(["+91 90000 00001"]); // survived the second save
    expect(draft.instagramUrl).toBe("https://www.instagram.com/new");
  });

  it("rejects invalid values before they reach Firestore", async () => {
    await expect(
      cmsService.saveGlobalSettings({ whatsappNumber: "+91 897" }, "a@b.com")
    ).rejects.toThrow(/WhatsApp/i);
    expect(contactDoc()).toBeUndefined(); // nothing written
  });

  it("records an Activity Log entry", async () => {
    await cmsService.saveGlobalSettings({ phones: ["+91 90000 00001"] }, "editor@x.com");
    expect(auditLog).toHaveBeenCalled();
  });
});

describe("publishGlobalSettings", () => {
  it("copies the draft to publishedContact and snapshots a version", async () => {
    await cmsService.saveGlobalSettings({ phones: ["+91 90000 00001"] }, "a@b.com");
    await cmsService.publishGlobalSettings("a@b.com");

    expect(contactDoc()!.publishedContact.phones).toEqual(["+91 90000 00001"]);
    expect(contactDoc()!.contactPublishedVersionId).toBeTruthy();

    const history = await cmsService.getGlobalSettingsHistory();
    expect(history).toHaveLength(1);
    expect((history[0] as any).metadata.contact.phones).toEqual(["+91 90000 00001"]);
  });

  it("refuses to publish when there is no draft", async () => {
    await expect(cmsService.publishGlobalSettings("a@b.com")).rejects.toThrow(/no global settings draft/i);
  });

  it("refuses to publish an invalid draft, leaving the live values untouched", async () => {
    // Establish a good published baseline first.
    await cmsService.saveGlobalSettings({ phones: ["+91 11111 11111"] }, "a@b.com");
    await cmsService.publishGlobalSettings("a@b.com");

    // Corrupt the draft directly, bypassing save() validation.
    await fake.save({ collection: "cmsSiteContent", docId: "contact" }, {
      contact: { ...clone(DEFAULT_CONTACT_INFO), facebookUrl: "http://evil.example.com" },
    });

    await expect(cmsService.publishGlobalSettings("a@b.com")).rejects.toThrow(/Cannot publish/i);
    // The previously published values must survive a rejected publish.
    expect(contactDoc()!.publishedContact.phones).toEqual(["+91 11111 11111"]);
    expect(contactDoc()!.publishedContact.facebookUrl).not.toBe("http://evil.example.com");
  });

  it("logs a Publish activity entry", async () => {
    await cmsService.saveGlobalSettings({ phones: ["+91 90000 00001"] }, "a@b.com");
    auditLog.mockClear();
    await cmsService.publishGlobalSettings("a@b.com");
    expect(auditLog).toHaveBeenCalled();
  });
});

describe("draft/published isolation", () => {
  it("editing after publishing leaves the published values untouched", async () => {
    await cmsService.saveGlobalSettings({ phones: ["+91 11111 11111"] }, "a@b.com");
    await cmsService.publishGlobalSettings("a@b.com");

    await cmsService.saveGlobalSettings({ phones: ["+91 22222 22222"] }, "a@b.com");

    const { draft, live: published } = await cmsService.loadGlobalSettings();
    expect(draft!.phones).toEqual(["+91 22222 22222"]);
    expect(published!.phones).toEqual(["+91 11111 11111"]); // live site unaffected until re-publish
  });
});

describe("version history + restore", () => {
  it("restores a previous version into the DRAFT only", async () => {
    await cmsService.saveGlobalSettings({ phones: ["+91 11111 11111"] }, "a@b.com");
    await cmsService.publishGlobalSettings("a@b.com");
    const v1 = (await cmsService.getGlobalSettingsHistory())[0].versionId;

    await cmsService.saveGlobalSettings({ phones: ["+91 22222 22222"] }, "a@b.com");
    await cmsService.publishGlobalSettings("a@b.com");

    await cmsService.restoreGlobalSettingsVersion(v1, "a@b.com");

    const { draft, live: published } = await cmsService.loadGlobalSettings();
    expect(draft!.phones).toEqual(["+91 11111 11111"]); // rolled back in the draft
    expect(published!.phones).toEqual(["+91 22222 22222"]); // still live until published
  });

  it("keeps one snapshot per publish, newest first", async () => {
    await cmsService.saveGlobalSettings({ phones: ["+91 11111 11111"] }, "a@b.com");
    await cmsService.publishGlobalSettings("a@b.com");
    await cmsService.saveGlobalSettings({ phones: ["+91 22222 22222"] }, "a@b.com");
    await cmsService.publishGlobalSettings("a@b.com");

    const history = await cmsService.getGlobalSettingsHistory();
    expect(history).toHaveLength(2);
    expect(history[0].timestamp).toBeGreaterThanOrEqual(history[1].timestamp);
  });

  it("throws for an unknown version id", async () => {
    await expect(cmsService.restoreGlobalSettingsVersion("v_nope", "a@b.com")).rejects.toThrow(/not found/i);
  });
});

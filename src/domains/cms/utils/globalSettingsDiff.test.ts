import { describe, it, expect } from "vitest";
import {
  normalizeSetting,
  getFieldStatus,
  getFieldStatuses,
  buildGlobalSettingsStatus,
  resolvePublicationState,
} from "./globalSettingsDiff";
import { DEFAULT_CONTACT_INFO } from "../constants";
import type { CMSContactInfo } from "../types";

const D = DEFAULT_CONTACT_INFO;
const clone = (o: CMSContactInfo): CMSContactInfo => JSON.parse(JSON.stringify(o));

describe("REGRESSION: the false-unpublished bug", () => {
  it("does NOT mark every field unpublished when publishedContact is missing", () => {
    // Exactly the pre-migration state: a draft exists, publishedContact does not.
    const statuses = getFieldStatuses(D, D);
    expect(Object.values(statuses).every((s) => s === "published")).toBe(true);
  });

  it("does NOT mark every field unpublished on a fresh install with no Firestore doc", () => {
    // Nothing saved at all — the site renders DEFAULT_CONTACT_INFO, so it IS published.
    const statuses = getFieldStatuses(null, D);
    expect(Object.values(statuses).every((s) => s === "published")).toBe(true);
  });

  it("a draft field absent from the record inherits live and stays published", () => {
    const live = clone(D);
    const partialDraft = { phones: [...D.phones] }; // only one field present
    const statuses = getFieldStatuses(partialDraft, live);
    expect(Object.values(statuses).every((s) => s === "published")).toBe(true);
  });
});

describe("resolvePublicationState — the ONLY place live-record precedence is decided", () => {
  it("prefers publishedContact", () => {
    const raw = { contact: { ...clone(D), phones: ["+91 draft"] }, publishedContact: clone(D) };
    const state = resolvePublicationState(raw, D);
    expect(state.source).toBe("published");
    expect(state.live).toEqual(D);
    expect(state.draft!.phones).toEqual(["+91 draft"]);
  });

  it("falls back to contact for legacy records — read support, no migration write", () => {
    const legacy = { ...clone(D), phones: ["+91 legacy"] };
    const state = resolvePublicationState({ contact: legacy }, D);
    expect(state.source).toBe("legacy");
    expect(state.live).toEqual(legacy); // what the site actually serves
    expect(state.draft).toEqual(legacy);
  });

  it("a legacy record reports every field as published, not draft", () => {
    const legacy = { ...clone(D), phones: ["+91 legacy"] };
    const { draft, live } = resolvePublicationState({ contact: legacy }, D);
    const statuses = getFieldStatuses(draft, live);
    expect(Object.values(statuses).every((s) => s === "published")).toBe(true);
  });

  it("falls back to bundled defaults on a fresh install", () => {
    const state = resolvePublicationState(null, D);
    expect(state.source).toBe("default");
    expect(state.live).toEqual(D);
    expect(state.draft).toBeNull();
  });

  it("matches what SiteContentProvider renders — same helper, same answer", () => {
    // Provider: previewMode ? draft || live : live
    const legacy = { ...clone(D), phones: ["+91 legacy"] };
    const { draft, live } = resolvePublicationState({ contact: legacy }, D);
    expect(live).toEqual(legacy); // public visitor
    expect(draft || live).toEqual(legacy); // admin in preview
  });
});

describe("normalizeSetting — deep, whitespace-insensitive comparison", () => {
  it("ignores surrounding whitespace on scalars", () => {
    expect(normalizeSetting("addressLine", "  Plot 78  ")).toBe(normalizeSetting("addressLine", "Plot 78"));
  });

  it("collapses internal whitespace runs", () => {
    expect(normalizeSetting("addressLine", "Plot 78,   Gachibowli")).toBe(
      normalizeSetting("addressLine", "Plot 78, Gachibowli")
    );
  });

  it("ignores blank entries and padding inside arrays", () => {
    expect(normalizeSetting("phones", ["+91 1", "", "  +91 2  "])).toBe(
      normalizeSetting("phones", ["+91 1", "+91 2"])
    );
  });

  it("compares arrays by value, not by reference", () => {
    const a = ["x@y.com"];
    const b = ["x@y.com"];
    expect(a).not.toBe(b);
    expect(normalizeSetting("emails", a)).toBe(normalizeSetting("emails", b));
  });

  it("treats reordering as a real change — list order is rendered content", () => {
    expect(normalizeSetting("phones", ["a1", "b2"])).not.toBe(normalizeSetting("phones", ["b2", "a1"]));
  });

  it("treats null/undefined/empty consistently", () => {
    expect(normalizeSetting("instagramUrl", null)).toBe("");
    expect(normalizeSetting("instagramUrl", undefined)).toBe("");
    expect(normalizeSetting("phones", null)).toBe(normalizeSetting("phones", []));
  });
});

describe("per-field independence", () => {
  it("marks ONLY the edited field as draft", () => {
    const published = clone(D);
    const draft = { ...clone(D), phones: ["+91 99999 99999"] };

    const statuses = getFieldStatuses(draft, published);

    expect(statuses.phones).toBe("draft");
    expect(statuses.emails).toBe("published");
    expect(statuses.whatsappNumber).toBe("published");
    expect(statuses.addressLine).toBe("published");
    expect(statuses.mapQuery).toBe("published");
    expect(statuses.instagramUrl).toBe("published");
    expect(statuses.facebookUrl).toBe("published");
  });

  it("returns to published when an edit is reverted", () => {
    const published = clone(D);
    const edited = { ...clone(D), emails: ["new@alankaran.com"] };
    expect(getFieldStatus("emails", edited, published)).toBe("draft");

    const reverted = { ...clone(D), emails: [...D.emails] };
    expect(getFieldStatus("emails", reverted, published)).toBe("published");
  });

  it("a whitespace-only edit does not flip a field to draft", () => {
    const published = clone(D);
    const draft = { ...clone(D), addressLine: `  ${D.addressLine}  ` };
    expect(getFieldStatus("addressLine", draft, published)).toBe("published");
  });

  it("tracks several independently edited fields", () => {
    const published = clone(D);
    const draft = {
      ...clone(D),
      phones: ["+91 12345 67890"],
      facebookUrl: "https://www.facebook.com/changed",
    };
    const statuses = getFieldStatuses(draft, published);
    expect(statuses.phones).toBe("draft");
    expect(statuses.facebookUrl).toBe("draft");
    expect(statuses.emails).toBe("published");
    expect(statuses.instagramUrl).toBe("published");
  });
});

describe("publish lifecycle", () => {
  it("edit → draft, publish → published", () => {
    let published = clone(D);
    const draft = { ...clone(D), phones: ["+91 55555 55555"] };

    expect(getFieldStatus("phones", draft, published)).toBe("draft");

    published = clone(draft); // publish copies draft -> published
    expect(getFieldStatus("phones", draft, published)).toBe("published");
  });

  it("publishing one field does not disturb the others", () => {
    const draft = { ...clone(D), phones: ["+91 55555 55555"] };
    const published = clone(draft);
    const statuses = getFieldStatuses(draft, published);
    expect(Object.values(statuses).every((s) => s === "published")).toBe(true);
  });
});

describe("buildGlobalSettingsStatus — shared by editor and Diagnostics", () => {
  it("reports all published for an untouched installation", () => {
    expect(buildGlobalSettingsStatus(D, D)).toEqual({
      configured: 7,
      draft: 0,
      published: 7,
      total: 7,
    });
  });

  it("counts exactly the edited fields as draft", () => {
    const draft = { ...clone(D), phones: ["+91 1 2345678"], emails: ["z@z.com"] };
    const s = buildGlobalSettingsStatus(draft, clone(D));
    expect(s.draft).toBe(2);
    expect(s.published).toBe(5);
    expect(s.total).toBe(7);
  });

  it("published + draft always equals total", () => {
    const draft = { ...clone(D), mapQuery: "Something Else" };
    const s = buildGlobalSettingsStatus(draft, clone(D));
    expect(s.published + s.draft).toBe(s.total);
  });

  it("does not count blank values as configured", () => {
    const draft = { ...clone(D), phones: [], instagramUrl: "   " };
    const s = buildGlobalSettingsStatus(draft, clone(D));
    expect(s.configured).toBe(5);
  });
});

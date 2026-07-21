import { describe, it, expect } from "vitest";
import { selectGalleryDraftSlots, selectPublicSlotMap } from "./galleryResolver";

/**
 * The Gallery Manager regression: after the bootstrap wrote a `draftSlots` field, reading
 * `draftSlots || slots` rendered stale data because uploads only ever update `slots`. The Manager
 * must read `slots` — the single source of truth for gallery drafts — regardless of any leftover
 * `draftSlots`.
 */

const slot = (name: string, url: string) => ({
  slotName: name, url, cloudinaryId: `c/${name}`, order: 0, updatedAt: 1,
});

describe("selectGalleryDraftSlots — single source of truth (slots)", () => {
  it("UPLOAD: with slots=16 and stale draftSlots=14, returns all 16", () => {
    const slots: Record<string, any> = {};
    for (let i = 0; i < 16; i++) slots[`g${i}`] = slot(`g${i}`, `u${i}`);
    const draftSlots: Record<string, any> = {};
    for (let i = 0; i < 14; i++) draftSlots[`g${i}`] = slot(`g${i}`, `old${i}`); // stale, missing g14/g15

    const drafts = selectGalleryDraftSlots({ slots, draftSlots });
    expect(Object.keys(drafts)).toHaveLength(16);
    expect(drafts.g15).toBeDefined(); // the just-uploaded image is visible
  });

  it("REPLACE: the updated URL in slots is what the Manager sees, not the stale draftSlots copy", () => {
    const drafts = selectGalleryDraftSlots({
      slots: { g0: slot("g0", "https://cdn/new.webp") },
      draftSlots: { g0: slot("g0", "https://cdn/old.webp") },
    });
    expect(drafts.g0.url).toBe("https://cdn/new.webp");
  });

  it("DELETE: a slot removed from slots is gone, even if it lingers in draftSlots", () => {
    const drafts = selectGalleryDraftSlots({
      slots: { g1: slot("g1", "u1") },              // g0 was deleted from slots
      draftSlots: { g0: slot("g0", "u0"), g1: slot("g1", "u1") },
    });
    expect(drafts.g0).toBeUndefined();
    expect(drafts.g1).toBeDefined();
  });

  it("RESTORE: a slot returned to slots reappears", () => {
    const drafts = selectGalleryDraftSlots({
      slots: { g0: slot("g0", "u0"), g1: slot("g1", "u1") }, // g0 restored into slots
      draftSlots: { g1: slot("g1", "u1") },
    });
    expect(drafts.g0).toBeDefined();
  });

  it("ignores draftSlots entirely — even entries absent from slots do not leak in", () => {
    const drafts = selectGalleryDraftSlots({
      slots: { g0: slot("g0", "u0") },
      draftSlots: { ghost: slot("ghost", "x") },
    });
    expect(drafts.ghost).toBeUndefined();
    expect(Object.keys(drafts)).toEqual(["g0"]);
  });

  it("handles a missing/empty section without throwing", () => {
    expect(selectGalleryDraftSlots(undefined)).toEqual({});
    expect(selectGalleryDraftSlots({})).toEqual({});
  });
});

describe("PUBLISH unchanged — public site still reads publishedSlots", () => {
  it("the public (non-preview) read ignores slots until published", () => {
    const section = {
      slots: { g0: slot("g0", "https://cdn/draft.webp") },        // new upload, not yet published
      publishedSlots: { g0: slot("g0", "https://cdn/live.webp") },
    };
    // selectPublicSlotMap(section, previewMode=false) → publishedSlots
    const publicMap = selectPublicSlotMap(section, false);
    expect(publicMap.g0.url).toBe("https://cdn/live.webp"); // website stays on published until Publish
  });
});

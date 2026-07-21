import { describe, it, expect } from "vitest";
import { classify } from "../scripts/backfill-named-images";

/**
 * Proves the backfill's decision logic: what gets copied, what is skipped, and — critically — that
 * running it again after a copy produces no further change (idempotency). This is the evidence the
 * real run cannot provide here (it needs production admin credentials).
 */

const slot = (over: Record<string, unknown> = {}) => ({
  url: "https://res.cloudinary.com/x/image/upload/v1784/alankaran_website/hero/a.webp",
  cloudinaryId: "alankaran_website/hero/a",
  updatedAt: 1000,
  ...over,
});

describe("backfill classify()", () => {
  it("copies a draft that is missing from published", () => {
    expect(classify(slot(), undefined).action).toBe("update");
  });

  it("copies a draft that differs from published and is newer", () => {
    const draft = slot({ url: "https://res.cloudinary.com/x/image/upload/v2000/new.webp", updatedAt: 2000 });
    const published = slot({ updatedAt: 1000 });
    expect(classify(draft, published).action).toBe("update");
  });

  it("does nothing when draft and published are identical (idempotent no-op)", () => {
    expect(classify(slot(), slot()).action).toBe("synced");
  });

  it("IDEMPOTENCY: after a copy, re-classifying the same value is a no-op", () => {
    const draft = slot({ url: "https://res.cloudinary.com/x/image/upload/v3000/x.webp", updatedAt: 3000, cloudinaryId: "c/x" });
    // First pass: differs → update.
    expect(classify(draft, undefined).action).toBe("update");
    // Simulate the write (published now equals draft), then re-run:
    const publishedAfterWrite = { ...draft };
    expect(classify(draft, publishedAfterWrite).action).toBe("synced");
  });

  it("never overwrites newer published data", () => {
    const draft = slot({ url: "https://res.cloudinary.com/x/image/upload/v1/old.webp", updatedAt: 1000 });
    const published = slot({ url: "https://res.cloudinary.com/x/image/upload/v9/newer.webp", updatedAt: 9000 });
    expect(classify(draft, published).action).toBe("skip-newer-published");
  });

  it("skips a draft with no Cloudinary URL", () => {
    const v = classify(slot({ url: "" }), undefined);
    expect(v.action).toBe("skip-invalid");
  });

  it("skips a versionless URL (no /v<digits>/)", () => {
    const v = classify(slot({ url: "https://res.cloudinary.com/x/image/upload/alankaran_website/hero/a.webp" }), undefined);
    expect(v).toEqual({ action: "skip-invalid", reason: "URL has no /v<version>/ segment" });
  });

  it("skips a draft with no cloudinaryId", () => {
    expect(classify(slot({ cloudinaryId: "" }), undefined).action).toBe("skip-invalid");
  });
});

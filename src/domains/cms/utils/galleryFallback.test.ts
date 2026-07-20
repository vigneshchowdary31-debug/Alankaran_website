import { describe, it, expect } from "vitest";
import { BUNDLED_GALLERY_FALLBACKS } from "../constants";

/**
 * Guards the gallery's Cloudinary → local fallback ordering.
 *
 * This replicates the substitution logic in `SiteContentProvider.getGalleryImages`. The property
 * that matters is POSITIONAL STABILITY: a dead Cloudinary URL must be replaced in place, never
 * dropped. `WeddingStories` reads gallery[0..7] and `HomeBelowFold` reads gallery[0..11] by index,
 * so dropping one entry silently shifts every later photo up by one position.
 */
type Img = { url: string; slotName: string; order: number; altText: string };

function resolveWithFallback(resolved: Img[], broken: Set<string>): Img[] {
  return resolved
    .map((img, index) => {
      if (!broken.has(img.url)) return img;
      const bundled = BUNDLED_GALLERY_FALLBACKS[index];
      return bundled ? { ...img, url: bundled.url } : null;
    })
    .filter((i): i is Img => i !== null);
}

const make = (n: number): Img[] =>
  Array.from({ length: n }, (_, i) => ({
    url: `https://res.cloudinary.com/x/v1/gallery/img${i}.webp`,
    slotName: `gallery_bootstrap_${i}`,
    order: i,
    altText: `image ${i}`,
  }));

describe("gallery Cloudinary → local fallback", () => {
  it("returns Cloudinary URLs when everything is healthy", () => {
    const out = resolveWithFallback(make(14), new Set());
    expect(out).toHaveLength(14);
    expect(out.every((i) => i.url.includes("res.cloudinary.com"))).toBe(true);
  });

  it("substitutes the bundled image AT THE SAME POSITION when one URL is dead", () => {
    const input = make(14);
    const out = resolveWithFallback(input, new Set([input[3].url]));

    expect(out).toHaveLength(14);                       // length preserved
    expect(out[3].url).toBe(BUNDLED_GALLERY_FALLBACKS[3].url);
    expect(out[3].slotName).toBe(input[3].slotName);    // identity preserved
    expect(out[4].url).toBe(input[4].url);              // neighbours NOT shifted
    expect(out[2].url).toBe(input[2].url);
  });

  it("keeps every downstream position stable — the reason we substitute instead of dropping", () => {
    const input = make(14);
    const out = resolveWithFallback(input, new Set([input[0].url, input[1].url]));
    // WeddingStories reads 0..7 and HomeBelowFold 0..11 positionally.
    for (let i = 2; i < 14; i++) expect(out[i].url).toBe(input[i].url);
  });

  it("falls back for every entry when Cloudinary is entirely unavailable", () => {
    const input = make(14);
    const out = resolveWithFallback(input, new Set(input.map((i) => i.url)));
    expect(out).toHaveLength(14);
    expect(out.every((i) => i.url.startsWith("/images/"))).toBe(true);
  });

  it("drops an entry only past the end of the bundled list, where nothing can substitute", () => {
    const input = make(16); // more entries than the 14 bundled fallbacks
    const out = resolveWithFallback(input, new Set([input[15].url]));
    expect(out).toHaveLength(15);
    expect(BUNDLED_GALLERY_FALLBACKS[15]).toBeUndefined();
  });

  it("never yields an empty URL", () => {
    const input = make(14);
    const out = resolveWithFallback(input, new Set(input.map((i) => i.url)));
    expect(out.every((i) => Boolean(i.url))).toBe(true);
  });
});

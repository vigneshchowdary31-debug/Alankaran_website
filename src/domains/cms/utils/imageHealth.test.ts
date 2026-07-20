import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getImageHealth,
  isImageBroken,
  probeImage,
  getBrokenImageUrls,
  __resetImageHealth,
} from "./imageHealth";

/**
 * Fake `Image` whose success/failure is driven by the URL, so a probe can be resolved
 * deterministically without any network access.
 */
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  #src = "";
  static loads = 0;
  set src(v: string) {
    this.#src = v;
    FakeImage.loads++;
    queueMicrotask(() => (v.includes("dead") ? this.onerror?.() : this.onload?.()));
  }
  get src() {
    return this.#src;
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  __resetImageHealth();
  FakeImage.loads = 0;
  vi.stubGlobal("window", { Image: FakeImage });
});

describe("optimistic by default", () => {
  it("treats an unprobed remote URL as healthy so there is no flash of fallback", () => {
    expect(getImageHealth("https://res.cloudinary.com/x/a.webp")).toBe("unknown");
    expect(isImageBroken("https://res.cloudinary.com/x/a.webp")).toBe(false);
  });

  it("never reports a local bundled path as broken", async () => {
    probeImage("/images/dead.webp");
    await flush();
    expect(isImageBroken("/images/dead.webp")).toBe(false);
    expect(FakeImage.loads).toBe(0); // local paths are not probed at all
  });

  it("treats empty input as healthy", () => {
    expect(isImageBroken("")).toBe(false);
  });
});

describe("probing", () => {
  it("marks a failing remote URL as broken", async () => {
    probeImage("https://res.cloudinary.com/x/dead.webp");
    await flush();
    expect(isImageBroken("https://res.cloudinary.com/x/dead.webp")).toBe(true);
  });

  it("marks a loading remote URL as healthy", async () => {
    probeImage("https://res.cloudinary.com/x/good.webp");
    await flush();
    expect(getImageHealth("https://res.cloudinary.com/x/good.webp")).toBe("healthy");
    expect(isImageBroken("https://res.cloudinary.com/x/good.webp")).toBe(false);
  });

  it("notifies the caller only when a URL turns out to be broken", async () => {
    const onChange = vi.fn();
    probeImage("https://res.cloudinary.com/x/good.webp", onChange);
    await flush();
    expect(onChange).not.toHaveBeenCalled();

    probeImage("https://res.cloudinary.com/x/dead.webp", onChange);
    await flush();
    expect(onChange).toHaveBeenCalledWith("https://res.cloudinary.com/x/dead.webp");
  });

  it("probes each URL exactly once no matter how many components request it", async () => {
    const url = "https://res.cloudinary.com/x/shared.webp";
    for (let i = 0; i < 25; i++) probeImage(url);
    await flush();
    expect(FakeImage.loads).toBe(1);
  });

  it("does not re-probe a URL already judged", async () => {
    const url = "https://res.cloudinary.com/x/dead.webp";
    probeImage(url);
    await flush();
    expect(FakeImage.loads).toBe(1);

    probeImage(url); // a later render
    await flush();
    expect(FakeImage.loads).toBe(1);
  });

  it("reports every broken URL for Diagnostics", async () => {
    probeImage("https://res.cloudinary.com/x/dead1.webp");
    probeImage("https://res.cloudinary.com/x/dead2.webp");
    probeImage("https://res.cloudinary.com/x/good.webp");
    await flush();
    expect(getBrokenImageUrls().sort()).toEqual([
      "https://res.cloudinary.com/x/dead1.webp",
      "https://res.cloudinary.com/x/dead2.webp",
    ]);
  });
});

describe("SSR safety", () => {
  it("skips probing when there is no window, and reports nothing broken", async () => {
    vi.stubGlobal("window", undefined);
    probeImage("https://res.cloudinary.com/x/dead.webp");
    await flush();
    // Pre-rendered HTML keeps the CMS URL; the client corrects it after hydration.
    expect(isImageBroken("https://res.cloudinary.com/x/dead.webp")).toBe(false);
  });
});

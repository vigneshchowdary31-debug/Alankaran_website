/**
 * Remote image health tracking.
 *
 * The CMS stores a Cloudinary URL in Firestore, but Firestore knows nothing about whether that asset
 * still exists. If an asset is removed, renamed, or Cloudinary has an outage, the stored URL 404s and
 * the page renders a broken image — the bundled fallback never engages, because a slot record DOES
 * exist and `getSlotImage` trusts it.
 *
 * This module closes that gap. Each distinct remote URL is probed exactly once per session with an
 * off-DOM `Image()` load. A URL that fails is recorded as broken, and the resolver then serves the
 * bundled local asset instead.
 *
 * Design notes:
 *
 * - **Optimistic.** A URL is treated as healthy until proven otherwise, so the happy path costs
 *   nothing and there is no flash of fallback content while probing.
 * - **Probed once.** Results are memoised per URL for the page's lifetime, so N components sharing a
 *   URL cause one probe, not N.
 * - **Browser only.** `Image()` does not exist during SSR pre-render, where every probe is skipped
 *   and every URL is considered healthy. The pre-rendered HTML therefore always carries the CMS URL,
 *   and the client corrects it after hydration if it turns out to be dead.
 * - **Local paths are never probed.** A bundled fallback is part of the deployed build; if it were
 *   missing, falling back to itself would achieve nothing.
 */

export type ImageHealth = "unknown" | "healthy" | "broken";

const health = new Map<string, ImageHealth>();
const inFlight = new Set<string>();

/** Remote URLs only — bundled assets ship with the build and are not worth a round trip. */
function isRemote(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** Current known health of a URL. Never triggers a probe. */
export function getImageHealth(url: string): ImageHealth {
  if (!url || !isRemote(url)) return "healthy";
  return health.get(url) ?? "unknown";
}

/** True only when a URL has been positively confirmed dead. */
export function isImageBroken(url: string): boolean {
  return getImageHealth(url) === "broken";
}

/**
 * Probes a URL once, invoking `onChange` if the verdict turns out to be "broken".
 *
 * Safe to call on every render: repeat calls for the same URL are ignored once a probe is in flight
 * or a verdict has been reached.
 */
export function probeImage(url: string, onChange?: (url: string) => void): void {
  if (typeof window === "undefined") return; // SSR pre-render
  if (!url || !isRemote(url)) return;
  if (health.has(url) || inFlight.has(url)) return;

  inFlight.add(url);
  const img = new window.Image();

  img.onload = () => {
    health.set(url, "healthy");
    inFlight.delete(url);
  };

  img.onerror = () => {
    health.set(url, "broken");
    inFlight.delete(url);
    if (import.meta.env.DEV) {
      console.warn(
        `[imageHealth] CMS image failed to load and will fall back to its bundled asset:\n  ${url}\n` +
          `The Firestore record points at an asset that no longer resolves.`
      );
    }
    onChange?.(url);
  };

  img.src = url;
}

/** Every URL confirmed broken this session — surfaced by Diagnostics. */
export function getBrokenImageUrls(): string[] {
  return Array.from(health.entries())
    .filter(([, v]) => v === "broken")
    .map(([k]) => k);
}

/** Test seam. Not used by application code. */
export function __resetImageHealth(): void {
  health.clear();
  inFlight.clear();
}

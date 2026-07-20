import type { CMSContactInfo, GlobalSettingField } from "../types";
import { GLOBAL_SETTING_FIELDS } from "./globalSettingsValidator";

/**
 * THE single implementation of global-settings publication state.
 *
 * Everything that needs to know "what is live?", "what is drafted?", or "is this field published?"
 * goes through this module — the editor, Diagnostics, `cms.service`, and `SiteContentProvider`.
 * Nothing else may compare draft against published, because two implementations of that question
 * will always eventually disagree (they did: Diagnostics counted non-empty fields while the editor
 * compared joined strings).
 *
 * ── The publication model ─────────────────────────────────────────────────
 *
 *   cmsSiteContent/contact
 *     .contact           — the working DRAFT (what the editor edits, what Save writes)
 *     .publishedContact  — the LIVE record (what the public website renders, what Publish writes)
 *
 * Precedence for "what is live", applied as a whole record:
 *
 *   publishedContact  →  contact (legacy)  →  DEFAULT_CONTACT_INFO (bundled)
 *
 * The `contact` step is backward-compatible read support, not a migration: `publishedContact` was
 * introduced after `contact`, and the provider has always fallen back to `contact`, so on a legacy
 * record the draft genuinely IS what visitors see. Resolving that at read time means there is no
 * migration to run, nothing to write on load, and no schema-version flag to carry.
 */

export type FieldStatus = "published" | "draft";

/** Where the live values came from — lets the UI say so instead of implying an admin published them. */
export type PublicationSource = "published" | "legacy" | "default";

export interface PublicationState {
  /** The working draft, or null when nothing has been saved. */
  draft: CMSContactInfo | null;
  /** The record the website actually renders. Never null. */
  live: CMSContactInfo;
  source: PublicationSource;
}

/**
 * Resolves draft and live records from a raw `cmsSiteContent/contact` document.
 * This is the ONLY place the `publishedContact → contact → defaults` precedence is expressed.
 */
export function resolvePublicationState(
  raw: any,
  defaults: CMSContactInfo
): PublicationState {
  const draft = (raw?.contact as CMSContactInfo) ?? null;
  const published = (raw?.publishedContact as CMSContactInfo) ?? null;

  if (published) return { draft, live: published, source: "published" };
  if (draft) return { draft, live: draft, source: "legacy" };
  return { draft: null, live: defaults, source: "default" };
}

/** Collapses insignificant whitespace so formatting-only edits never read as content changes. */
function normalizeScalar(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

/** True for the multi-value settings, which are edited one-per-line and stored as string[]. */
function isListField(field: GlobalSettingField): boolean {
  return field === "phones" || field === "emails";
}

/**
 * Normalized comparable form of one setting.
 *
 * Lists drop blank entries and stray padding but KEEP order: `phones` and `emails` render as ordered
 * lists on the Contact page and in the Footer, so which number appears first is real content. A
 * reorder is therefore a genuine change, not a false positive.
 */
export function normalizeSetting(field: GlobalSettingField, value: unknown): string {
  if (isListField(field)) {
    const list = Array.isArray(value) ? value : value == null ? [] : [value];
    return JSON.stringify(list.map(normalizeScalar).filter(Boolean));
  }
  return normalizeScalar(value);
}

/** True when a setting holds any meaningful value. */
export function isSettingConfigured(field: GlobalSettingField, value: unknown): boolean {
  const normalized = normalizeSetting(field, value);
  return isListField(field) ? normalized !== "[]" : normalized !== "";
}

/** The effective value of one field, falling back through draft → live. */
function effectiveDraftValue(
  field: GlobalSettingField,
  draft: Partial<CMSContactInfo> | null | undefined,
  live: CMSContactInfo
): unknown {
  const v = (draft as any)?.[field];
  return v === undefined || v === null ? (live as any)[field] : v;
}

/** The effective live value of one field, treating an absent/empty record as "falls back to live". */
function effectiveLiveValue(field: GlobalSettingField, live: CMSContactInfo): unknown {
  return (live as any)[field];
}

/**
 * Status of a single field: `draft` only when its normalized draft value differs from its normalized
 * live value. A field with no draft entry inherits the live value and is therefore published.
 */
export function getFieldStatus(
  field: GlobalSettingField,
  draft: Partial<CMSContactInfo> | null | undefined,
  live: CMSContactInfo
): FieldStatus {
  const draftValue = normalizeSetting(field, effectiveDraftValue(field, draft, live));
  const liveValue = normalizeSetting(field, effectiveLiveValue(field, live));
  return draftValue === liveValue ? "published" : "draft";
}

/** Status of every field, keyed by field name. */
export function getFieldStatuses(
  draft: Partial<CMSContactInfo> | null | undefined,
  live: CMSContactInfo
): Record<GlobalSettingField, FieldStatus> {
  const out = {} as Record<GlobalSettingField, FieldStatus>;
  for (const field of GLOBAL_SETTING_FIELDS) {
    out[field] = getFieldStatus(field, draft, live);
  }
  return out;
}

export interface GlobalSettingsStatusSummary {
  /** Fields holding a non-empty value. */
  configured: number;
  /** Fields whose draft differs from what is live. */
  draft: number;
  /** Fields whose draft matches what is live. */
  published: number;
  total: number;
}

/**
 * Aggregate counts. The editor header and the Diagnostics tile both call this, so the two cannot
 * disagree. `published + draft === total` always holds.
 */
export function buildGlobalSettingsStatus(
  draft: Partial<CMSContactInfo> | null | undefined,
  live: CMSContactInfo
): GlobalSettingsStatusSummary {
  const statuses = getFieldStatuses(draft, live);

  let configured = 0;
  let draftCount = 0;
  for (const field of GLOBAL_SETTING_FIELDS) {
    if (isSettingConfigured(field, effectiveDraftValue(field, draft, live))) configured++;
    if (statuses[field] === "draft") draftCount++;
  }

  return {
    configured,
    draft: draftCount,
    published: GLOBAL_SETTING_FIELDS.length - draftCount,
    total: GLOBAL_SETTING_FIELDS.length,
  };
}

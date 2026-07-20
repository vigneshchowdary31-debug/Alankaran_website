import type { CMSContactInfo, GlobalSettingField, GlobalSettingValidation } from "../types";

/**
 * Validation for the seven global text settings.
 *
 * These values are rendered into `tel:`, `mailto:`, and `href` attributes on every page, so a bad
 * value is not cosmetic — an empty phone list silently breaks every call button on the site. Each
 * rule below therefore rejects the specific shape that would produce a broken link, and nothing more.
 */

const PHONE_RE = /^\+?[\d\s()-]{6,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** URL must be https and on the expected host, so a typo cannot silently point users off-brand. */
function validateUrl(value: string, expectedHost: string, label: string): GlobalSettingValidation {
  if (!value?.trim()) return { valid: false, error: `${label} is required.` };
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { valid: false, error: `${label} must be a full URL including https://` };
  }
  if (parsed.protocol !== "https:") {
    return { valid: false, error: `${label} must use https://` };
  }
  if (!parsed.hostname.endsWith(expectedHost)) {
    return { valid: false, error: `${label} must be a ${expectedHost} link.` };
  }
  return { valid: true };
}

export function validateGlobalSetting(
  field: GlobalSettingField,
  value: unknown
): GlobalSettingValidation {
  switch (field) {
    case "phones": {
      const list = Array.isArray(value) ? value.filter((p) => String(p).trim()) : [];
      if (!list.length) {
        return { valid: false, error: "At least one phone number is required." };
      }
      const bad = list.find((p) => !PHONE_RE.test(String(p).trim()));
      if (bad) return { valid: false, error: `"${bad}" is not a valid phone number.` };
      return { valid: true };
    }

    case "emails": {
      const list = Array.isArray(value) ? value.filter((e) => String(e).trim()) : [];
      if (!list.length) {
        return { valid: false, error: "At least one email address is required." };
      }
      const bad = list.find((e) => !EMAIL_RE.test(String(e).trim()));
      if (bad) return { valid: false, error: `"${bad}" is not a valid email address.` };
      return { valid: true };
    }

    case "addressLine": {
      const s = String(value ?? "").trim();
      if (s.length < 10) {
        return { valid: false, error: "Address must be at least 10 characters." };
      }
      if (s.length > 300) return { valid: false, error: "Address must be under 300 characters." };
      return { valid: true };
    }

    case "mapQuery": {
      const s = String(value ?? "").trim();
      if (!s) return { valid: false, error: "Map query is required — the embedded map needs it." };
      // This is interpolated straight into a maps.google.com query string.
      if (/[<>"']/.test(s)) {
        return { valid: false, error: "Map query cannot contain < > \" or ' characters." };
      }
      return { valid: true };
    }

    case "whatsappNumber": {
      const s = String(value ?? "").trim();
      // wa.me / api.whatsapp.com require digits only, including country code, with no + or spaces.
      if (!/^\d{8,15}$/.test(s)) {
        return {
          valid: false,
          error: "WhatsApp number must be digits only including country code (e.g. 918977611886).",
        };
      }
      return { valid: true };
    }

    case "instagramUrl":
      return validateUrl(String(value ?? ""), "instagram.com", "Instagram URL");

    case "facebookUrl":
      return validateUrl(String(value ?? ""), "facebook.com", "Facebook URL");

    default:
      return { valid: true };
  }
}

/** The seven fields the admin editor exposes, in render order. */
export const GLOBAL_SETTING_FIELDS: GlobalSettingField[] = [
  "phones",
  "emails",
  "whatsappNumber",
  "addressLine",
  "mapQuery",
  "instagramUrl",
  "facebookUrl",
];

/** Validates every editable field. Returns a per-field error map; empty means valid. */
export function validateGlobalSettings(info: Partial<CMSContactInfo>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of GLOBAL_SETTING_FIELDS) {
    const result = validateGlobalSetting(field, (info as any)[field]);
    if (!result.valid && result.error) errors[field] = result.error;
  }
  return errors;
}

export const TOTAL_GLOBAL_SETTINGS = GLOBAL_SETTING_FIELDS.length;

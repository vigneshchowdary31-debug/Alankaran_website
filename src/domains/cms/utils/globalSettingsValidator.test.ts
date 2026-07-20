import { describe, it, expect } from "vitest";
import {
  validateGlobalSetting,
  validateGlobalSettings,
  GLOBAL_SETTING_FIELDS,
  TOTAL_GLOBAL_SETTINGS,
} from "./globalSettingsValidator";
import { DEFAULT_CONTACT_INFO } from "../constants";

describe("global settings validation", () => {
  it("covers exactly the 7 settings the website renders", () => {
    expect(TOTAL_GLOBAL_SETTINGS).toBe(7);
    expect(GLOBAL_SETTING_FIELDS).toEqual([
      "phones",
      "emails",
      "whatsappNumber",
      "addressLine",
      "mapQuery",
      "instagramUrl",
      "facebookUrl",
    ]);
  });

  it("accepts the shipped defaults", () => {
    expect(validateGlobalSettings(DEFAULT_CONTACT_INFO)).toEqual({});
  });

  describe("phones", () => {
    it("rejects an empty list — it would break every tel: link on the site", () => {
      expect(validateGlobalSetting("phones", []).valid).toBe(false);
      expect(validateGlobalSetting("phones", [""]).valid).toBe(false);
    });
    it("accepts valid formats", () => {
      expect(validateGlobalSetting("phones", ["+91 89776 11886"]).valid).toBe(true);
      expect(validateGlobalSetting("phones", ["08977611886", "+1 (555) 123-4567"]).valid).toBe(true);
    });
    it("rejects letters", () => {
      expect(validateGlobalSetting("phones", ["call-us-now"]).valid).toBe(false);
    });
  });

  describe("emails", () => {
    it("rejects an empty list", () => {
      expect(validateGlobalSetting("emails", []).valid).toBe(false);
    });
    it("accepts valid addresses and rejects malformed ones", () => {
      expect(validateGlobalSetting("emails", ["a@b.com"]).valid).toBe(true);
      expect(validateGlobalSetting("emails", ["not-an-email"]).valid).toBe(false);
      expect(validateGlobalSetting("emails", ["a@b"]).valid).toBe(false);
      expect(validateGlobalSetting("emails", ["a@b.com", "bad@"]).valid).toBe(false);
    });
  });

  describe("whatsappNumber", () => {
    it("requires digits only with country code", () => {
      expect(validateGlobalSetting("whatsappNumber", "918977611886").valid).toBe(true);
    });
    it("rejects a leading + or spaces, which break the wa.me deep link", () => {
      expect(validateGlobalSetting("whatsappNumber", "+918977611886").valid).toBe(false);
      expect(validateGlobalSetting("whatsappNumber", "91 8977 611886").valid).toBe(false);
    });
    it("rejects too-short numbers", () => {
      expect(validateGlobalSetting("whatsappNumber", "12345").valid).toBe(false);
    });
  });

  describe("addressLine", () => {
    it("requires a plausible length", () => {
      expect(validateGlobalSetting("addressLine", "short").valid).toBe(false);
      expect(validateGlobalSetting("addressLine", "Plot 78, Gachibowli, Hyderabad").valid).toBe(true);
      expect(validateGlobalSetting("addressLine", "x".repeat(301)).valid).toBe(false);
    });
  });

  describe("mapQuery", () => {
    it("requires a value and rejects characters that break the query string", () => {
      expect(validateGlobalSetting("mapQuery", "").valid).toBe(false);
      expect(validateGlobalSetting("mapQuery", "Alankaran+Hyderabad").valid).toBe(true);
      expect(validateGlobalSetting("mapQuery", 'Alankaran"><script>').valid).toBe(false);
    });
  });

  describe("social URLs", () => {
    it("requires https and the correct host", () => {
      expect(validateGlobalSetting("instagramUrl", "https://www.instagram.com/x").valid).toBe(true);
      expect(validateGlobalSetting("facebookUrl", "https://www.facebook.com/x").valid).toBe(true);
    });
    it("rejects http, a wrong host, and a bare handle", () => {
      expect(validateGlobalSetting("instagramUrl", "http://instagram.com/x").valid).toBe(false);
      expect(validateGlobalSetting("instagramUrl", "https://twitter.com/x").valid).toBe(false);
      expect(validateGlobalSetting("instagramUrl", "@alankaranevents").valid).toBe(false);
      expect(validateGlobalSetting("facebookUrl", "").valid).toBe(false);
    });
    it("does not let an instagram URL pass as facebook", () => {
      expect(validateGlobalSetting("facebookUrl", "https://www.instagram.com/x").valid).toBe(false);
    });
  });

  it("returns a per-field error map", () => {
    const errors = validateGlobalSettings({
      ...DEFAULT_CONTACT_INFO,
      phones: [],
      instagramUrl: "nope",
    });
    expect(Object.keys(errors).sort()).toEqual(["instagramUrl", "phones"]);
  });
});

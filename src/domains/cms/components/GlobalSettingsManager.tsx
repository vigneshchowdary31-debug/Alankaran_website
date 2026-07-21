import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Save, UploadCloud, History, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button, Card, StatusBadge } from "@/components/admin/ui";
import { SlotManager } from "./SlotManager";
import { cmsService } from "../services/cms.service";
import { DEFAULT_CONTACT_INFO } from "../constants";
import { validateGlobalSetting, TOTAL_GLOBAL_SETTINGS } from "../utils/globalSettingsValidator";
import {
  getFieldStatuses,
  buildGlobalSettingsStatus,
  type PublicationSource,
} from "../utils/globalSettingsDiff";
import type { CMSContactInfo, GlobalSettingField, CMSVersionSnapshot } from "../types";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";

interface FieldSpec {
  field: GlobalSettingField;
  label: string;
  hint: string;
  /** Multi-value fields are edited as one-per-line and stored as string[]. */
  list?: boolean;
  placeholder: string;
}

/**
 * Only the seven settings that the website actually renders. Every entry here was confirmed to have
 * a live consumer during the audit — nothing speculative.
 */
const FIELDS: FieldSpec[] = [
  {
    field: "phones",
    label: "Phone Numbers",
    hint: "One per line. Rendered as tel: links in the Footer and on the Contact page.",
    list: true,
    placeholder: "+91 89776 11886",
  },
  {
    field: "emails",
    label: "Email Addresses",
    hint: "One per line. Rendered as mailto: links in the Footer and on the Contact page.",
    list: true,
    placeholder: "chaitanya@alankaran.com",
  },
  {
    field: "whatsappNumber",
    label: "WhatsApp Number",
    hint: "Digits only, including country code. Drives the floating WhatsApp button and Footer icon.",
    placeholder: "918977611886",
  },
  {
    field: "addressLine",
    label: "Address",
    hint: "Full postal address. Shown on the Contact page and used for the Footer directions link.",
    placeholder: "Plot no: 78, …, Hyderabad, Telangana 500046",
  },
  {
    field: "mapQuery",
    label: "Google Maps Query",
    hint: "The search term used by the embedded map on the Contact page.",
    placeholder: "Alankaran+Events+Hyderabad",
  },
  {
    field: "instagramUrl",
    label: "Instagram URL",
    hint: "Footer and Contact page social icons.",
    placeholder: "https://www.instagram.com/alankaranevents",
  },
  {
    field: "facebookUrl",
    label: "Facebook URL",
    hint: "Footer and Contact page social icons.",
    placeholder: "https://www.facebook.com/alankaranevents",
  },
];

const toEditable = (info: Partial<CMSContactInfo>, spec: FieldSpec): string => {
  const v = (info as any)[spec.field];
  if (spec.list) return Array.isArray(v) ? v.join("\n") : "";
  return String(v ?? "");
};

const fromEditable = (raw: string, spec: FieldSpec): string | string[] =>
  spec.list ? raw.split("\n").map((s) => s.trim()).filter(Boolean) : raw.trim();

/**
 * Global Website Settings editor.
 *
 * Follows the same Draft → Publish contract as image slots: Save writes the draft, Publish copies it
 * to `publishedContact` and snapshots a version. The public site renders only published values.
 */
export function GlobalSettingsManager() {
  const { currentUser } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [live, setLive] = useState<CMSContactInfo>(DEFAULT_CONTACT_INFO);
  const [source, setSource] = useState<PublicationSource>("default");
  const [history, setHistory] = useState<CMSVersionSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { draft, live: liveRecord, source: src } = await cmsService.loadGlobalSettings();
      const base = draft || liveRecord;
      const next: Record<string, string> = {};
      for (const spec of FIELDS) next[spec.field] = toEditable(base, spec);
      setValues(next);
      setLive(liveRecord);
      setSource(src);
      setDirty(false);
      setHistory(await cmsService.getGlobalSettingsHistory());
    } catch (err: any) {
      showError("Could not load settings", err?.message || "Unknown error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleChange = (spec: FieldSpec, raw: string) => {
    setValues((prev) => ({ ...prev, [spec.field]: raw }));
    setDirty(true);
    const result = validateGlobalSetting(spec.field, fromEditable(raw, spec));
    setErrors((prev) => {
      const next = { ...prev };
      if (result.valid) delete next[spec.field];
      else next[spec.field] = result.error!;
      return next;
    });
  };

  const buildPayload = (): Partial<CMSContactInfo> => {
    const payload: Record<string, unknown> = {};
    for (const spec of FIELDS) payload[spec.field] = fromEditable(values[spec.field] ?? "", spec);
    return payload as Partial<CMSContactInfo>;
  };

  const handleSave = async () => {
    if (saving || Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      await cmsService.saveGlobalSettings(buildPayload(), currentUser?.email || "admin@alankaran.com");
      setDirty(false);
      showSuccess("Draft Saved", "Global settings saved. Publish to push them to the live website.");
    } catch (err: any) {
      showError("Save Failed", err?.message || "Could not save global settings.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      if (dirty) {
        await cmsService.saveGlobalSettings(buildPayload(), currentUser?.email || "admin@alankaran.com");
        setDirty(false);
      }
      const publishedNow = await cmsService.publishGlobalSettings(currentUser?.email || "admin@alankaran.com");
      setLive(publishedNow);
      setSource("published");
      setHistory(await cmsService.getGlobalSettingsHistory());
      showSuccess("Published", "Global settings are now live across the website.");
    } catch (err: any) {
      showError("Publish Failed", err?.message || "Could not publish global settings.");
    } finally {
      setPublishing(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    try {
      await cmsService.restoreGlobalSettingsVersion(versionId, currentUser?.email || "admin@alankaran.com");
      await load();
      showSuccess("Version Restored", "Restored into the draft. Review it, then Publish.");
    } catch (err: any) {
      showError("Restore Failed", err?.message || "Could not restore that version.");
    }
  };

  // Status is derived from what is CURRENTLY in the editor, not from the snapshot loaded at mount,
  // so a badge flips the moment a field is edited and flips back if the edit is undone.
  const currentDraft = buildPayload();
  const fieldStatuses = getFieldStatuses(currentDraft, live);
  const status = buildGlobalSettingsStatus(currentDraft, live);
  const configured = status.configured;
  const hasErrors = Object.keys(errors).length > 0;

  if (loading) {
    return (
      <Card className="bg-black/30 border-gold/25 rounded-2xl p-10 flex items-center justify-center gap-3">
        <Loader2 className="size-5 animate-spin text-gold" />
        <span className="font-sans text-sm text-stone-400">Loading global settings…</span>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Branding ── */}
      <section className="pb-8 border-b border-stone-800/60">
        <h2 className="font-serif text-2xl text-white/90">Branding</h2>
        <p className="text-[13px] text-white/55 mt-1 mb-5 max-w-xl">
          Upload your website logo, shown in the header and footer. PNG or SVG with a transparent
          background works best.
        </p>
        <div className="max-w-sm">
          <SlotManager
            sectionKey="contact"
            slotName="site_logo"
            label="Website Logo"
            description="Transparent PNG or SVG, at least 200 × 230 px."
          />
        </div>
      </section>

      {/* ── Text settings — grouped, one form only ── */}
      {source !== "published" && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-sky-900/50 bg-sky-950/25 text-[13px] text-sky-300">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>These are your current live values. Save and publish to store any changes.</span>
        </div>
      )}

      {[
        { title: "Contact Information", fields: ["phones", "emails", "whatsappNumber"] },
        { title: "Address", fields: ["addressLine", "mapQuery"] },
        { title: "Social Media", fields: ["instagramUrl", "facebookUrl"] },
      ].map((group) => (
        <section key={group.title} className="pb-8 border-b border-stone-800/60 last:border-b-0">
          <h2 className="font-serif text-2xl text-white/90 mb-5">{group.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
            {FIELDS.filter((f) => group.fields.includes(f.field)).map((spec) => {
              const error = errors[spec.field];
              const fullWidth = spec.list || spec.field === "addressLine" || spec.field === "mapQuery";
              const inputClass = `w-full bg-black/50 border rounded-xl px-3.5 py-2.5 text-sm text-white/90 placeholder:text-white/40 outline-none transition-colors duration-150 ${
                error ? "border-rose-700 focus:border-rose-500" : "border-stone-700 focus:border-gold"
              }`;
              return (
                <div key={spec.field} className={`${fullWidth ? "md:col-span-2" : ""} space-y-2`}>
                  <label htmlFor={`gs-${spec.field}`} className="block text-[13px] font-medium text-white/80">
                    {spec.label}
                  </label>
                  {spec.list ? (
                    <textarea
                      id={`gs-${spec.field}`}
                      value={values[spec.field] ?? ""}
                      onChange={(e) => handleChange(spec, e.target.value)}
                      rows={2}
                      placeholder={spec.placeholder}
                      className={inputClass}
                    />
                  ) : (
                    <input
                      id={`gs-${spec.field}`}
                      value={values[spec.field] ?? ""}
                      onChange={(e) => handleChange(spec, e.target.value)}
                      placeholder={spec.placeholder}
                      className={inputClass}
                    />
                  )}
                  <p className={`text-[12px] ${error ? "text-rose-400" : "text-white/45"}`}>
                    {error || spec.hint}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* ── Version history (opens above the sticky footer) ── */}
      {showHistory && (
        <section className="rounded-2xl border border-stone-800/70 bg-black/20 p-5 space-y-2">
          <h3 className="font-serif text-base text-white/90 mb-1">Version History</h3>
          {history.length === 0 ? (
            <p className="text-[13px] text-white/55">
              No published versions yet. Publishing saves a version you can restore later.
            </p>
          ) : (
            history.map((v) => (
              <div key={v.versionId} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-stone-800 bg-stone-900/40">
                <div className="min-w-0">
                  <p className="text-[13px] text-white/85">
                    {new Date(v.timestamp).toLocaleString()}
                  </p>
                  <p className="text-[12px] text-white/45">by {v.user}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleRestore(v.versionId)} className="gap-1.5 text-[13px] shrink-0 focus-visible:ring-2 focus-visible:ring-gold/60">
                  <RotateCcw className="size-3.5 text-emerald-400" />
                  <span>Restore</span>
                </Button>
              </div>
            ))
          )}
        </section>
      )}

      {/* ── Sticky action footer ── */}
      <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-3 bg-stone-950/85 border border-stone-800/80 rounded-2xl px-4 py-3 backdrop-blur-md">
        {hasErrors ? (
          <span className="flex items-center gap-1.5 text-[13px] text-rose-400">
            <AlertTriangle className="size-4" /> Fix {Object.keys(errors).length} field(s) to publish
          </span>
        ) : dirty ? (
          <StatusBadge tone="draft" dot>Unsaved changes</StatusBadge>
        ) : status.draft > 0 ? (
          <StatusBadge tone="draft" dot>Draft</StatusBadge>
        ) : (
          <StatusBadge tone="published" dot>Published</StatusBadge>
        )}

        <div className="flex-1" />

        <Button size="sm" variant="outline" onClick={() => setShowHistory((s) => !s)} className="gap-2 text-[13px] focus-visible:ring-2 focus-visible:ring-gold/60">
          <History className="size-4" />
          <span className="hidden sm:inline">History ({history.length})</span>
        </Button>
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving || publishing || hasErrors || !dirty} className="gap-2 text-[13px] focus-visible:ring-2 focus-visible:ring-gold/60">
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          <span>Save Draft</span>
        </Button>
        <Button size="sm" onClick={handlePublish} disabled={saving || publishing || hasErrors} className="gap-2 text-[13px] bg-gold text-nizami-dark hover:bg-gold-light font-semibold focus-visible:ring-2 focus-visible:ring-gold/60">
          {publishing ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
          <span>Publish</span>
        </Button>
      </div>
    </div>
  );
}

export default GlobalSettingsManager;

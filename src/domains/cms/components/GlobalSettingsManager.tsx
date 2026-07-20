import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Save, UploadCloud, History, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/admin/ui";
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
      {/* ── Logo ── */}
      <Card className="bg-black/30 border-gold/25 rounded-2xl p-6">
        <CardHeader className="p-0 mb-5 border-b border-stone-800/80 pb-4">
          <CardTitle className="font-serif text-xl text-stone-100 font-normal">Website Logo</CardTitle>
          <CardDescription className="text-xs font-sans text-stone-400 mt-1">
            Replaces the built-in vector mark in the Navbar (desktop + mobile) and Footer. Leave empty
            to keep the built-in logo. Uses the same upload, Draft/Publish, Trash and Activity Log
            pipeline as every other image slot.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <SlotManager
            sectionKey="contact"
            slotName="site_logo"
            label="Website Logo"
            description="Transparent PNG or SVG, at least 200 × 230 px."
          />
        </CardContent>
      </Card>

      {/* ── Text settings ── */}
      <Card className="bg-black/30 border-gold/25 rounded-2xl p-6">
        <CardHeader className="p-0 mb-5 border-b border-stone-800/80 pb-4 flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="font-serif text-xl text-stone-100 font-normal">
              Global Text Settings
            </CardTitle>
            <CardDescription className="text-xs font-sans text-stone-400 mt-1">
              One source of truth for every phone number, email, WhatsApp link, address, map and
              social link on the website. Firestore: <code className="font-mono text-gold">cmsSiteContent/contact</code>
            </CardDescription>
          </div>
          <span className="text-[11px] font-mono px-2 py-1 rounded border border-stone-700 bg-stone-900 text-stone-300 shrink-0">
            {configured}/{TOTAL_GLOBAL_SETTINGS} configured ·{" "}
            <span className="text-emerald-400">{status.published} published</span>
            {status.draft > 0 && <span className="text-amber-400"> · {status.draft} draft</span>}
          </span>
        </CardHeader>

        {/* Where the live values come from. Without this, "published" on a fresh install would
            imply an admin approved them, when they are really the bundled defaults. */}
        {source !== "published" && (
          <div className="mb-5 px-3 py-2 rounded-lg border border-sky-900/60 bg-sky-950/30 text-[11px] font-sans text-sky-300 flex items-start gap-2">
            <CheckCircle2 className="size-3.5 mt-0.5 shrink-0" />
            <span>
              {source === "default" ? (
                <>
                  These are the <strong>bundled default values</strong> — they are what the website
                  is serving right now, so they are shown as published. Save and Publish to store
                  them in the CMS.
                </>
              ) : (
                <>
                  These values were saved before the publish workflow existed. They are{" "}
                  <strong>already live</strong> on the website, so they are shown as published. Your
                  next Publish records them as a restorable version.
                </>
              )}
            </span>
          </div>
        )}

        <CardContent className="p-0 space-y-5">
          {FIELDS.map((spec) => {
            const error = errors[spec.field];
            const isDraft = fieldStatuses[spec.field] === "draft";

            return (
              <div key={spec.field} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-sans text-xs text-stone-200 font-medium">{spec.label}</label>
                  {isDraft ? (
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/60">
                      draft
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/50">
                      published
                    </span>
                  )}
                </div>

                {spec.list ? (
                  <textarea
                    value={values[spec.field] ?? ""}
                    onChange={(e) => handleChange(spec, e.target.value)}
                    rows={3}
                    placeholder={spec.placeholder}
                    className={`w-full bg-black/60 border rounded-lg px-3 py-2 text-xs font-mono text-stone-200 outline-none transition-colors ${
                      error ? "border-rose-800 focus:border-rose-600" : "border-stone-700 focus:border-gold"
                    }`}
                  />
                ) : (
                  <input
                    value={values[spec.field] ?? ""}
                    onChange={(e) => handleChange(spec, e.target.value)}
                    placeholder={spec.placeholder}
                    className={`w-full bg-black/60 border rounded-lg px-3 py-2 text-xs font-mono text-stone-200 outline-none transition-colors ${
                      error ? "border-rose-800 focus:border-rose-600" : "border-stone-700 focus:border-gold"
                    }`}
                  />
                )}

                <p className={`text-[10px] font-sans ${error ? "text-rose-400" : "text-stone-500"}`}>
                  {error || spec.hint}
                </p>
              </div>
            );
          })}
        </CardContent>

        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-stone-800/80">
          <Button size="sm" onClick={handleSave} disabled={saving || publishing || hasErrors || !dirty} className="gap-2 text-xs">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span>Save Draft</span>
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={saving || publishing || hasErrors}
            className="gap-2 text-xs bg-emerald-900 hover:bg-emerald-800 text-emerald-50"
          >
            {publishing ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
            <span>Publish to Website</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowHistory((s) => !s)} className="gap-2 text-xs">
            <History className="size-3.5" />
            <span>Version History ({history.length})</span>
          </Button>

          <div className="flex-1" />

          {hasErrors ? (
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400">
              <AlertTriangle className="size-3.5" /> Fix {Object.keys(errors).length} error(s) to publish
            </span>
          ) : dirty ? (
            <span className="text-[11px] font-mono text-amber-400">Unsaved changes</span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
              <CheckCircle2 className="size-3.5" /> Draft saved
            </span>
          )}
        </div>

        {showHistory && (
          <div className="mt-4 pt-4 border-t border-stone-800/80 space-y-2">
            {history.length === 0 ? (
              <p className="font-sans text-xs text-stone-500">
                No published versions yet. Publishing creates a restorable snapshot.
              </p>
            ) : (
              history.map((v) => (
                <div key={v.versionId} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-stone-800 bg-stone-900/40">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-stone-200 truncate">{v.versionId}</p>
                    <p className="font-sans text-[10px] text-stone-500">
                      {new Date(v.timestamp).toLocaleString()} by {v.user}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleRestore(v.versionId)} className="gap-1.5 text-[11px] shrink-0">
                    <RotateCcw className="size-3 text-emerald-400" />
                    <span>Restore</span>
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default GlobalSettingsManager;

import React, { useCallback, useEffect, useState } from "react";
import {
  Plus, Trash2, RotateCcw, Copy, GripVertical, ChevronDown, ChevronUp,
  Save, UploadCloud, Loader2, Archive,
} from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input } from "@/components/admin/ui";
import { ImageUpload } from "@/components/admin/ui/upload/ImageUpload";
import { weddingStoriesService } from "@/domains/cms/services/weddingStories.service";
import type {
  WeddingStory, WeddingStoriesHero, WeddingStoryImage,
} from "@/domains/cms/types/weddingStories.types";
import type { ImageAsset } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";

const POSITION_LABELS = ["Main (large)", "Grid — large", "Grid — small top", "Grid — small bottom"];

function toImageAsset(img: WeddingStoryImage | null, slotName: string): ImageAsset | null {
  if (!img) return null;
  return {
    id: img.cloudinaryId, sectionKey: "wedding-stories", slotName,
    cloudinaryId: img.cloudinaryId, url: img.url, altText: img.altText || "",
    width: img.width, height: img.height, format: img.format,
    updatedAt: Date.now(), updatedBy: "admin@alankaran.com",
  };
}

function toStoryImage(asset: ImageAsset): WeddingStoryImage {
  return {
    url: asset.url, cloudinaryId: asset.cloudinaryId,
    width: asset.width, height: asset.height, format: asset.format, altText: asset.altText,
  };
}

/**
 * Wedding Stories admin manager — hero editor + reorderable story repeater.
 *
 * Reuses `ImageUpload` for every image (same Cloudinary pipeline as the rest of the CMS),
 * `weddingStoriesService` for persistence, and the admin design-system components. No new admin
 * architecture: this is a single page mounted inside the existing `AdminLayout`.
 */
export function WeddingStoriesManager() {
  const { currentUser } = useAuth();
  const actor = currentUser?.email || "admin@alankaran.com";

  const [hero, setHero] = useState<WeddingStoriesHero | null>(null);
  const [stories, setStories] = useState<WeddingStory[]>([]);
  const [archived, setArchived] = useState<WeddingStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [h, list, arch] = await Promise.all([
      weddingStoriesService.getHero(),
      weddingStoriesService.listStories(),
      weddingStoriesService.listArchived(),
    ]);
    setHero(h);
    setStories(list);
    setArchived(arch);
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  // ── Hero ──────────────────────────────────────────────────────────────
  const patchHero = (patch: Partial<WeddingStoriesHero>) =>
    setHero((h) => (h ? { ...h, ...patch } : h));

  const saveHero = async (publish: boolean) => {
    if (!hero) return;
    setBusy(true);
    try {
      await weddingStoriesService.saveHero(hero, actor);
      if (publish) await weddingStoriesService.publishHero(actor);
      await reload();
      showSuccess(publish ? "Hero Published" : "Hero Saved", publish ? "Live on the website." : "Draft saved.");
    } catch (e: any) {
      showError("Hero Save Failed", e?.message || "Could not save hero.");
    } finally { setBusy(false); }
  };

  // ── Stories ───────────────────────────────────────────────────────────
  const addStory = async () => {
    setBusy(true);
    try {
      const story = weddingStoriesService.emptyStory(stories.length);
      await weddingStoriesService.saveStory(story, actor);
      await reload();
      setExpandedId(story.id);
      // Scroll the new editor into view on the next paint.
      requestAnimationFrame(() => document.getElementById(`story-${story.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } catch (e: any) {
      showError("Could not add story", e?.message || "");
    } finally { setBusy(false); }
  };

  const patchStory = (id: string, patch: Partial<WeddingStory>) =>
    setStories((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const setStoryImage = (id: string, index: number, asset: ImageAsset | null) =>
    setStories((list) => list.map((s) => {
      if (s.id !== id) return s;
      const images = [...s.images];
      images[index] = asset ? toStoryImage(asset) : null;
      return { ...s, images };
    }));

  const saveStory = async (story: WeddingStory, publish: boolean) => {
    setBusy(true);
    try {
      await weddingStoriesService.saveStory(story, actor);
      if (publish) await weddingStoriesService.publishStory(story.id, actor);
      await reload();
      showSuccess(publish ? "Story Published" : "Story Saved", `${story.bride} & ${story.groom}`.trim());
    } catch (e: any) {
      showError("Save Failed", e?.message || "");
    } finally { setBusy(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); await reload(); showSuccess(ok, ""); }
    catch (e: any) { showError("Action Failed", e?.message || ""); }
    finally { setBusy(false); }
  };

  // ── Drag reorder ──────────────────────────────────────────────────────
  const onDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = stories.map((s) => s.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setStories((list) => ids.map((id) => list.find((s) => s.id === id)!)); // optimistic
    setDragId(null);
    await act(() => weddingStoriesService.reorder(ids, actor), "Order Updated");
  };

  if (loading) {
    return <Card className="p-10 flex items-center justify-center gap-3 bg-black/30 border-gold/25 rounded-2xl">
      <Loader2 className="size-5 animate-spin text-gold" /><span className="text-sm text-stone-400">Loading…</span>
    </Card>;
  }

  return (
    <div className="space-y-8">
      {/* ── Hero editor ── */}
      {hero && (
        <Card className="bg-black/30 border-gold/25 rounded-2xl p-6">
          <CardHeader className="p-0 mb-5 border-b border-stone-800/80 pb-4">
            <CardTitle className="font-serif text-xl text-stone-100 font-normal">Hero Section</CardTitle>
            <CardDescription className="text-xs text-stone-400 mt-1">The top banner of the Wedding Stories page.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ImageUpload
              sectionKey="wedding-stories" slotName="hero"
              label="Hero Background Image" description="Recommended 1920×1080."
              initialAsset={toImageAsset(hero.image, "hero")}
              onUploadSuccess={(a) => patchHero({ image: toStoryImage(a) })}
              onRemoveSuccess={() => patchHero({ image: null })}
            />
            <div className="space-y-3">
              <Field label="Subtitle" value={hero.subtitle} onChange={(v) => patchHero({ subtitle: v })} />
              <Field label="Title Line 1" value={hero.titleLine1} onChange={(v) => patchHero({ titleLine1: v })} />
              <Field label="Title Line 2" value={hero.titleLine2} onChange={(v) => patchHero({ titleLine2: v })} />
              <div>
                <label className="text-xs text-stone-300 font-medium">Overlay Opacity — {hero.overlayOpacity.toFixed(2)}</label>
                <input type="range" min={0} max={1.5} step={0.05} value={hero.overlayOpacity}
                  onChange={(e) => patchHero({ overlayOpacity: Number(e.target.value) })}
                  className="w-full accent-gold mt-1" />
                <p className="text-[10px] text-stone-500">1.00 = current look. Multiplies the existing gradient.</p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" disabled={busy} onClick={() => saveHero(false)} className="gap-2 text-xs"><Save className="size-3.5" />Save Draft</Button>
                <Button size="sm" disabled={busy} onClick={() => saveHero(true)} className="gap-2 text-xs bg-emerald-900 hover:bg-emerald-800 text-emerald-50"><UploadCloud className="size-3.5" />Publish Hero</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Stories repeater ── */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-stone-100">Wedding Stories ({stories.length})</h2>
        <Button size="sm" disabled={busy} onClick={addStory} className="gap-2 text-xs"><Plus className="size-4" />Add Story</Button>
      </div>

      <div className="space-y-3">
        {stories.map((s) => (
          <Card key={s.id} id={`story-${s.id}`}
            draggable
            onDragStart={() => setDragId(s.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(s.id)}
            className={`bg-black/30 border rounded-2xl overflow-hidden ${dragId === s.id ? "border-gold" : "border-stone-800/80"}`}>
            <div className="flex items-center gap-3 p-4">
              <GripVertical className="size-4 text-stone-500 cursor-grab shrink-0" aria-label="Drag to reorder" />
              <div className="flex-1 min-w-0">
                <p className="font-serif text-base text-stone-100 truncate">
                  {`${s.bride} & ${s.groom}`.trim().replace(/^&\s*|\s*&$/g, "") || "Untitled story"}
                </p>
                <p className="text-[11px] text-stone-500">{[s.month, s.year].filter(Boolean).join(" ")} · {s.location || "—"}</p>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                s.status === "published" ? "text-emerald-400 border-emerald-800 bg-emerald-950/40"
                : "text-amber-400 border-amber-800 bg-amber-950/40"}`}>{s.status}</span>
              <div className="flex items-center gap-1 shrink-0">
                <IconBtn title="Duplicate" onClick={() => act(() => weddingStoriesService.duplicateStory(s.id, actor), "Duplicated")}><Copy className="size-3.5" /></IconBtn>
                <IconBtn title="Delete" onClick={() => act(() => weddingStoriesService.archiveStory(s.id, actor), "Moved to Trash")}><Trash2 className="size-3.5 text-rose-400" /></IconBtn>
                <IconBtn title={expandedId === s.id ? "Collapse" : "Edit"} onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                  {expandedId === s.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </IconBtn>
              </div>
            </div>

            {expandedId === s.id && (
              <div className="border-t border-stone-800/80 p-5 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Bride" value={s.bride} onChange={(v) => patchStory(s.id, { bride: v })} />
                  <Field label="Groom" value={s.groom} onChange={(v) => patchStory(s.id, { groom: v })} />
                  <Field label="Month" value={s.month} onChange={(v) => patchStory(s.id, { month: v })} />
                  <Field label="Year" value={s.year} onChange={(v) => patchStory(s.id, { year: v })} />
                  <Field label="Location" value={s.location} onChange={(v) => patchStory(s.id, { location: v })} />
                  <Field label="Theme" value={s.theme} onChange={(v) => patchStory(s.id, { theme: v })} />
                  <Field label="Palette" value={s.palette} onChange={(v) => patchStory(s.id, { palette: v })} className="col-span-2" />
                </div>
                <TextArea label="Paragraph 1 (max 600)" value={s.paragraph1} maxLength={600} onChange={(v) => patchStory(s.id, { paragraph1: v })} />
                <TextArea label="Paragraph 2 (max 600)" value={s.paragraph2} maxLength={600} onChange={(v) => patchStory(s.id, { paragraph2: v })} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[0, 1, 2, 3].map((idx) => (
                    <ImageUpload key={idx}
                      sectionKey="wedding-stories" slotName={`${s.id}_img${idx}`}
                      label={`Image ${idx + 1} — ${POSITION_LABELS[idx]}`}
                      initialAsset={toImageAsset(s.images[idx], `${s.id}_img${idx}`)}
                      onUploadSuccess={(a) => setStoryImage(s.id, idx, a)}
                      onRemoveSuccess={() => setStoryImage(s.id, idx, null)}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" disabled={busy} onClick={() => saveStory(s, false)} className="gap-2 text-xs"><Save className="size-3.5" />Save Draft</Button>
                  <Button size="sm" disabled={busy} onClick={() => saveStory(s, true)} className="gap-2 text-xs bg-emerald-900 hover:bg-emerald-800 text-emerald-50"><UploadCloud className="size-3.5" />Publish</Button>
                  {s.status === "published" && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => weddingStoriesService.setStatus(s.id, "draft", actor), "Unpublished")} className="text-xs">Unpublish</Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
        {stories.length === 0 && <p className="text-sm text-stone-500 py-6 text-center">No stories yet. Click <strong>Add Story</strong> to create one.</p>}
      </div>

      {/* ── Trash ── */}
      {archived.length > 0 && (
        <Card className="bg-black/20 border-stone-800/60 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3"><Archive className="size-4 text-stone-400" /><h3 className="font-serif text-base text-stone-300">Trash ({archived.length})</h3></div>
          <div className="space-y-2">
            {archived.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-stone-800 bg-stone-900/40">
                <span className="text-sm text-stone-300">{`${s.bride} & ${s.groom}`.trim().replace(/^&\s*|\s*&$/g, "") || "Untitled"}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => weddingStoriesService.restoreStory(s.id, actor), "Restored")} className="gap-1.5 text-xs"><RotateCcw className="size-3 text-emerald-400" />Restore</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => weddingStoriesService.permanentlyDeleteStory(s.id, actor), "Deleted")} className="gap-1.5 text-xs border-rose-950/60 text-rose-400"><Trash2 className="size-3" />Delete Forever</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs text-stone-300 font-medium">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 bg-black/60 border-stone-700 text-sm" />
    </div>
  );
}

function TextArea({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (v: string) => void; maxLength: number }) {
  return (
    <div>
      <div className="flex justify-between"><label className="text-xs text-stone-300 font-medium">{label}</label><span className="text-[10px] text-stone-500">{value.length}/{maxLength}</span></div>
      <textarea value={value} maxLength={maxLength} rows={3} onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 bg-black/60 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 outline-none focus:border-gold" />
    </div>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className="size-8 rounded-lg border border-stone-700 bg-stone-900/60 flex items-center justify-center text-stone-300 hover:border-gold hover:text-gold transition-colors">
      {children}
    </button>
  );
}

export default WeddingStoriesManager;

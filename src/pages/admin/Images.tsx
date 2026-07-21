import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { Images as ImagesIcon, ChevronDown, Search, AlertTriangle, ArrowRight } from "lucide-react";
import { PageHeader, Button, InfoPanel } from "@/components/admin/ui";
import { SlotManager } from "@/domains/cms";
import { SLOT_CATALOG, TOTAL_CATALOG_SLOTS } from "@/domains/cms/constants";
import { cloudinaryConfig } from "@/config/cloudinary";
import { ROUTES } from "@/constants/routes";

/**
 * Website Images — visual media manager for the fixed named image slots.
 *
 * Presentation only. Every editor is still generated from `SLOT_CATALOG` and every upload still flows
 * through `SlotManager` → `ImageUpload` unchanged. This file controls layout, grouping, search and
 * typography — no upload, Cloudinary, or Firestore logic lives here.
 */
export function AdminImages() {
  const isConfigured = cloudinaryConfig.isConfigured;
  const [query, setQuery] = useState("");
  // Collapsed by default except the first (active) section.
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(SLOT_CATALOG.length ? [SLOT_CATALOG[0].sectionKey] : [])
  );

  const q = query.trim().toLowerCase();

  // Filter slots by label / section / slot name. Pure presentation over the static catalog.
  const sections = useMemo(() => {
    if (!q) return SLOT_CATALOG.map((s) => ({ section: s, slots: s.slots }));
    return SLOT_CATALOG.map((s) => ({
      section: s,
      slots: s.slots.filter(
        (slot) =>
          slot.label.toLowerCase().includes(q) ||
          slot.slotName.toLowerCase().includes(q) ||
          s.sectionKey.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q)
      ),
    })).filter((g) => g.slots.length > 0);
  }, [q]);

  const toggle = (key: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const matchCount = sections.reduce((n, g) => n + g.slots.length, 0);

  return (
    <div className="space-y-6 animate-fade-in select-none">
      <PageHeader title="Website Images" description="Manage all images used across your website." />

      {!isConfigured && (
        <InfoPanel tone="warning" icon={AlertTriangle}>
          Image uploads aren't fully set up yet. Please contact your developer to finish connecting
          your image storage.
        </InfoPanel>
      )}

      {/* ── Sticky toolbar ── */}
      <div className="sticky top-2 z-20 flex flex-wrap items-center gap-3 bg-stone-950/80 border border-stone-800/80 rounded-2xl px-4 py-3 backdrop-blur-md">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search images by name or section…"
            aria-label="Search images"
            className="w-full bg-black/50 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white/90 placeholder:text-white/40 outline-none focus:border-gold transition-colors duration-150"
          />
        </div>
        <span className="text-[13px] text-white/50">
          {q ? `${matchCount} of ${TOTAL_CATALOG_SLOTS}` : `${TOTAL_CATALOG_SLOTS} images`}
        </span>
      </div>

      {/* ── Collapsible sections ── */}
      {sections.map(({ section, slots }) => {
        const open = q ? true : openSections.has(section.sectionKey); // searching expands everything
        return (
          <section key={section.sectionKey} className="border border-stone-800/70 rounded-2xl overflow-hidden bg-black/20">
            <button
              type="button"
              onClick={() => toggle(section.sectionKey)}
              aria-expanded={open}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors duration-150"
            >
              <div className="min-w-0">
                <h2 className="font-serif text-2xl text-white/90 leading-tight">{section.title}</h2>
                <p className="text-[13px] text-white/50 mt-0.5">
                  {slots.length} {slots.length === 1 ? "image" : "images"}
                </p>
              </div>
              <ChevronDown
                className={`size-5 text-white/50 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open && (
              <div className="px-5 pb-5 pt-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {slots.map((slot) => (
                  <div
                    key={slot.slotName}
                    className="group bg-black/30 border border-stone-800/70 rounded-2xl p-4 transition-all duration-150 hover:border-gold/40 hover:-translate-y-0.5"
                  >
                    <div className="mb-3">
                      <h3 className="font-serif text-lg text-white/90 leading-snug truncate">{slot.label}</h3>
                      <p className="text-xs text-white/50 mt-0.5 line-clamp-1">{slot.usage}</p>
                    </div>

                    {/* The uploader — untouched functional core (preview, replace, remove, publish). */}
                    <SlotManager
                      sectionKey={section.sectionKey}
                      slotName={slot.slotName}
                      label={slot.label}
                      description={slot.description}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {q && matchCount === 0 && (
        <div className="text-center py-14 border border-dashed border-stone-800 rounded-2xl">
          <Search className="size-8 text-white/30 mx-auto mb-3" />
          <p className="text-sm text-white/70">No images match “{query}”.</p>
          <button onClick={() => setQuery("")} className="text-xs text-gold hover:underline mt-2">
            Clear search
          </button>
        </div>
      )}

      {/* Gallery pointer — the one section managed elsewhere. */}
      <Link href={ROUTES.ADMIN.GALLERY}>
        <div className="flex items-center gap-4 p-5 rounded-2xl border border-stone-800/70 bg-black/20 hover:border-gold/40 transition-colors duration-150">
          <span className="size-10 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold shrink-0">
            <ImagesIcon className="size-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-serif text-base text-white/90">Looking for the Gallery?</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Bulk upload, reorder, and organize your gallery photos in the Gallery Manager.
            </p>
          </div>
          <ArrowRight className="size-4 text-white/40 shrink-0" />
        </div>
      </Link>
    </div>
  );
}

export default AdminImages;

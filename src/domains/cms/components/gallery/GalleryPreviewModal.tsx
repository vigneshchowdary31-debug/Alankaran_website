import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  X,
  Sparkles,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import type { CMSSlotMetadata } from "@/domains/cms/types";

export interface GalleryPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  slots: Record<string, CMSSlotMetadata>;
  isPreviewingDraft?: boolean;
}

export function GalleryPreviewModal({
  isOpen,
  onClose,
  slots,
  isPreviewingDraft = true,
}: GalleryPreviewModalProps) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const activeSlots = Object.values(slots || {})
    .filter((s) => s.visibility !== false && !s.isDeleted && s.url)
    .sort((a, b) => (a.order || 99) - (b.order || 99));

  const categories = ["All", ...Array.from(new Set(activeSlots.map((s) => s.category || "Royal Weddings")))];

  const filteredSlots = selectedCategory === "All"
    ? activeSlots
    : activeSlots.filter((s) => (s.category || "Royal Weddings") === selectedCategory);

  const getContainerClass = () => {
    switch (device) {
      case "tablet":
        return "max-w-[768px] mx-auto border-x-4 border-t-8 border-b-8 border-stone-800 rounded-[28px] p-4 bg-nizami-dark shadow-2xl overflow-y-auto max-h-[70vh]";
      case "mobile":
        return "max-w-[375px] mx-auto border-x-4 border-t-8 border-b-8 border-stone-800 rounded-[32px] p-3 bg-nizami-dark shadow-2xl overflow-y-auto max-h-[70vh]";
      case "desktop":
      default:
        return "w-full max-w-5xl mx-auto border border-stone-800 rounded-2xl p-6 bg-nizami-dark shadow-2xl overflow-y-auto max-h-[72vh]";
    }
  };

  const getGridClass = () => {
    switch (device) {
      case "mobile":
        return "grid grid-cols-1 gap-4";
      case "tablet":
        return "grid grid-cols-2 gap-4";
      case "desktop":
      default:
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-6xl bg-stone-950 border-gold/30 text-stone-200 shadow-2xl max-h-[95vh] flex flex-col p-6">
        <DialogHeader className="pb-4 border-b border-stone-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <DialogTitle className="font-serif text-xl text-stone-100 flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                <Eye className="size-4" />
              </div>
              <span>Live Gallery Device Simulator (`Task 8`)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                {isPreviewingDraft ? "Draft Preview Mode" : "Published State"}
              </span>
            </DialogTitle>
            <DialogDescription className="font-sans text-xs text-stone-400 mt-1">
              Preview exactly how your custom gallery ordering (`order: number`), captions, and responsive layout render across Desktop, Tablet, and Mobile before going live.
            </DialogDescription>
          </div>

          {/* Device Switcher Tabs (`Task 8`) */}
          <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-stone-800">
            <Button
              type="button"
              variant={device === "desktop" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDevice("desktop")}
              className={`h-8 gap-1.5 text-xs font-sans rounded-lg ${
                device === "desktop" ? "bg-gold text-nizami-dark font-semibold" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Monitor className="size-3.5" />
              <span className="hidden md:inline">Desktop</span>
            </Button>
            <Button
              type="button"
              variant={device === "tablet" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDevice("tablet")}
              className={`h-8 gap-1.5 text-xs font-sans rounded-lg ${
                device === "tablet" ? "bg-gold text-nizami-dark font-semibold" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Tablet className="size-3.5" />
              <span className="hidden md:inline">Tablet (768px)</span>
            </Button>
            <Button
              type="button"
              variant={device === "mobile" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDevice("mobile")}
              className={`h-8 gap-1.5 text-xs font-sans rounded-lg ${
                device === "mobile" ? "bg-gold text-nizami-dark font-semibold" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Smartphone className="size-3.5" />
              <span className="hidden md:inline">Mobile (375px)</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Category Filter Pills (`Task 7 & 8`) */}
        <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar border-b border-stone-800/60">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-sans transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-gold text-nizami-dark font-semibold shadow-md"
                  : "bg-stone-900/80 text-stone-300 border border-stone-800 hover:border-gold/40"
              }`}
            >
              {cat}
            </button>
          ))}
          <span className="ml-auto text-[11px] font-mono text-stone-400 hidden sm:inline">
            Showing {filteredSlots.length} of {activeSlots.length} visible images
          </span>
        </div>

        {/* Simulated Viewport Area */}
        <div className="flex-1 py-4 bg-black/40 rounded-xl overflow-hidden flex flex-col justify-start">
          <div className={getContainerClass()}>
            {/* Simulated Public Gallery Header */}
            <div className="text-center mb-6 pt-2">
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-gold">
                Alankaran Luxury Weddings
              </span>
              <h3 className="font-serif text-2xl md:text-3xl text-stone-100 font-normal mt-1">
                Royal Wedding Gallery
              </h3>
              <div className="h-px w-16 bg-gold/60 mx-auto mt-2.5" />
            </div>

            {filteredSlots.length === 0 ? (
              <div className="text-center py-16 border border-stone-800/60 rounded-2xl bg-black/30">
                <ImageIcon className="size-8 text-stone-600 mx-auto mb-2 opacity-50" />
                <p className="font-serif text-sm text-stone-400">No images match this category preview.</p>
              </div>
            ) : (
              <div className={getGridClass()}>
                {filteredSlots.map((slot, index) => (
                  <div
                    key={slot.id || slot.slotName}
                    className="group relative rounded-2xl overflow-hidden bg-stone-900 border border-gold/15 hover:border-gold/50 transition-all duration-300 shadow-lg flex flex-col justify-between aspect-[4/3]"
                  >
                    <img
                      src={slot.url}
                      alt={slot.altText}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Order Badge inside preview (`Task 3`) */}
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-gold/30 px-2 py-0.5 rounded text-[10px] font-mono text-gold flex items-center gap-1 shadow">
                      <Layers className="size-2.5" /> #{slot.order || index + 1}
                    </div>

                    {/* Category Pill */}
                    {slot.category && (
                      <div className="absolute top-3 right-3 bg-nizami-dark/90 backdrop-blur-md border border-stone-700 px-2 py-0.5 rounded-full text-[10px] font-mono text-stone-200 shadow">
                        {slot.category}
                      </div>
                    )}

                    {/* Hover Caption Overlay (`Task 6 & 8`) */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 translate-y-2 opacity-90 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <p className="font-serif text-sm text-stone-100 truncate">
                        {slot.altText || slot.slotName}
                      </p>
                      {slot.caption && (
                        <p className="font-sans text-[11px] text-stone-300 line-clamp-2 mt-1 leading-relaxed">
                          {slot.caption}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs font-mono text-stone-400">
          <span>Viewport Mode: <strong className="text-gold uppercase">{device}</strong></span>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-sans border-stone-700 bg-stone-900 text-stone-300"
          >
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

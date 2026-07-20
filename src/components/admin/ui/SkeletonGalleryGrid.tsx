import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonGalleryGridProps {
  count?: number;
  className?: string;
}

/**
 * Phase 7 Gallery-specific shimmer skeleton (Task 3).
 * Matches the exact 4-column card layout of GalleryManager's Grid View.
 * Shown during initial Firestore data load to prevent blank screens.
 */
export function SkeletonGalleryGrid({ count = 8, className }: SkeletonGalleryGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6",
        className
      )}
      aria-busy="true"
      aria-label="Loading gallery images..."
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonGalleryCard key={i} />
      ))}
    </div>
  );
}

function SkeletonGalleryCard() {
  return (
    <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 overflow-hidden animate-pulse select-none">
      {/* Thumbnail area */}
      <div className="aspect-[4/3] bg-stone-800/60 relative">
        {/* Checkbox placeholder */}
        <div className="absolute top-3 left-3 size-7 rounded-lg bg-stone-700/60 border border-stone-700" />
        {/* Badges placeholder */}
        <div className="absolute top-3 right-3 flex gap-1">
          <div className="w-8 h-5 rounded bg-stone-700/60" />
          <div className="w-10 h-5 rounded bg-stone-700/60" />
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-2.5 w-20 rounded bg-stone-800" />
          <div className="h-2.5 w-12 rounded bg-stone-800" />
        </div>
        <div className="h-4 w-3/4 rounded bg-stone-800" />
        <div className="h-3 w-full rounded bg-stone-800/60" />
        <div className="h-3 w-5/6 rounded bg-stone-800/60" />

        {/* Action footer */}
        <div className="pt-3 border-t border-stone-800/60 flex items-center gap-2">
          <div className="flex-1 h-8 rounded-lg bg-stone-800/60" />
          <div className="h-8 w-8 rounded-lg bg-stone-800/60" />
        </div>
      </div>
    </div>
  );
}

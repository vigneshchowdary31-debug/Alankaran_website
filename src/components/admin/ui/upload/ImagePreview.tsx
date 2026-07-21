import React, { useState } from "react";
import { RefreshCw, Trash2, CheckCircle2, Maximize2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storageProvider } from "@/storage";
import type { ImageAsset } from "@/types";
import { cn } from "@/lib/utils";

interface ImagePreviewProps {
  asset: ImageAsset;
  onReplaceClick: () => void;
  onRemoveClick: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Reusable ImagePreview component displaying uploaded Cloudinary asset details,
 * live preview thumbnail with loading states, and direct Replace/Remove actions.
 */
export function ImagePreview({
  asset,
  onReplaceClick,
  onRemoveClick,
  disabled = false,
  className,
}: ImagePreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Generate thumbnail URL using storage abstraction
  const thumbnailUrl = storageProvider.getUrl(asset.cloudinaryId || asset.url, {
    width: 600,
    height: 400,
    crop: "fill",
    quality: 85,
  });

  const formattedSize =
    asset.sizeBytes && asset.sizeBytes > 1024 * 1024
      ? `${(asset.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : asset.sizeBytes
      ? `${Math.round(asset.sizeBytes / 1024)} KB`
      : "Optimized WebP";

  return (
    <div
      className={cn(
        "bg-black/40 border border-stone-800/70 rounded-2xl overflow-hidden flex flex-col transition-all duration-150 select-none",
        className
      )}
    >
      {/* Image — the prominent element (~16:10, ~70% of the card). */}
      <div className="relative w-full aspect-[16/10] bg-stone-950 flex items-center justify-center overflow-hidden group/preview">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-stone-900 animate-pulse flex items-center justify-center text-white/40 text-xs">
            Loading…
          </div>
        )}

        {imageError ? (
          <div className="text-white/50 text-xs flex flex-col items-center justify-center p-4 text-center">
            <span>Preview unavailable</span>
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline mt-1 flex items-center gap-1"
            >
              <span>Open image</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        ) : (
          <img
            src={thumbnailUrl || asset.url}
            alt={asset.altText || "Uploaded preview"}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={cn(
              "w-full h-full object-cover transition-all duration-300 group-hover/preview:scale-[1.02]",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {/* Corner status pill — image is stored and ready. */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-emerald-500/40 text-[11px] font-medium text-emerald-400">
          <CheckCircle2 className="size-3" />
          <span>Uploaded</span>
        </div>

        {/* Open full-resolution — appears on hover. */}
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-black text-white/70 hover:text-gold transition-all duration-150 border border-stone-700/80 backdrop-blur-md opacity-0 group-hover/preview:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          title="Open full-size image"
          aria-label="Open full-size image"
        >
          <Maximize2 className="size-3.5" />
        </a>
      </div>

      {/* Compact metadata — dimensions + size, no developer IDs. */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className="text-white/70">
            {asset.width && asset.height ? `${asset.width} × ${asset.height}` : "Image"}
          </span>
          <span className="text-white/45">{formattedSize}</span>
        </div>

        {/* One action row: Replace (secondary) · Remove (danger). */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReplaceClick}
            disabled={disabled}
            className="flex-1 h-9 gap-2 text-xs bg-stone-900/60 border-stone-700 hover:border-gold/40 text-white/90 hover:text-gold focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            <RefreshCw className="size-3.5" />
            <span>Replace</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemoveClick}
            disabled={disabled}
            className="h-9 px-3 gap-1.5 text-xs bg-red-950/20 border-red-900/40 text-red-400 hover:text-red-300 hover:bg-red-950/40 focus-visible:ring-2 focus-visible:ring-red-500/50"
            title="Remove image"
            aria-label="Remove image"
          >
            <Trash2 className="size-3.5" />
            <span>Remove</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

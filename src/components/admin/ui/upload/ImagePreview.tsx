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
        "bg-black/40 border border-gold/30 rounded-2xl overflow-hidden shadow-xl shadow-gold/5 flex flex-col transition-all select-none",
        className
      )}
    >
      {/* Thumbnail Header Area */}
      <div className="relative w-full aspect-[16/10] bg-stone-950 flex items-center justify-center overflow-hidden border-b border-stone-800">
        {/* Shimmer loading placeholder while image loads */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-stone-900 animate-pulse flex items-center justify-center text-stone-600 text-xs font-sans">
            Loading preview from CDN...
          </div>
        )}

        {imageError ? (
          <div className="text-stone-500 font-sans text-xs flex flex-col items-center justify-center p-4 text-center">
            <span>Thumbnail temporarily unavailable</span>
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline mt-1 flex items-center gap-1"
            >
              <span>View Direct URL</span>
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
              "w-full h-full object-cover transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {/* Top Status Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-emerald-500/40 text-[10px] font-mono text-emerald-400">
          <CheckCircle2 className="size-3 text-emerald-400" />
          <span>Cloudinary CDN Active</span>
        </div>

        {/* Direct Link Open Button */}
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-black text-stone-300 hover:text-gold transition-colors border border-stone-700/80 backdrop-blur-md focus:outline-none"
          title="Open full resolution image on Cloudinary CDN"
          aria-label="Open full resolution image"
        >
          <Maximize2 className="size-3.5" />
        </a>
      </div>

      {/* Asset Metadata Footer */}
      <div className="p-5 flex flex-col justify-between flex-1 gap-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-sans text-xs font-semibold text-stone-100 truncate" title={asset.altText}>
              {asset.altText || asset.slotName}
            </h4>
            <span className="font-mono text-[10px] text-gold shrink-0 bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
              {formattedSize}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 pt-2 border-t border-stone-800/80">
            <span>ID: {asset.cloudinaryId ? asset.cloudinaryId.split("/").pop() : asset.id}</span>
            {asset.width && asset.height && (
              <span>
                {asset.width} × {asset.height} px
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons: Replace & Delete */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReplaceClick}
            disabled={disabled}
            className="flex-1 h-9 gap-2 font-sans text-xs bg-stone-900/80 border-stone-700 hover:border-gold/40 text-stone-200 hover:text-gold"
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
            className="h-9 px-3 gap-1.5 font-sans text-xs bg-red-950/20 border-red-900/40 text-red-400 hover:text-red-300 hover:bg-red-950/40"
            title="Delete image asset"
            aria-label="Remove image from storage"
          >
            <Trash2 className="size-3.5" />
            <span>Remove</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

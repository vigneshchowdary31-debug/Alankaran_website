import React from "react";
import { Loader2Icon, XCircle, RefreshCw, AlertCircle, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  filename: string;
  percentage: number;
  status: "uploading" | "error" | "success";
  errorMessage?: string | null;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

/**
 * Animated real-time upload progress indicator with retry and cancel capabilities.
 */
export function UploadProgress({
  filename,
  percentage,
  status,
  errorMessage,
  onCancel,
  onRetry,
  className,
}: UploadProgressProps) {
  const isError = status === "error";
  const isSuccess = status === "success";

  return (
    <div
      className={cn(
        "p-6 rounded-2xl border transition-all select-none",
        isError
          ? "bg-red-950/20 border-red-800/80"
          : isSuccess
          ? "bg-emerald-950/20 border-emerald-800/80"
          : "bg-black/40 border-gold/30 shadow-xl shadow-gold/5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className={cn(
              "size-10 rounded-xl flex items-center justify-center shrink-0 border",
              isError
                ? "bg-red-950/60 border-red-800 text-red-400"
                : isSuccess
                ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                : "bg-gold/15 border-gold/40 text-gold"
            )}
          >
            {isError ? (
              <AlertCircle className="size-5" />
            ) : isSuccess ? (
              <FileImage className="size-5" />
            ) : (
              <Loader2Icon className="size-5 animate-spin" />
            )}
          </div>
          <div className="overflow-hidden">
            <p className="font-sans text-xs font-medium text-stone-200 truncate">{filename}</p>
            <p
              className={cn(
                "font-mono text-[11px] mt-0.5",
                isError ? "text-red-400" : isSuccess ? "text-emerald-400" : "text-stone-400"
              )}
            >
              {isError
                ? errorMessage || "Upload failed due to a network error."
                : isSuccess
                ? "Upload verified on Cloudinary CDN"
                : `Uploading to CDN (${percentage}%)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isError && onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-8 px-3 gap-1.5 text-xs font-sans text-gold border-gold/40 hover:bg-gold/10"
            >
              <RefreshCw className="size-3.5" />
              <span>Retry</span>
            </Button>
          )}

          {!isSuccess && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-stone-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5 focus:outline-none"
              aria-label="Cancel Upload"
            >
              <XCircle className="size-5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {!isError && (
        <div className="w-full h-2 rounded-full bg-stone-900 overflow-hidden border border-stone-800">
          <div
            className={cn(
              "h-full transition-all duration-300 ease-out",
              isSuccess ? "bg-emerald-400" : "bg-gradient-to-r from-gold-hover via-gold to-amber-300"
            )}
            style={{ width: `${Math.max(percentage, 5)}%` }}
          />
        </div>
      )}
    </div>
  );
}

import React from "react";
import { cn } from "@/lib/utils";
import { WifiOff, AlertTriangle, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ErrorStateType =
  | "offline"
  | "permission"
  | "upload_failed"
  | "publish_failed"
  | "firestore_unavailable"
  | "cloudinary_unavailable"
  | "generic";

const ERROR_CONFIGS: Record<
  ErrorStateType,
  { icon: React.ComponentType<{ className?: string }>; defaultTitle: string; defaultDescription: string }
> = {
  offline: {
    icon: WifiOff,
    defaultTitle: "You're Offline",
    defaultDescription:
      "The CMS cannot connect to Firestore. Check your internet connection and try again. Your last saved changes are cached locally.",
  },
  permission: {
    icon: ShieldAlert,
    defaultTitle: "Permission Denied",
    defaultDescription:
      "Your administrator account does not have access to this resource. Contact Alankaran support if this is unexpected.",
  },
  upload_failed: {
    icon: AlertTriangle,
    defaultTitle: "Upload Failed",
    defaultDescription:
      "Cloudinary could not receive your image. This may be a network timeout or an invalid upload preset. Verify your Cloudinary configuration.",
  },
  publish_failed: {
    icon: AlertTriangle,
    defaultTitle: "Publish Failed",
    defaultDescription:
      "The gallery section could not be published to the live website. Firestore may be temporarily unavailable. Try again in a moment.",
  },
  firestore_unavailable: {
    icon: WifiOff,
    defaultTitle: "Database Unavailable",
    defaultDescription:
      "Firestore is currently unreachable. Your CMS data is safe. Please wait a moment and refresh the page.",
  },
  cloudinary_unavailable: {
    icon: WifiOff,
    defaultTitle: "CDN Unavailable",
    defaultDescription:
      "Cloudinary image delivery is temporarily unavailable. Uploaded images may not display correctly until service is restored.",
  },
  generic: {
    icon: AlertTriangle,
    defaultTitle: "Something Went Wrong",
    defaultDescription:
      "An unexpected error occurred. Please try again. If this persists, open the Diagnostics & Health page for a full system check.",
  },
};

export interface ErrorStateProps {
  type?: ErrorStateType;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Phase 7 Reusable Error State Component (Task 9).
 * Contextual error display with specific messages for offline, permission, upload, publish,
 * Firestore, and Cloudinary failure scenarios.
 */
export function ErrorState({
  type = "generic",
  title,
  description,
  onRetry,
  retryLabel = "Retry",
  className,
}: ErrorStateProps) {
  const config = ERROR_CONFIGS[type];
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayDescription = description || config.defaultDescription;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-red-900/40 bg-red-950/10 select-none animate-fade-in",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="size-14 rounded-2xl bg-red-950/60 border border-red-900/60 flex items-center justify-center mb-4">
        <Icon className="size-6 text-red-400" aria-hidden="true" />
      </div>

      <h3 className="font-serif text-lg text-stone-200 font-normal mb-2">{displayTitle}</h3>

      <p className="font-sans text-xs text-stone-400 leading-relaxed max-w-sm mb-6">
        {displayDescription}
      </p>

      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-2 border-stone-700 bg-stone-900 text-stone-200 hover:border-gold hover:text-gold text-xs font-sans"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Database, Wifi, WifiOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { firebaseConfig } from "@/config/firebase";
import { cloudinaryConfig } from "@/config/cloudinary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/**
 * Connection and configuration status banner shown above admin pages.
 * Surfaces offline state and (when running on placeholder credentials) a setup notice.
 */
export function CMSStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isPlaceholderEnv = firebaseConfig.isPlaceholder || !cloudinaryConfig.isConfigured;

  return (
    <div className="space-y-3 mb-6">
      {/* ── Offline Network Alert ── */}
      {!isOnline && (
        <Alert className="bg-red-950/80 border-red-800 text-red-200">
          <WifiOff className="size-4 text-red-400" />
          <AlertTitle className="font-serif font-medium">You're offline</AlertTitle>
          <AlertDescription className="text-xs font-sans text-red-300">
            Image uploads and saving are paused until your connection is back.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Unconfigured Environment Warning ── */}
      {isPlaceholderEnv && (
        <Alert className="bg-amber-950/80 border-amber-800/80 text-amber-200">
          <AlertCircle className="size-4 text-amber-400" />
          <AlertTitle className="font-serif font-medium">Setup needed</AlertTitle>
          <AlertDescription className="text-xs font-sans text-amber-300/90 leading-relaxed">
            The website isn't fully connected yet. Please contact your developer to finish setup.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Connection status ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 border border-gold/20 px-4 py-3 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className={cn("p-1.5 rounded-lg border", isOnline ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400")}>
            <Database className="size-4" />
          </div>
          <div>
            <h4 className="text-sm font-serif font-medium text-stone-200">Website Connected</h4>
            <p className="text-[13px] font-sans text-stone-400">
              {isOnline ? "Your changes save automatically and appear when you publish." : "Working offline — changes will save when you reconnect."}
            </p>
          </div>
        </div>

        <span className={cn(
          "inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border",
          isOnline ? "text-emerald-400 border-emerald-800/60 bg-emerald-950/30" : "text-amber-400 border-amber-800/60 bg-amber-950/30"
        )}>
          <span className={cn("size-2 rounded-full", isOnline ? "bg-emerald-400" : "bg-amber-400")} />
          {isOnline ? "Connected" : "Offline"}
        </span>
      </div>
    </div>
  );
}

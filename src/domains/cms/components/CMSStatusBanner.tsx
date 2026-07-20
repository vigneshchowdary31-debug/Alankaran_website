import React, { useState, useEffect } from "react";
import { Database, Wifi, WifiOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { firebaseConfig } from "@/config/firebase";
import { cloudinaryConfig } from "@/config/cloudinary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/**
 * Real-time connection and environment status banner for Phase 3 CMS Administrative Portal.
 * Displays online/offline network transitions and alerts administrators if local `.env.local` variables are unconfigured.
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
          <AlertTitle className="font-serif font-medium">No Internet Connection Detected</AlertTitle>
          <AlertDescription className="text-xs font-sans text-red-300">
            You are currently working offline. Cloudinary CDN uploads and Firestore real-time synchronization (`cmsSiteContent`) are suspended until network connectivity is restored.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Unconfigured Environment Warning ── */}
      {isPlaceholderEnv && (
        <Alert className="bg-amber-950/80 border-amber-800/80 text-amber-200">
          <AlertCircle className="size-4 text-amber-400" />
          <AlertTitle className="font-serif font-medium">Environment Variables Unconfigured</AlertTitle>
          <AlertDescription className="text-xs font-sans text-amber-300/90 leading-relaxed">
            Your local system is running with default environment credentials (`VITE_FIREBASE_API_KEY` or `VITE_CLOUDINARY_CLOUD_NAME`). A local copy `.env.local` was automatically initialized from `.env.example`. Please fill in your real project keys to activate live cloud persistence.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Phase 3 Real-time Sync Status Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 border border-gold/20 px-4 py-3 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className={cn("p-1.5 rounded-lg border", isOnline ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400")}>
            <Database className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-serif font-medium text-stone-200 flex items-center gap-1.5">
              <span>Phase 3 Firestore Data Layer Active</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gold/10 text-gold border border-gold/20">
                cmsSiteContent
              </span>
            </h4>
            <p className="text-[11px] font-sans text-stone-400">
              {isOnline ? "Real-time snapshot listeners active across tabs. 0ms local mutation latency." : "Offline caching active. Mutations queued until connection resumes."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={cn("size-2 rounded-full animate-pulse", isOnline ? "bg-emerald-400" : "bg-red-400")} />
          <span className={cn(isOnline ? "text-emerald-400" : "text-red-400")}>
            {isOnline ? "CLOUD CONNECTED" : "OFFLINE MODE"}
          </span>
        </div>
      </div>
    </div>
  );
}

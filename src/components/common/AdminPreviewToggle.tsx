import React from "react";
import { Eye, Globe, Shield, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSiteContent } from "@/providers/SiteContentProvider";

/**
 * Phase 4 Enterprise Admin Preview Mode Toggle (`Task 17`).
 * Exclusively visible to authenticated administrators when inspecting the live website.
 * Normal visitors always see 100% isolated Published content (`Task 2`).
 */
export function AdminPreviewToggle() {
  const { currentUser } = useAuth();
  const { previewMode, setPreviewMode, refreshAll, isOffline } = useSiteContent();

  if (!currentUser) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in select-none">
      <div className="bg-stone-950/95 border border-stone-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-sans">
        <div className="size-8 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shrink-0">
          <Shield className="size-4" />
        </div>

        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5 font-semibold text-stone-200">
            <span>CMS Preview Control</span>
            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${
              previewMode ? "bg-amber-950 text-amber-400 border-amber-800" : "bg-emerald-950 text-emerald-400 border-emerald-800"
            }`}>
              {previewMode ? "Draft Mode" : "Published Live"}
            </span>
          </div>
          <p className="text-[10px] text-stone-400 font-light mt-0.5">
            {previewMode ? "Showing unpublished working draft assets (`Task 17`)." : "Showing live visitor published assets (`Task 2`)."}
          </p>
        </div>

        <div className="flex items-center gap-1.5 border-l border-stone-800 pl-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
              previewMode
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
            }`}
          >
            {previewMode ? <Eye className="size-3.5" /> : <Globe className="size-3.5" />}
            <span>{previewMode ? "Switch to Live" : "Preview Draft"}</span>
          </button>

          <button
            onClick={refreshAll}
            title="Refresh Cached Data (`Task 3`)"
            className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition-colors"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminPreviewToggle;

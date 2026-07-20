import React, { useState } from "react";
import { Globe, CheckCircle2, AlertTriangle, RotateCcw, UploadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/admin/ui";
import { useAuth } from "@/context/AuthContext";
import type { CMSSectionWithPublishing } from "../types";

export interface PublishControlsProps {
  sectionKey: string;
  section: CMSSectionWithPublishing;
  onPublish: (userEmail: string) => Promise<boolean>;
  onRefresh?: () => Promise<void>;
}

/**
 * Phase 3.5 Enterprise Draft & Published Workflow Controls.
 * Clearly separates Draft vs Published versions. Guarantees Future Phase 4 live website will only read Published.
 */
export function PublishControls({ sectionKey, section, onPublish, onRefresh }: PublishControlsProps) {
  const { currentUser } = useAuth();
  const [publishing, setPublishing] = useState(false);
  const [justPublished, setJustPublished] = useState(false);

  const slotCount = section?.slots ? Object.keys(section.slots).length : 0;
  const isPublished = Boolean(section?.publishedAt);
  const publishedCount = section?.publishedSlots ? Object.keys(section.publishedSlots).length : 0;
  const hasUnpublishedDrafts = slotCount !== publishedCount || !isPublished;

  const handlePublishClick = async () => {
    if (publishing || !currentUser?.email) return;
    try {
      setPublishing(true);
      const success = await onPublish(currentUser.email);
      if (success) {
        setJustPublished(true);
        setTimeout(() => setJustPublished(false), 4000);
        if (onRefresh) await onRefresh();
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 border ${
          justPublished || !hasUnpublishedDrafts
            ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-400"
            : "bg-amber-950/40 border-amber-800/80 text-amber-400"
        }`}>
          {justPublished || !hasUnpublishedDrafts ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <AlertTriangle className="size-5" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-base text-stone-200 font-normal">
              {section.title || `${sectionKey.toUpperCase()} Section Workflow`}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold border ${
              justPublished || !hasUnpublishedDrafts
                ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                : "bg-amber-950 text-amber-400 border-amber-800"
            }`}>
              {justPublished || !hasUnpublishedDrafts ? "Published Live" : "Draft Modifications Active"}
            </span>
          </div>
          <p className="text-xs font-sans text-stone-400 mt-1">
            Working Draft contains <strong className="text-stone-200">{slotCount} active assets</strong>.{" "}
            {isPublished && section.publishedAt ? (
              <span>Last published version on <strong className="text-stone-300">{new Date(section.publishedAt).toLocaleString()}</strong> by {section.publishedBy}.</span>
            ) : (
              <span>No published version snapshot exists yet for this section.</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          onClick={handlePublishClick}
          disabled={publishing || slotCount === 0}
          className={`gap-2 text-xs font-sans shadow-lg ${
            justPublished || !hasUnpublishedDrafts
              ? "bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700"
              : "bg-gold hover:bg-gold-light text-stone-950 font-semibold"
          }`}
        >
          {publishing ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Publishing Snapshot...</span>
            </>
          ) : justPublished ? (
            <>
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>Version Snapshot Published!</span>
            </>
          ) : (
            <>
              <UploadCloud className="size-3.5" />
              <span>Publish Draft to Live Snapshot</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default PublishControls;

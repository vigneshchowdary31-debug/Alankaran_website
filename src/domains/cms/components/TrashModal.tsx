import React, { useState } from "react";
import { Trash2, RotateCcw, CheckCircle2, AlertTriangle, ShieldAlert, Image as ImageIcon } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/admin/ui";
import type { CMSTrashRecord } from "../types";

export interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CMSTrashRecord[];
  onRestore: (trashId: string) => Promise<boolean>;
  onPermanentDelete: (trashId: string) => Promise<boolean>;
}

/**
 * Phase 3.5 Enterprise Soft Delete & Trash Modal (`Task 3`).
 * Guarantees zero accidental data loss by preserving deleted assets in `cmsTrash` with restore options.
 */
export function TrashModal({ isOpen, onClose, items, onRestore, onPermanentDelete }: TrashModalProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRestoreClick = async (trashId: string) => {
    try {
      setBusyId(trashId);
      await onRestore(trashId);
    } finally {
      setBusyId(null);
    }
  };

  const handlePurgeClick = async (trashId: string) => {
    if (!window.confirm("Are you certain you want to permanently delete this image from the CMS database?")) return;
    try {
      setBusyId(trashId);
      await onPermanentDelete(trashId);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <Card className="bg-stone-950 border border-stone-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <CardHeader className="p-6 border-b border-stone-800/80 bg-stone-900/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-950/40 border border-amber-800/80 flex items-center justify-center text-amber-400">
              <Trash2 className="size-5" />
            </div>
            <div>
              <CardTitle className="font-serif text-xl text-stone-100 font-normal">
                CMS Trash & Recovery (`Task 3`)
              </CardTitle>
              <p className="font-sans text-xs text-stone-400 mt-0.5">
                Soft-deleted slots are safely archived and can be restored at any time.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto space-y-4 flex-1">
          {items.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-stone-800 rounded-2xl bg-stone-900/20">
              <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-3" />
              <p className="font-serif text-base text-stone-300">Trash Bin is Empty</p>
              <p className="font-sans text-xs text-stone-500 max-w-sm mx-auto mt-1">
                When you soft-delete an image slot, it will appear here for safe inspection and 1-click restoration.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isBusy = busyId === item.trashId;
              const { sectionKey, slotName } = item.originalLocation;

              return (
                <div
                  key={item.trashId}
                  className="p-4 rounded-xl border border-stone-800/80 bg-stone-900/40 hover:border-amber-900/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    {item.asset?.url ? (
                      <img
                        src={item.asset.url}
                        alt="Thumbnail"
                        className="size-12 rounded-lg object-cover border border-stone-800 shrink-0"
                      />
                    ) : (
                      <div className="size-12 rounded-lg bg-stone-800 flex items-center justify-center text-stone-500 shrink-0">
                        <ImageIcon className="size-5" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-stone-200">
                          {sectionKey.toUpperCase()} / {slotName}
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
                          Soft Deleted
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-stone-400 font-light truncate max-w-xs">
                        {item.asset?.cloudinaryId || "Unknown CDN Asset"}
                      </p>
                      <p className="font-sans text-[10px] text-stone-500">
                        Deleted on {new Date(item.deletedAt).toLocaleString()} by {item.deletedBy}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => handleRestoreClick(item.trashId)}
                      className="gap-1.5 text-xs border-stone-700 text-stone-300 hover:text-emerald-400 hover:border-emerald-800"
                    >
                      <RotateCcw className="size-3.5 text-emerald-400" />
                      <span>Restore</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => handlePurgeClick(item.trashId)}
                      className="gap-1.5 text-xs border-rose-950/60 text-rose-400 hover:bg-rose-950/40 hover:border-rose-800"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Purge</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TrashModal;

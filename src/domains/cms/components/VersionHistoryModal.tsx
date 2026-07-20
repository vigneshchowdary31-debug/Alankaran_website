import React, { useState } from "react";
import { History, RotateCcw, CheckCircle2, AlertCircle, Calendar, User, Layers, ArrowRight } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/admin/ui";
import type { CMSVersionSnapshot } from "../types";

export interface VersionHistoryModalProps {
  sectionKey: string;
  isOpen: boolean;
  onClose: () => void;
  versions: CMSVersionSnapshot[];
  onRestore: (versionId: string) => Promise<boolean>;
}

/**
 * Phase 3.5 Enterprise Version History Modal.
 * Allows administrators to review all historical snapshots, compare structure, and restore cleanly.
 */
export function VersionHistoryModal({ sectionKey, isOpen, onClose, versions, onRestore }: VersionHistoryModalProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRestore = async (versionId: string) => {
    try {
      setRestoringId(versionId);
      const ok = await onRestore(versionId);
      if (ok) {
        setRestoredId(versionId);
        setTimeout(() => {
          setRestoredId(null);
          onClose();
        }, 1500);
      }
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <Card className="bg-stone-950 border border-stone-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <CardHeader className="p-6 border-b border-stone-800/80 bg-stone-900/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
              <History className="size-5" />
            </div>
            <div>
              <CardTitle className="font-serif text-xl text-stone-100 font-normal">
                Version History — {sectionKey.toUpperCase()} Section
              </CardTitle>
              <p className="font-sans text-xs text-stone-400 mt-0.5">
                Immutable snapshots recorded automatically on each Publish action.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto space-y-4 flex-1">
          {versions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-stone-800 rounded-2xl bg-stone-900/20">
              <History className="size-8 text-stone-600 mx-auto mb-3" />
              <p className="font-serif text-base text-stone-300">No Published Snapshots Yet</p>
              <p className="font-sans text-xs text-stone-500 max-w-sm mx-auto mt-1">
                Version snapshots are automatically created and stored whenever an administrator clicks "Publish Draft to Live Snapshot".
              </p>
            </div>
          ) : (
            versions.map((snap) => {
              const isRestoring = restoringId === snap.versionId;
              const isRestored = restoredId === snap.versionId;
              const slotCount = snap.metadata?.slots ? Object.keys(snap.metadata.slots).length : 0;

              return (
                <div
                  key={snap.versionId}
                  className="p-4 rounded-xl border border-stone-800/80 bg-stone-900/40 hover:border-gold/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                        {snap.versionId}
                      </span>
                      <span className="text-[11px] font-mono text-stone-500 flex items-center gap-1">
                        <Calendar className="size-3" /> {new Date(snap.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-sans text-xs text-stone-300 font-light">{snap.changes}</p>
                    <div className="flex items-center gap-4 text-[11px] font-mono text-stone-400">
                      <span className="flex items-center gap-1">
                        <User className="size-3 text-stone-500" /> {snap.user}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="size-3 text-stone-500" /> {slotCount} preserved slots
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isRestoring || isRestored}
                    onClick={() => handleRestore(snap.versionId)}
                    className="gap-2 text-xs shrink-0 border-stone-700 text-stone-300 hover:text-gold hover:border-gold/50"
                  >
                    {isRestoring ? (
                      <span>Restoring...</span>
                    ) : isRestored ? (
                      <>
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Restored to Draft</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="size-3.5 text-gold" />
                        <span>Restore Snapshot</span>
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default VersionHistoryModal;

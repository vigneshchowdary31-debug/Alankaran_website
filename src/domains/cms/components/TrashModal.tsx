import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Trash2,
  RotateCcw,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  ArchiveRestore,
} from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/admin/ui";
import type { CMSTrashRecord } from "../types";
import type { BulkResult } from "../services/cms.service";

/** Relative "2 hours ago" — presentation helper, no logic. */
function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(ts).toLocaleDateString();
}

export interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CMSTrashRecord[];
  onRestore: (trashId: string) => Promise<boolean>;
  onPermanentDelete: (trashId: string) => Promise<boolean>;
  /** Bulk restore. Falls back to sequential single restores when not supplied. */
  onRestoreMany?: (trashIds: string[]) => Promise<BulkResult>;
  /** Bulk purge. Falls back to sequential single purges when not supplied. */
  onPermanentDeleteMany?: (trashIds: string[]) => Promise<BulkResult>;
}

type PendingAction = { kind: "restore" | "purge"; ids: string[] } | null;

/**
 * CMS Trash & Recovery with bulk selection.
 *
 * Selection is keyed by `trashId`, not by row index, so it stays correct when the list reorders or
 * shrinks after an operation. Ids that disappear from `items` are pruned on every change, which
 * stops a stale selection from targeting a record another tab already purged.
 */
export function TrashModal({
  isOpen,
  onClose,
  items,
  onRestore,
  onPermanentDelete,
  onRestoreMany,
  onPermanentDeleteMany,
}: TrashModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [summary, setSummary] = useState<{ ok: number; failed: { id: string; error: string }[] } | null>(null);
  const lastClickedIndex = useRef<number | null>(null);

  const ids = useMemo(() => items.map((i) => i.trashId), [items]);

  // Drop selections whose records no longer exist so a bulk action can never target a ghost id.
  useEffect(() => {
    setSelected((prev) => {
      const live = new Set(ids);
      const next = new Set(Array.from(prev).filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [ids]);

  const allSelected = items.length > 0 && selected.size === items.length;
  const selectedIds = useMemo(() => ids.filter((id) => selected.has(id)), [ids, selected]);

  const selectAll = useCallback(() => setSelected(new Set(ids)), [ids]);
  const deselectAll = useCallback(() => setSelected(new Set()), []);
  const invertSelection = useCallback(
    () => setSelected((prev) => new Set(ids.filter((id) => !prev.has(id)))),
    [ids]
  );

  /** Toggle one row; shift-click extends the range from the previously clicked row. */
  const toggleRow = useCallback(
    (index: number, shiftKey: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        const anchor = lastClickedIndex.current;

        if (shiftKey && anchor !== null && anchor !== index) {
          const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
          // The whole range adopts the state the clicked row is moving to (file-manager behaviour).
          const turningOn = !prev.has(ids[index]);
          for (let i = from; i <= to; i++) {
            if (turningOn) next.add(ids[i]);
            else next.delete(ids[i]);
          }
        } else if (next.has(ids[index])) {
          next.delete(ids[index]);
        } else {
          next.add(ids[index]);
        }
        return next;
      });
      lastClickedIndex.current = index;
    },
    [ids]
  );

  // Esc closes (or cancels a pending confirm); Ctrl/Cmd-A selects all.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pendingAction) setPendingAction(null);
        else if (!isWorking) onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && !isWorking) {
        e.preventDefault();
        selectAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isWorking, pendingAction, onClose, selectAll]);

  // Reset transient state when the modal closes.
  useEffect(() => {
    if (!isOpen) {
      setSelected(new Set());
      setSummary(null);
      setPendingAction(null);
      setProgress(null);
      lastClickedIndex.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /**
   * Runs a bulk action. Prefers the bulk callback; falls back to sequential single-item calls so the
   * component still works against the original two-prop API.
   */
  const runBulk = async (kind: "restore" | "purge", targetIds: string[]) => {
    if (!targetIds.length || isWorking) return; // guard blocks duplicate submits
    setIsWorking(true);
    setSummary(null);
    setProgress({ done: 0, total: targetIds.length });

    try {
      const bulkFn = kind === "restore" ? onRestoreMany : onPermanentDeleteMany;
      let result: BulkResult;

      if (bulkFn) {
        result = await bulkFn(targetIds);
        setProgress({ done: targetIds.length, total: targetIds.length });
      } else {
        const singleFn = kind === "restore" ? onRestore : onPermanentDelete;
        result = { succeeded: [], failed: [] };
        for (let i = 0; i < targetIds.length; i++) {
          try {
            const ok = await singleFn(targetIds[i]);
            if (ok) result.succeeded.push(targetIds[i]);
            else result.failed.push({ id: targetIds[i], error: "Operation returned false." });
          } catch (err: any) {
            result.failed.push({ id: targetIds[i], error: err?.message || "Unknown error." });
          }
          setProgress({ done: i + 1, total: targetIds.length });
        }
      }

      setSummary({ ok: result.succeeded.length, failed: result.failed });
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of result.succeeded) next.delete(id);
        return next;
      });
    } catch (err: any) {
      setSummary({ ok: 0, failed: [{ id: "*", error: err?.message || "The operation failed." }] });
    } finally {
      setIsWorking(false);
      setProgress(null);
      setPendingAction(null);
    }
  };

  const count = pendingAction?.ids.length ?? 0;
  const confirmLabel =
    pendingAction?.kind === "purge"
      ? `Delete ${count} item${count === 1 ? "" : "s"} permanently?`
      : `Restore ${count} item${count === 1 ? "" : "s"}?`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in-0 duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Trash and Recovery"
    >
      <Card className="bg-stone-950 border border-stone-800/80 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in-0 zoom-in-95 duration-150">
        <CardHeader className="px-6 py-5 border-b border-stone-800/70 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-amber-950/40 border border-amber-800/70 flex items-center justify-center text-amber-400 shrink-0">
              <Trash2 className="size-5" />
            </div>
            <div>
              <CardTitle className="font-serif text-2xl text-white/90 font-normal leading-tight">
                Trash &amp; Recovery
              </CardTitle>
              <p className="text-[15px] text-white/55 mt-0.5">
                Restore deleted images or permanently remove them.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isWorking}
            className="text-sm shrink-0 focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            Close
          </Button>
        </CardHeader>

        {/* ── Bulk toolbar ── */}
        {items.length > 0 && (
          <div className="px-6 py-3 border-b border-stone-800/80 bg-stone-900/20 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none mr-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = selected.size > 0 && !allSelected;
                }}
                onChange={() => (allSelected ? deselectAll() : selectAll())}
                disabled={isWorking}
                className="size-4 accent-amber-500 cursor-pointer"
                aria-label="Select all trash items"
              />
              <span className="text-[13px] text-white/80">
                {selected.size} selected
              </span>
            </label>

            <div className="h-4 w-px bg-stone-800" />

            <Button size="sm" variant="outline" onClick={selectAll} disabled={isWorking || allSelected} className="text-[11px] h-7">
              Select All
            </Button>
            <Button size="sm" variant="outline" onClick={deselectAll} disabled={isWorking || selected.size === 0} className="text-[11px] h-7">
              Deselect All
            </Button>
            <Button size="sm" variant="outline" onClick={invertSelection} disabled={isWorking} className="text-[11px] h-7">
              Invert
            </Button>

            <div className="flex-1" />

            <Button
              size="sm"
              variant="outline"
              disabled={isWorking || selected.size === 0}
              onClick={() => setPendingAction({ kind: "restore", ids: selectedIds })}
              className="gap-1.5 text-[11px] h-7 border-stone-700 text-stone-300 hover:text-emerald-400 hover:border-emerald-800"
            >
              <RotateCcw className="size-3.5 text-emerald-400" />
              <span>Restore Selected</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isWorking || selected.size === 0}
              onClick={() => setPendingAction({ kind: "purge", ids: selectedIds })}
              className="gap-1.5 text-[11px] h-7 border-rose-950/60 text-rose-400 hover:bg-rose-950/40 hover:border-rose-800"
            >
              <Trash2 className="size-3.5" />
              <span>Delete Selected</span>
            </Button>
          </div>
        )}

        {/* ── Progress ── */}
        {isWorking && (
          <div className="px-6 py-2.5 border-b border-stone-800/80 bg-stone-900/40 flex items-center gap-3">
            <Loader2 className="size-4 animate-spin text-amber-400 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between font-mono text-[11px] text-stone-300 mb-1">
                <span>Working…</span>
                {progress && <span>{progress.done} / {progress.total}</span>}
              </div>
              <div className="h-1 rounded-full bg-stone-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-200"
                  style={{ width: progress ? `${(progress.done / Math.max(progress.total, 1)) * 100}%` : "0%" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Result summary ── */}
        {summary && !isWorking && (
          <div
            className={`px-6 py-3 border-b border-stone-800/80 text-xs font-sans ${
              summary.failed.length === 0
                ? "bg-emerald-950/30 text-emerald-300"
                : summary.ok > 0
                  ? "bg-amber-950/30 text-amber-300"
                  : "bg-rose-950/30 text-rose-300"
            }`}
          >
            <div className="flex items-start gap-2">
              {summary.failed.length === 0 ? (
                <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-semibold">
                  {summary.failed.length === 0
                    ? `${summary.ok} item${summary.ok === 1 ? "" : "s"} processed successfully.`
                    : `Partial result — ${summary.ok} succeeded, ${summary.failed.length} failed.`}
                </p>
                {summary.failed.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 font-mono text-[10px] max-h-24 overflow-y-auto">
                    {summary.failed.slice(0, 10).map((f) => (
                      <li key={f.id}>• {f.id}: {f.error}</li>
                    ))}
                    {summary.failed.length > 10 && <li>…and {summary.failed.length - 10} more.</li>}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <CardContent className="p-6 overflow-y-auto space-y-3 flex-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-stone-800/70 bg-stone-900/30 px-6 py-14">
              <div className="size-[68px] rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-center text-white/50 mb-6">
                <ArchiveRestore className="size-8" />
              </div>
              <h3 className="font-serif text-xl text-white/90">Trash is empty</h3>
              <p className="text-[15px] text-white/70 mt-3 max-w-sm">
                Deleted images will appear here.
              </p>
              <p className="text-[13px] text-white/55 mt-1.5 max-w-sm">
                Restore items anytime, or permanently remove them when no longer needed.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="mt-8 text-sm focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                Back to Gallery
              </Button>
            </div>
          ) : (
            items.map((item, index) => {
              const { sectionKey, slotName } = item.originalLocation;
              const isSelected = selected.has(item.trashId);

              return (
                <div
                  key={item.trashId}
                  className={`p-3.5 rounded-xl border transition-colors duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? "border-amber-800/80 bg-amber-950/20"
                      : "border-stone-800/70 bg-stone-900/30 hover:border-amber-900/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isWorking}
                      onClick={(e) => toggleRow(index, (e as React.MouseEvent).shiftKey)}
                      onChange={() => { /* selection is handled in onClick so shiftKey is readable */ }}
                      className="size-4 mt-1 accent-amber-500 cursor-pointer shrink-0"
                      aria-label={`Select ${sectionKey}/${slotName}`}
                    />

                    {item.asset?.url ? (
                      <img
                        src={item.asset.url}
                        alt="Thumbnail"
                        className="size-14 rounded-lg object-cover border border-stone-800 shrink-0"
                      />
                    ) : (
                      <div className="size-14 rounded-lg bg-stone-800 flex items-center justify-center text-white/40 shrink-0">
                        <ImageIcon className="size-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-white/90 truncate" title={item.asset?.altText || slotName}>
                        {item.asset?.altText || slotName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[13px] text-gold/80 capitalize">{sectionKey}</span>
                        <span className="text-white/25">·</span>
                        <span className="text-[13px] text-white/55" title={new Date(item.deletedAt).toLocaleString()}>
                          Deleted {timeAgo(item.deletedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isWorking}
                      onClick={() => setPendingAction({ kind: "restore", ids: [item.trashId] })}
                      className="gap-1.5 text-xs border-stone-700 text-stone-300 hover:text-emerald-400 hover:border-emerald-800"
                    >
                      <RotateCcw className="size-3.5 text-emerald-400" />
                      <span>Restore</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isWorking}
                      onClick={() => setPendingAction({ kind: "purge", ids: [item.trashId] })}
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

      {/* ── Confirmation ── */}
      {pendingAction && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <Card className="bg-stone-950 border border-stone-800 w-full max-w-md rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`size-10 rounded-xl border flex items-center justify-center shrink-0 ${
                  pendingAction.kind === "purge"
                    ? "bg-rose-950/40 border-rose-800/80 text-rose-400"
                    : "bg-emerald-950/40 border-emerald-800/80 text-emerald-400"
                }`}
              >
                {pendingAction.kind === "purge" ? <Trash2 className="size-5" /> : <RotateCcw className="size-5" />}
              </div>
              <div>
                <CardTitle className="font-serif text-lg text-stone-100 font-normal">
                  {confirmLabel}
                </CardTitle>
                <p className="font-sans text-xs text-stone-400 mt-1.5 leading-relaxed">
                  {pendingAction.kind === "purge" ? (
                    <>
                      This action cannot be undone. The trash records and every CMS reference to these
                      images will be removed. The underlying Cloudinary assets are retained and will be
                      reclaimed by the backend cleanup job.
                    </>
                  ) : (
                    <>
                      These items return to their original section and slot as working drafts. Publish
                      the section to put them back on the live site.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setPendingAction(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => runBulk(pendingAction.kind, pendingAction.ids)}
                className={`text-xs ${
                  pendingAction.kind === "purge"
                    ? "bg-rose-900 hover:bg-rose-800 text-rose-50"
                    : "bg-emerald-900 hover:bg-emerald-800 text-emerald-50"
                }`}
              >
                {pendingAction.kind === "purge" ? "Delete Permanently" : "Restore"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default TrashModal;

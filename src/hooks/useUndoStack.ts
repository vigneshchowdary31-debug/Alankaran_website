import { useRef, useCallback } from "react";
import { showUndoToast } from "@/utils/toast";

export interface UndoOptions {
  /** Duration in ms before the operation commits (default: 5000) */
  durationMs?: number;
}

/**
 * Phase 7 Undo Stack Hook (Task 2).
 * Provides a 5-second grace window for reversible operations (delete, reorder).
 *
 * Usage:
 * ```tsx
 * const { executeWithUndo } = useUndoStack();
 *
 * await executeWithUndo(
 *   "Image deleted",
 *   "Click Undo to restore it to your gallery draft.",
 *   async () => await cmsService.softDeleteSlot(...),   // commit action
 *   async () => await cmsService.saveSlot(...)           // undo action
 * );
 * ```
 */
export function useUndoStack() {
  const pendingUndoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoFnRef = useRef<(() => Promise<void>) | null>(null);

  const executeWithUndo = useCallback(
    async (
      toastTitle: string,
      toastDescription: string,
      commitFn: () => Promise<void>,
      undoFn: () => Promise<void>,
      options: UndoOptions = {}
    ) => {
      const { durationMs = 5000 } = options;

      // Cancel any previous pending undo (only 1 undo slot at a time)
      if (pendingUndoRef.current) {
        clearTimeout(pendingUndoRef.current);
        pendingUndoRef.current = null;
        // If there was a pending action, commit it immediately before starting new one
        if (undoFnRef.current) {
          undoFnRef.current = null;
        }
      }

      // Store undo function for the grace period
      undoFnRef.current = undoFn;

      let undoWasTriggered = false;

      const handleUndo = async () => {
        undoWasTriggered = true;
        if (pendingUndoRef.current) {
          clearTimeout(pendingUndoRef.current);
          pendingUndoRef.current = null;
        }
        undoFnRef.current = null;
        try {
          await undoFn();
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn("[useUndoStack] Undo action failed:", err);
          }
        }
      };

      // Show toast with Undo button for the grace period
      showUndoToast(toastTitle, toastDescription, handleUndo, durationMs);

      // Schedule commit after grace period
      pendingUndoRef.current = setTimeout(async () => {
        pendingUndoRef.current = null;
        undoFnRef.current = null;
        if (!undoWasTriggered) {
          try {
            await commitFn();
          } catch (err) {
            if (import.meta.env.DEV) {
              console.warn("[useUndoStack] Commit action failed:", err);
            }
          }
        }
      }, durationMs);
    },
    []
  );

  return { executeWithUndo };
}

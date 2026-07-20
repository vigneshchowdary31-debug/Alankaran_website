import { toast } from "@/hooks/use-toast";
import React from "react";

/**
 * Phase 7 Unified Toast Notification Service.
 * Wraps Radix Toast infrastructure with consistent CMS-branded variants:
 * success, error, warning, info, loading (dismissible), and undo (with action).
 */

export const notificationService = {
  showSuccess(title: string, description?: string): void {
    toast({
      title,
      description,
      variant: "default",
      duration: 4000,
    });
  },

  showError(title: string, description?: string): void {
    toast({
      title,
      description,
      variant: "destructive",
      duration: 6000,
    });
  },

  /**
   * Shows a toast with an Undo action button.
   * `onUndo` is called if the user clicks Undo within the toast duration.
   */
  showUndoToast(
    title: string,
    description: string,
    onUndo: () => void,
    durationMs: number = 5000
  ): void {
    toast({
      title,
      description,
      variant: "default",
      duration: durationMs,
      action: React.createElement(
        "button",
        {
          type: "button",
          onClick: onUndo,
          className:
            "shrink-0 rounded-md border border-gold/40 bg-gold/10 px-3 py-1.5 text-[11px] font-mono font-semibold text-gold hover:bg-gold/20 transition-colors focus:outline-none focus:ring-1 focus:ring-gold",
        },
        "Undo"
      ) as any,
    });
  },
};

export const { showSuccess, showError, showUndoToast } = notificationService;

export default notificationService;

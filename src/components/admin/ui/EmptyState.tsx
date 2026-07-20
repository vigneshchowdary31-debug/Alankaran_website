import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  /** Lucide-style icon component */
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  /** Optional call-to-action */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Phase 7 Reusable Empty State Component (Task 8).
 * Luxury dark-mode design used across Gallery, Trash, Activity Log, Search, and Version History.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-20 px-6 rounded-2xl border border-dashed border-stone-800/60 bg-black/20 select-none animate-fade-in",
        className
      )}
      role="status"
      aria-label={title}
    >
      {Icon && (
        <div className="size-16 rounded-2xl bg-gold/8 border border-gold/20 flex items-center justify-center mb-5 shadow-inner">
          <Icon className="size-7 text-gold/60" aria-hidden="true" />
        </div>
      )}

      <h3 className="font-serif text-xl text-stone-200 font-normal mb-2">{title}</h3>

      {description && (
        <p className="font-sans text-xs text-stone-400 leading-relaxed max-w-sm mb-6">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <Button
          type="button"
          size="sm"
          onClick={onAction}
          className="gap-2 bg-gold text-nizami-dark hover:bg-gold-light font-semibold text-xs font-sans shadow-lg"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

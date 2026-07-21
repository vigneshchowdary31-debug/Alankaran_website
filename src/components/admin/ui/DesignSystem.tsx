import React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared admin design-system primitives.
 *
 * Presentational only — no data, no business logic. These exist so every admin page composes from
 * the same building blocks (consistent spacing, one status-pill style, one card shape) instead of
 * bespoke per-page markup. Transitions are kept to 150ms per the design brief.
 */

// ── PageContainer ──────────────────────────────────────────────────────────
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-8 animate-fade-in", className)}>{children}</div>;
}

// ── StatusBadge ────────────────────────────────────────────────────────────
export type StatusTone = "published" | "draft" | "archived" | "connected" | "offline" | "neutral";

const STATUS_STYLES: Record<StatusTone, string> = {
  published: "text-emerald-400 border-emerald-800/60 bg-emerald-950/30",
  connected: "text-emerald-400 border-emerald-800/60 bg-emerald-950/30",
  draft: "text-amber-400 border-amber-800/60 bg-amber-950/30",
  offline: "text-amber-400 border-amber-800/60 bg-amber-950/30",
  archived: "text-stone-400 border-stone-700/60 bg-stone-900/40",
  neutral: "text-stone-300 border-stone-700/60 bg-stone-900/40",
};

const STATUS_LABELS: Partial<Record<StatusTone, string>> = {
  published: "Published",
  draft: "Draft",
  archived: "Archived",
  connected: "Connected",
  offline: "Offline",
};

/**
 * The single status-pill used across the CMS. Pass a `tone`; the label defaults to a friendly word
 * but can be overridden with children.
 */
export function StatusBadge({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: StatusTone;
  dot?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors duration-150",
        STATUS_STYLES[tone],
        className
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", tone === "published" || tone === "connected" ? "bg-emerald-400" : tone === "draft" || tone === "offline" ? "bg-amber-400" : "bg-stone-400")} />}
      {children ?? STATUS_LABELS[tone] ?? tone}
    </span>
  );
}

// ── StatsCard ──────────────────────────────────────────────────────────────
export function StatsCard({
  label,
  value,
  icon: Icon,
  loading = false,
  compact = false,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="bg-black/30 border border-stone-800/80 rounded-2xl p-5 hover:border-gold/40 transition-colors duration-150 h-full">
      {Icon && (
        <span className="size-9 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mb-3">
          <Icon className="size-4" />
        </span>
      )}
      <p className={cn("font-serif text-stone-100 leading-none", compact ? "text-xl" : "text-3xl")}>
        {loading ? <span className="inline-block h-7 w-14 rounded bg-stone-800 animate-pulse" /> : value}
      </p>
      <p className="text-[13px] text-stone-400 mt-1.5">{label}</p>
    </div>
  );
}

// ── SectionCard ────────────────────────────────────────────────────────────
/**
 * A flat card: title + optional description + content + optional footer actions. Deliberately single
 * bordered container (no cards-inside-cards) per the design brief.
 */
export function SectionCard({
  title,
  description,
  actions,
  footer,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-black/30 border border-stone-800/80 rounded-2xl", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-stone-800/60">
          <div className="min-w-0">
            {title && <h2 className="font-serif text-lg text-stone-100">{title}</h2>}
            {description && <p className="text-[13px] text-stone-400 mt-1">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className="p-6">{children}</div>
      {footer && <footer className="px-6 py-4 border-t border-stone-800/60 flex flex-wrap items-center gap-2">{footer}</footer>}
    </section>
  );
}

// ── FormSection ────────────────────────────────────────────────────────────
/**
 * A labelled group of form fields, laid out two-up on larger screens to cut vertical scrolling.
 */
export function FormSection({
  title,
  description,
  icon: Icon,
  children,
  columns = 2,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <div className="py-5 border-b border-stone-800/60 last:border-b-0">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="size-4 text-gold" />}
        <h3 className="font-serif text-base text-stone-200">{title}</h3>
      </div>
      {description && <p className="text-xs text-stone-500 mb-3 -mt-1">{description}</p>}
      <div className={cn("grid gap-4", columns === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
        {children}
      </div>
    </div>
  );
}

// ── InfoPanel ──────────────────────────────────────────────────────────────
export function InfoPanel({
  tone = "info",
  icon: Icon,
  children,
  className,
}: {
  tone?: "info" | "warning" | "success";
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-sky-950/30 border-sky-900/60 text-sky-300",
    warning: "bg-amber-950/30 border-amber-900/60 text-amber-300",
    success: "bg-emerald-950/30 border-emerald-900/60 text-emerald-300",
  };
  return (
    <div className={cn("flex items-start gap-2.5 px-4 py-3 rounded-xl border text-[13px] leading-relaxed", tones[tone], className)}>
      {Icon && <Icon className="size-4 mt-0.5 shrink-0" />}
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ── ActionToolbar ──────────────────────────────────────────────────────────
/**
 * A sticky bar for primary page actions / search. Sticks to the top of the scroll area on scroll.
 */
export function ActionToolbar({
  left,
  right,
  sticky = false,
  className,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 bg-black/40 border border-stone-800/80 rounded-2xl px-4 py-3 backdrop-blur-sm",
        sticky && "sticky top-2 z-20",
        className
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">{left}</div>
      <div className="flex items-center gap-2 flex-wrap">{right}</div>
    </div>
  );
}

import React from "react";
import { Loader2Icon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export interface LoaderProps {
  text?: string;
  className?: string;
}

/**
 * FullScreenLoader: Displays an immersive, luxury dark backdrop centered loader
 * for initial session verification, protected routes, and major state transitions.
 */
export function FullScreenLoader({ text = "Loading Alankaran CMS...", className }: LoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-nizami-dark/95 backdrop-blur-md select-none">
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <div className="relative flex items-center justify-center size-14 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-gold/20 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" />
          <Sparkles className="size-5 text-gold animate-pulse" />
        </div>
        {text && (
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-stone-300 font-light animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * PageLoader: Lightweight page-level loading state for route transitions.
 */
export function PageLoader({ text = "Loading section...", className }: LoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-24 text-center select-none", className)}>
      <div className="relative flex items-center justify-center size-10 mb-3">
        <div className="absolute inset-0 rounded-full border-2 border-gold/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" />
        <span className="font-serif text-gold text-[10px]">✦</span>
      </div>
      {text && (
        <p className="font-sans text-xs tracking-[0.15em] uppercase text-stone-400 font-light">
          {text}
        </p>
      )}
    </div>
  );
}

/**
 * ButtonLoader: Minimal inline spinning indicator specifically for buttons during form submission.
 */
export function ButtonLoader({ text, className }: LoaderProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-sans text-xs select-none", className)}>
      <Loader2Icon className="size-4 animate-spin shrink-0 text-current" />
      {text && <span>{text}</span>}
    </span>
  );
}

/**
 * SectionLoader: Component-level loading indicator inside cards or dashboard sections.
 */
export function SectionLoader({ text = "Loading data...", className }: LoaderProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3 py-12 px-6 border border-dashed border-stone-800 rounded-xl bg-stone-950/40 text-stone-400 text-xs font-sans select-none", className)}>
      <Loader2Icon className="size-4 animate-spin text-gold shrink-0" />
      <span>{text}</span>
    </div>
  );
}

/**
 * SkeletonCard: Luxury shimmer placeholder representing a phase card or image item before content loads.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={cn("bg-stone-950/40 border-stone-800/60 p-5 space-y-4 animate-pulse select-none", className)}>
      <CardHeader className="p-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="size-10 rounded-xl bg-stone-900 border border-stone-800" />
          <div className="w-16 h-5 rounded-full bg-stone-900 border border-stone-800" />
        </div>
        <div className="w-1/3 h-3 rounded bg-stone-900" />
        <div className="w-3/4 h-5 rounded bg-stone-850" />
      </CardHeader>
      <CardContent className="p-0 pt-2 space-y-2">
        <div className="w-full h-3 rounded bg-stone-900" />
        <div className="w-5/6 h-3 rounded bg-stone-900" />
        <div className="pt-4 border-t border-stone-800/60 flex items-center justify-between">
          <div className="w-1/2 h-3 rounded bg-stone-900" />
        </div>
      </CardContent>
    </Card>
  );
}

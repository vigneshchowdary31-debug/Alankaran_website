import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useSection } from "../hooks/useSection";
import type { SectionKey } from "../types";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionCardProps {
  sectionKey: SectionKey | string;
  title: string;
  description: string;
  children: React.ReactNode;
}

/**
 * Reusable CMS Section Card wrapper (`Task 3 & 10`).
 * Automatically displays loading indicators, sync health badges, and error banners for a Firestore section.
 */
export function SectionCard({ sectionKey, title, description, children }: SectionCardProps) {
  const { status, error, section, refresh } = useSection(sectionKey);

  const slotCount = Object.keys(section.slots || {}).length;

  return (
    <Card className="bg-stone-900/40 border-stone-800 rounded-2xl overflow-hidden mb-8">
      <CardHeader className="border-b border-stone-800/80 bg-black/20 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CardTitle className="font-serif text-xl font-normal text-stone-100">{title}</CardTitle>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
              {sectionKey.toUpperCase()}
            </span>
          </div>
          <CardDescription className="font-sans text-xs text-stone-400">{description}</CardDescription>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-mono text-stone-300">
              {slotCount} {slotCount === 1 ? "Slot" : "Slots"} Configured
            </p>
            <p className="text-[10px] font-mono text-stone-500">
              Last Synced: {new Date(section.updatedAt).toLocaleTimeString()}
            </p>
          </div>

          {status === "loading" ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800/80 text-stone-300 border border-stone-700 text-xs font-mono">
              <Loader2 className="size-3.5 animate-spin text-gold" />
              <span>Syncing...</span>
            </div>
          ) : status === "error" ? (
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-950/80 text-red-300 border border-red-800/80 hover:bg-red-900/80 text-xs font-mono transition-colors"
            >
              <AlertCircle className="size-3.5 text-red-400" />
              <span>Retry Sync</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 text-xs font-mono">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>In Sync</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-xs font-sans text-red-300 flex items-center justify-between">
            <span>Sync Error: {error}</span>
            <button onClick={refresh} className="underline font-semibold hover:text-red-200">
              Reload
            </button>
          </div>
        )}

        {children}
      </CardContent>
    </Card>
  );
}

import React from "react";
import { cn } from "@/lib/utils";

interface LoaderProps {
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export function Loader({
  text = "Loading CMS...",
  fullScreen = false,
  className,
}: LoaderProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      <div className="relative flex items-center justify-center size-12 mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-gold/20 animate-pulse" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" />
        <span className="font-serif text-gold text-xs font-semibold">✦</span>
      </div>
      {text && (
        <p className="font-sans text-xs tracking-[0.2em] uppercase text-stone-400 font-light animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-nizami-dark/95 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}

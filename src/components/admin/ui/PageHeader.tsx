import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-8 border-b border-gold/15",
        className
      )}
    >
      <div>
        {badge && (
          <span className="inline-block px-2.5 py-0.5 mb-2 text-[10px] font-sans font-semibold tracking-wider uppercase bg-gold/10 text-gold border border-gold/20 rounded-full">
            {badge}
          </span>
        )}
        <h1 className="font-serif text-3xl md:text-4xl text-stone-100 font-normal tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="font-sans text-sm text-stone-400 font-light mt-1 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
    </div>
  );
}

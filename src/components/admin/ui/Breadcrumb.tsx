import React from "react";
import { Link } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

/**
 * Reusable Breadcrumb component for Alankaran CMS navigation hierarchy.
 * E.g., Dashboard / Images / Hero Banner
 */
export function AdminBreadcrumb({ items = [], className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-1.5 font-sans text-xs text-stone-400 mb-4 select-none", className)}
    >
      <Link
        href={ROUTES.ADMIN.DASHBOARD}
        className="flex items-center gap-1 hover:text-gold transition-colors focus:outline-none focus:underline"
      >
        <Home className="size-3.5" />
        <span>Dashboard</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="size-3 text-stone-600 shrink-0" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-gold transition-colors focus:outline-none focus:underline truncate max-w-[150px]"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn("truncate max-w-[200px]", isLast ? "text-stone-200 font-medium" : "text-stone-400")}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

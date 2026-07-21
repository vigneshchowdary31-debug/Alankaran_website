import React from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Button } from "@/components/admin/ui";
import { GlobalSettingsManager } from "@/domains/cms";
import { ROUTES } from "@/constants/routes";

/**
 * Global Website Settings — logo, contact details, and social links used across the website.
 */
export function AdminSettings() {
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  return (
    <div className="space-y-6 animate-fade-in select-none">
      <PageHeader
        title="Global Website Settings"
        description="Manage your logo, contact information and social media links used across the website."
      >
        <Link href={ROUTES.ADMIN.DASHBOARD}>
          <Button variant="outline" size="sm" className="gap-2 text-sm font-sans focus-visible:ring-2 focus-visible:ring-gold/60">
            <ArrowLeft className="size-3.5" />
            <span>Back</span>
          </Button>
        </Link>
      </PageHeader>

      {/* Compact status note (~52px). */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-800/70 bg-black/20 text-[13px]">
        <span className={`size-2 rounded-full ${online ? "bg-emerald-400" : "bg-amber-400"}`} />
        <span className="text-white/80">{online ? "Connected" : "Offline"}</span>
        <span className="text-white/25">·</span>
        <span className="text-white/55">Changes are saved as drafts until you publish.</span>
      </div>

      <GlobalSettingsManager />
    </div>
  );
}

export default AdminSettings;

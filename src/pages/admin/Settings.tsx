import React from "react";
import { Link } from "wouter";
import { ArrowLeft, Globe } from "lucide-react";
import { PageHeader, AdminBreadcrumb, Button, Card, CardTitle, CardDescription } from "@/components/admin/ui";
import { GlobalSettingsManager, CMSStatusBanner } from "@/domains/cms";
import { TOTAL_GLOBAL_SETTINGS } from "@/domains/cms/utils/globalSettingsValidator";
import { ROUTES } from "@/constants/routes";

/**
 * Global Website Settings.
 *
 * Scope is deliberately limited to settings the website actually renders — the audit confirmed a
 * live consumer for each one. Anything without a consumer is not editable here, because a CMS field
 * that changes nothing is worse than no field at all.
 */
export function AdminSettings() {
  return (
    <div className="space-y-8 animate-fade-in select-none">
      <AdminBreadcrumb items={[{ label: "Global Settings", href: ROUTES.ADMIN.SETTINGS }]} />

      <PageHeader
        badge="Live Website Integration Active"
        title="Global Website Settings"
        description={`The website logo plus the ${TOTAL_GLOBAL_SETTINGS} site-wide text settings. Every phone number, email, WhatsApp link, address, map and social icon on the public site reads from here.`}
      >
        <Link href={ROUTES.ADMIN.DASHBOARD}>
          <Button variant="outline" size="sm" className="gap-2 text-xs font-sans">
            <ArrowLeft className="size-3.5" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      </PageHeader>

      <CMSStatusBanner />

      <GlobalSettingsManager />

      <Card className="bg-black/25 border-emerald-900/40 p-6 rounded-2xl flex items-start gap-4">
        <div className="size-10 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
          <Globe className="size-5" />
        </div>
        <div>
          <CardTitle className="font-serif text-base text-stone-200 mb-1 font-normal">
            One Source of Truth
          </CardTitle>
          <CardDescription className="text-xs font-sans text-stone-400 leading-relaxed">
            These values are consumed through <code className="font-mono text-stone-300">useContactInfo()</code>,
            so there are no hardcoded phone numbers, emails, or social links left anywhere on the
            public website. Saving updates the draft; the live site changes only when you
            <strong className="text-gold"> Publish</strong>. Use Preview Mode on the public site to
            check a draft before publishing.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}

export default AdminSettings;

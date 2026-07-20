import React from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Images as ImagesIcon } from "lucide-react";
import { PageHeader, Card, CardHeader, CardTitle, CardDescription, CardContent, Alert, AlertDescription, AdminBreadcrumb, Button } from "@/components/admin/ui";
import { SlotManager, CMSStatusBanner } from "@/domains/cms";
import { SLOT_CATALOG, TOTAL_CATALOG_SLOTS } from "@/domains/cms/constants";
import { cloudinaryConfig } from "@/config/cloudinary";
import { ROUTES } from "@/constants/routes";

/**
 * Administrative Page Images Manager.
 *
 * Phase A Task 2: every editor on this page is generated from `SLOT_CATALOG`. There are no hardcoded
 * SlotManagers — adding a slot to the catalog is the only step needed to make it editable here.
 * The `gallery` section is intentionally absent: it is a dynamic collection managed at /admin/gallery.
 */
export function AdminImages() {
  const isConfigured = cloudinaryConfig.isConfigured;

  return (
    <div className="space-y-8 animate-fade-in select-none">
      <AdminBreadcrumb
        items={[
          { label: "Page Images", href: ROUTES.ADMIN.IMAGES },
        ]}
      />

      {/* Page Header */}
      <PageHeader
        badge="Live Website Integration Active"
        title="Page Images & Hero Banner Manager"
        description={`Direct browser-to-Cloudinary image replacement with automatic Firestore persistence (\`cmsSiteContent\`). Every one of the ${TOTAL_CATALOG_SLOTS} named image slots on the public website is editable below.`}
      >
        <Link href={ROUTES.ADMIN.DASHBOARD}>
          <Button variant="outline" size="sm" className="gap-2 text-xs font-sans">
            <ArrowLeft className="size-3.5" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      </PageHeader>

      {/* Status Banner (`Task 1 & Task 12`) */}
      <CMSStatusBanner />

      {/* Cloudinary Environment Status Banner */}
      <Alert
        className={
          isConfigured
            ? "bg-emerald-950/30 border-emerald-800/80 p-5 rounded-2xl shadow-xl"
            : "bg-amber-950/40 border-amber-800/80 p-5 rounded-2xl shadow-xl"
        }
      >
        <div className="flex items-start gap-4">
          <div
            className={
              isConfigured
                ? "size-10 rounded-xl bg-emerald-900/60 border border-emerald-700 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5"
                : "size-10 rounded-xl bg-amber-900/60 border border-amber-700 flex items-center justify-center text-amber-400 shrink-0 mt-0.5"
            }
          >
            {isConfigured ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-serif text-base text-stone-100 font-normal">
                {isConfigured
                  ? "Cloudinary Storage Connection Verified"
                  : "Cloudinary Credentials Requirement Notice"}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider border border-stone-700 bg-stone-900 text-stone-300">
                Provider: Cloudinary CDN
              </span>
            </div>

            <AlertDescription className="text-xs font-sans text-stone-300 font-light mt-1.5 leading-relaxed">
              {isConfigured ? (
                <>
                  Connected to Cloudinary account <strong className="text-gold">{cloudinaryConfig.cloudName}</strong> using preset <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-emerald-300">{cloudinaryConfig.uploadPreset}</code>. Uploaded images are automatically compressed and converted (`f_auto, q_auto`).
                </>
              ) : (
                <>
                  Your environment is currently using placeholder Cloudinary credentials (<code className="font-mono bg-black/50 px-1 py-0.5 rounded text-amber-300">VITE_CLOUDINARY_CLOUD_NAME</code> in <code className="font-mono">.env</code>). To execute real CDN uploads, update your `.env` configuration with your live Cloudinary cloud name and unsigned upload preset.
                </>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>

      {/* Catalog-driven editors (`Phase A Task 2`) */}
      {SLOT_CATALOG.map((section) => (
        <section key={section.sectionKey} className="space-y-5">
          <div className="flex items-end justify-between flex-wrap gap-2 border-b border-stone-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-gold px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                  {section.sectionKey} section
                </span>
                <span className="text-[11px] font-mono text-stone-500">
                  {section.slots.length} {section.slots.length === 1 ? "slot" : "slots"}
                </span>
              </div>
              <h2 className="font-serif text-2xl text-stone-100 font-normal">{section.title}</h2>
              <p className="font-sans text-xs text-stone-400 font-light mt-1 max-w-2xl">
                {section.description}
              </p>
            </div>
            <div className="text-[11px] font-mono text-stone-500 text-right shrink-0">
              <div>Folder: {section.folder}</div>
              <div>Firestore: cmsSiteContent/{section.sectionKey}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {section.slots.map((slot) => (
              <Card
                key={slot.slotName}
                className="bg-black/30 border-gold/25 rounded-2xl p-6 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="p-0 mb-6 border-b border-stone-800/80 pb-4">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-gold px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                        {section.sectionKey} slot
                      </span>
                      <span className="text-[11px] font-mono text-stone-500 truncate">
                        Key: {slot.slotName}
                      </span>
                    </div>
                    <CardTitle className="font-serif text-xl text-stone-100 font-normal">
                      {slot.label}
                    </CardTitle>
                    <CardDescription className="text-xs font-sans text-stone-400 font-light mt-1">
                      {slot.usage}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0">
                    <SlotManager
                      sectionKey={section.sectionKey}
                      slotName={slot.slotName}
                      label={slot.label}
                      description={slot.description}
                    />
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {/* Gallery pointer — the one section not managed here */}
      <Card className="bg-black/25 border-gold/15 p-6 rounded-2xl flex items-start gap-4">
        <div className="size-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shrink-0">
          <ImagesIcon className="size-5" />
        </div>
        <div className="flex-1">
          <CardTitle className="font-serif text-base text-stone-200 mb-1 font-normal">
            Looking for the Gallery?
          </CardTitle>
          <CardDescription className="text-xs font-sans text-stone-400 leading-relaxed">
            The gallery is an unbounded collection rather than a fixed set of named slots, so it has its
            own manager with bulk upload, drag-to-reorder, categories, and trash. Images published there
            render on the public Gallery page in the order you set.
          </CardDescription>
        </div>
        <Link href={ROUTES.ADMIN.GALLERY}>
          <Button variant="outline" size="sm" className="gap-2 text-xs font-sans shrink-0">
            <span>Open Gallery Manager</span>
          </Button>
        </Link>
      </Card>

      {/* Live integration notice (`Phase A Task 6`) */}
      <Card className="bg-black/25 border-emerald-900/40 p-6 rounded-2xl">
        <CardTitle className="font-serif text-base text-stone-200 mb-2 font-normal flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-400" /> Live Website Integration Is Active
        </CardTitle>
        <CardDescription className="text-xs font-sans text-stone-400 leading-relaxed">
          Uploads are processed client-side, sent to Cloudinary, and their metadata (<code className="font-mono text-stone-300">id</code>, <code className="font-mono text-stone-300">url</code>, <code className="font-mono text-stone-300">cloudinaryId</code>, <code className="font-mono text-stone-300">width</code>, <code className="font-mono text-stone-300">height</code>, <code className="font-mono text-stone-300">format</code>, <code className="font-mono text-stone-300">sizeBytes</code>, <code className="font-mono text-stone-300">updatedAt</code>) is saved into <code className="font-mono text-gold">cmsSiteContent/[sectionKey]</code>. The public website reads that same data through <strong className="text-stone-300">SiteContentProvider</strong>, so a slot goes live as soon as you <strong className="text-gold">Publish</strong> it — uploading alone updates the draft only. Use <strong className="text-stone-300">Preview Mode</strong> on the public site to view drafts before publishing, and check <Link href={ROUTES.ADMIN.DEBUG} className="text-gold underline underline-offset-2">Diagnostics</Link> for live slot coverage.
        </CardDescription>
      </Card>
    </div>
  );
}

import React from "react";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { PageHeader, Card, CardHeader, CardTitle, CardDescription, CardContent, Alert, AlertDescription, AdminBreadcrumb, Button } from "@/components/admin/ui";
import { SlotManager, CMSStatusBanner } from "@/domains/cms";
import { cloudinaryConfig } from "@/config/cloudinary";
import { ROUTES } from "@/constants/routes";

/**
 * Phase 3 Administrative Dashboard Page: Page Images & Hero Banner Manager.
 * Connects directly to `storageProvider` (Cloudinary CDN) and `cmsService` (Firestore persistence).
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
        badge="Phase 3 Firestore Data Layer & Cloudinary CDN Active"
        title="Page Images & Hero Banner Manager"
        description="Direct browser-to-Cloudinary image replacement tool with automatic Firestore schema persistence (`cms/siteContent`). Upload, compress, and verify imagery for your primary slots across multi-tab sessions."
      >
        <Link href={ROUTES.ADMIN.DASHBOARD}>
          <Button variant="outline" size="sm" className="gap-2 text-xs font-sans">
            <ArrowLeft className="size-3.5" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      </PageHeader>

      {/* Phase 3 Status Banner (`Task 1 & Task 12`) */}
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

      {/* Uploader Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Slot 1: Hero Main Banner */}
        <Card className="bg-black/30 border-gold/25 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <CardHeader className="p-0 mb-6 border-b border-stone-800/80 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-gold px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                  Hero Slot
                </span>
                <span className="text-[11px] font-mono text-stone-500">Key: hero_main</span>
              </div>
              <CardTitle className="font-serif text-xl text-stone-100 font-normal">
                Hero Section Main Banner
              </CardTitle>
              <CardDescription className="text-xs font-sans text-stone-400 font-light mt-1">
                Primary luxury background displayed above the fold on the home page.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <SlotManager
                sectionKey="hero"
                slotName="hero_main"
                label="Hero Main Banner"
                description="Recommended size: 1920 × 1080 px (Landscape format). WebP or JPG preferred."
              />
            </CardContent>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-800/60 text-[11px] font-mono text-stone-500 flex items-center justify-between">
            <span>Target folder: alankaran_website/hero</span>
            <span>Firestore path: cms/siteContent/hero</span>
          </div>
        </Card>

        {/* Slot 2: About Us Royal Couple Portrait */}
        <Card className="bg-black/30 border-gold/25 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <CardHeader className="p-0 mb-6 border-b border-stone-800/80 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-gold px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                  About Slot
                </span>
                <span className="text-[11px] font-mono text-stone-500">Key: about_portrait</span>
              </div>
              <CardTitle className="font-serif text-xl text-stone-100 font-normal">
                About Section — Royal Couple Portrait
              </CardTitle>
              <CardDescription className="text-xs font-sans text-stone-400 font-light mt-1">
                Featured vertical portrait displayed inside the golden arch frame on the About page.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <SlotManager
                sectionKey="about"
                slotName="about_portrait"
                label="Royal Couple Portrait"
                description="Recommended size: 1080 × 1350 px (Vertical 4:5 aspect ratio). High-res portrait."
              />
            </CardContent>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-800/60 text-[11px] font-mono text-stone-500 flex items-center justify-between">
            <span>Target folder: alankaran_website/about</span>
            <span>Firestore path: cms/siteContent/about</span>
          </div>
        </Card>

        {/* Slot 3: Services Mandap Decor Cover */}
        <Card className="bg-black/30 border-gold/25 rounded-2xl p-6 shadow-xl flex flex-col justify-between lg:col-span-2">
          <div>
            <CardHeader className="p-0 mb-6 border-b border-stone-800/80 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-gold px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                  Services Slot
                </span>
                <span className="text-[11px] font-mono text-stone-500">Key: service_mandap</span>
              </div>
              <CardTitle className="font-serif text-xl text-stone-100 font-normal">
                Services Section — Royal Mandap Decor Cover
              </CardTitle>
              <CardDescription className="text-xs font-sans text-stone-400 font-light mt-1">
                Wide architectural decor cover photo showcased in the wedding services portfolio.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <SlotManager
                sectionKey="services"
                slotName="service_mandap"
                label="Royal Mandap Decor Cover"
                description="Recommended size: 1600 × 900 px (Wide landscape). Showcases vibrant decor details."
              />
            </CardContent>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-800/60 text-[11px] font-mono text-stone-500 flex items-center justify-between">
            <span>Target folder: alankaran_website/services</span>
            <span>Firestore path: cms/siteContent/services</span>
          </div>
        </Card>
      </div>

      {/* Phase 3 Isolation Architecture Notice (`Task 3 & Strict Rules`) */}
      <Card className="bg-black/25 border-gold/15 p-6 rounded-2xl">
        <CardTitle className="font-serif text-base text-stone-200 mb-2 font-normal flex items-center gap-2">
          <ShieldAlert className="size-4 text-gold" /> Phase 3 Architecture & Scope Notice
        </CardTitle>
        <CardDescription className="text-xs font-sans text-stone-400 leading-relaxed">
          You are currently managing image slots inside <strong className="text-gold">Phase 3 (Firestore Data Layer & Cloudinary CDN)</strong>. Uploaded assets are processed client-side, uploaded to Cloudinary, and their complete metadata (`id`, `url`, `cloudinaryId`, `width`, `height`, `format`, `sizeBytes`, `updatedAt`) is saved directly into Firestore (`cms/siteContent/[sectionKey]`). Per strict project roadmap rules, <strong className="text-stone-300">Phase 4 (Live Public Website Integration via SiteContentProvider) has NOT been initiated yet</strong>. Uploading and replacing images here stores metadata permanently and updates the CMS administrative UI across all tabs right away (`Task 13`) without altering any live public website components.
        </CardDescription>
      </Card>
    </div>
  );
}

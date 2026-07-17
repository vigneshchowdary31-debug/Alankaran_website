import React from "react";
import { Link } from "wouter";
import {
  Sparkles,
  Image as ImageIcon,
  Images,
  Database,
  Globe,
  History,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, CardHeader, CardTitle, CardDescription, CardContent, Alert, AdminBreadcrumb } from "@/components/admin/ui";
import { CMSStatusBanner } from "@/domains/cms";
import { ROUTES, APP_CONFIG } from "@/constants";

interface PhaseCardProps {
  phase: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "Completed" | "Up Next" | "Locked";
  href?: string;
}

function PhaseCard({ phase, title, description, icon: Icon, status, href }: PhaseCardProps) {
  const isCompleted = status === "Completed";
  const isNext = status === "Up Next";

  const cardContent = (
    <Card
      className={`
        border transition-all h-full flex flex-col justify-between
        ${
          isCompleted
            ? "bg-black/30 border-gold/40 shadow-lg shadow-gold/5"
            : isNext
            ? "bg-stone-900/40 border-stone-700/80 hover:border-gold/30"
            : "bg-stone-950/40 border-stone-800/60 opacity-70"
        }
      `}
    >
      <CardHeader className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div
            className={`
              size-10 rounded-xl flex items-center justify-center shrink-0 border
              ${
                isCompleted
                  ? "bg-gold/15 border-gold/40 text-gold"
                  : isNext
                  ? "bg-stone-800 border-stone-700 text-stone-200"
                  : "bg-stone-900 border-stone-800 text-stone-500"
              }
            `}
          >
            <Icon className="size-5" />
          </div>
          <span
            className={`
              text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border
              ${
                isCompleted
                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                  : isNext
                  ? "bg-gold/10 text-gold border-gold/30"
                  : "bg-stone-900 text-stone-500 border-stone-800"
              }
            `}
          >
            {status}
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-mono text-stone-400 font-light">{phase}</span>
          <CardTitle className="font-serif text-xl text-stone-100 font-normal">{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0 mt-auto">
        <CardDescription className="text-xs font-sans text-stone-400 leading-relaxed mb-4">
          {description}
        </CardDescription>
        <div className="pt-3 border-t border-stone-800/60 flex items-center justify-between text-xs font-sans">
          {isCompleted ? (
            <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="size-3.5" /> Functional & Active
            </span>
          ) : isNext ? (
            <span className="text-gold flex items-center gap-1 font-medium group">
              Prepare Phase <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          ) : (
            <span className="text-stone-500 flex items-center gap-1.5">
              <Lock className="size-3" /> Scheduled
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href && (isCompleted || isNext)) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
}

export function AdminDashboard() {
  const { currentUser } = useAuth();

  const roadmapPhases: PhaseCardProps[] = [
    {
      phase: "Phase 1 & 1.5",
      title: "Authentication & Architecture",
      description: "Modular Firebase SDK, typed configuration, error boundaries, memoized context, and configuration-driven navigation.",
      icon: ShieldCheck,
      status: "Completed",
    },
    {
      phase: "Phase 2",
      title: "Cloudinary Uploader",
      description: "Direct browser-to-Cloudinary image upload preset integration, auto-WebP conversion, and validation cards.",
      icon: ImageIcon,
      status: "Completed",
      href: ROUTES.ADMIN.IMAGES,
    },
    {
      phase: "Phase 3",
      title: "Firestore Data Layer",
      description: "NoSQL JSON schema management in Firestore (`cms/siteContent`), storing exact URLs, alt tags, and section keys.",
      icon: Database,
      status: "Completed",
      href: ROUTES.ADMIN.IMAGES,
    },
    {
      phase: "Phase 4",
      title: "Live Website Integration",
      description: "Connect frontend components via `SiteContentProvider` with 0ms local caching and instant live updates.",
      icon: Globe,
      status: "Up Next",
    },
    {
      phase: "Phase 5",
      title: "Gallery Management",
      description: "Interactive portfolio grid with drag & drop reordering, categorizations, and bulk multi-file uploads.",
      icon: Images,
      status: "Locked",
      href: ROUTES.ADMIN.GALLERY,
    },
    {
      phase: "Phase 6",
      title: "Production Polish & Backup",
      description: "Audit trail activity logging, automated JSON backup rollback, accessibility polish, and error monitoring.",
      icon: History,
      status: "Locked",
      href: ROUTES.ADMIN.ACTIVITY,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <AdminBreadcrumb items={[{ label: "Overview" }]} />

      {/* Page Header */}
      <PageHeader
        badge="Phase 3 Active"
        title={`Welcome to ${APP_CONFIG.CMS_TITLE}`}
        description="Your custom, zero-deployment image management dashboard designed specifically for non-technical administrators."
      />

      {/* Phase 3 Status & Offline Banner */}
      <CMSStatusBanner />

      {/* Account & Session Status Banner */}
      <Alert className="bg-black/40 border-gold/30 p-6 rounded-2xl backdrop-blur-sm shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shrink-0 shadow-inner">
              <Sparkles className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl text-stone-100 font-normal">Active Session Verified</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Secure TLS
                </span>
              </div>
              <p className="font-sans text-xs text-stone-400 font-light mt-1">
                Authenticated account: <strong className="text-stone-200 font-medium">{currentUser?.email}</strong>
              </p>
              <p className="font-mono text-[10px] text-stone-500 mt-1">
                UID: {currentUser?.uid}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-stone-800/80 shrink-0">
            <div className="text-left md:text-right">
              <p className="text-[10px] font-sans uppercase tracking-widest text-stone-400 font-light">System Version</p>
              <p className="font-mono text-xs text-gold font-semibold mt-0.5">{APP_CONFIG.CMS_VERSION}</p>
            </div>
            <div className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
        </div>
      </Alert>

      {/* Roadmap & Feature Placeholder Cards */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-2xl text-stone-100 font-normal">CMS Development Roadmap</h2>
            <p className="font-sans text-xs text-stone-400 font-light mt-0.5">
              Review our 6-phase development strategy. Phase 1, Phase 2, and Phase 3 (Firestore Data Layer) are complete and operational.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roadmapPhases.map((card) => (
            <PhaseCard key={card.phase} {...card} />
          ))}
        </div>
      </div>

      {/* Architecture & Instructions Card */}
      <Card className="bg-black/25 border-gold/15 p-6 rounded-2xl">
        <CardTitle className="font-serif text-lg text-stone-200 mb-2 font-normal flex items-center gap-2">
          <ShieldCheck className="size-4 text-gold" /> Architecture Notice: Phase 2 Storage Layer Active
        </CardTitle>
        <CardDescription className="text-xs font-sans text-stone-400 leading-relaxed">
          You are currently running <strong className="text-gold">Phase 2 (Storage Layer & Cloudinary Integration)</strong> of the Custom Image CMS roadmap. All authentication guards, modular storage interfaces (<code className="font-mono text-emerald-400">storageProvider</code>), client-side optimization engines, and CDN upload cards (`/admin/images`) are fully functional. Per strict instructions, <strong className="text-stone-300">Phase 3 (Firestore CRUD) and Phase 4 (Live Public Website Integration) have NOT been initialized yet</strong>.
        </CardDescription>
      </Card>
    </div>
  );
}

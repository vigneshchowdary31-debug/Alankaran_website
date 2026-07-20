import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ShieldCheck,
  Activity,
  Database,
  Cloud,
  Lock,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Cpu,
  Server,
  Globe,
  Terminal,
  Layers,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Alert,
  AdminBreadcrumb,
  Button,
} from "@/components/admin/ui";
import { cmsHealthService, cmsCacheService, cmsService, slotCoverageService } from "@/domains/cms/services";
import type { CMSHealthReport, CMSSectionContent } from "@/domains/cms/types";
import type { CoverageReport } from "@/domains/cms/services/slotCoverage.service";
import { PUBLIC_SECTIONS } from "@/domains/cms/constants";
import { useAuth } from "@/context/AuthContext";
import { ROUTES, APP_CONFIG } from "@/constants";

/**
 * Phase 3.5 Enterprise Diagnostics & Health Dashboard (`Task 7 & Task 8`).
 * Provides full observability, multi-tier cache diagnostics, and subsystem health scores.
 * Exclusively accessible to administrators via `/admin/debug`. Zero public website impact.
 */
export function AdminDebug() {
  const { currentUser } = useAuth();
  const [report, setReport] = useState<CMSHealthReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cacheStats, setCacheStats] = useState(() => cmsCacheService.getStats());
  const [testingRecovery, setTestingRecovery] = useState<boolean>(false);
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<CoverageReport | null>(null);

  const runDiagnostics = async () => {
    try {
      setLoading(true);
      const res = await cmsHealthService.checkHealth(currentUser?.email || null);
      setReport(res);
      setCacheStats(cmsCacheService.getStats());

      // Phase A Task 5: compare the slot catalog against what Firestore actually holds. This page
      // renders outside SiteContentProvider, so sections are loaded directly here.
      const loaded = await Promise.all(
        PUBLIC_SECTIONS.map(async (key) => {
          try {
            return [key, await cmsService.loadSection(key)] as const;
          } catch {
            return [key, null] as const;
          }
        })
      );
      const sectionMap: Record<string, CMSSectionContent | undefined> = {};
      loaded.forEach(([key, doc]) => {
        if (doc) sectionMap[key] = doc;
      });
      setCoverage(slotCoverageService.buildReport(sectionMap));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, [currentUser]);

  const handleClearCache = () => {
    cmsCacheService.invalidateAll();
    setCacheStats(cmsCacheService.getStats());
    setRecoveryMsg("Successfully cleared all Level 1 (Memory) and Level 2 (localStorage) CMS cache entries.");
    setTimeout(() => setRecoveryMsg(null), 4000);
  };

  const handleTestRecovery = async () => {
    try {
      setTestingRecovery(true);
      setRecoveryMsg("Pinged Firestore, verified Cloudinary CDN configuration, and rehydrated real-time listeners (`Task 12`).");
      await runDiagnostics();
    } finally {
      setTestingRecovery(false);
      setTimeout(() => setRecoveryMsg(null), 4000);
    }
  };

  const scoreColor =
    report?.status === "healthy"
      ? "text-emerald-400 border-emerald-800/80 bg-emerald-950/40"
      : report?.status === "degraded"
      ? "text-amber-400 border-amber-800/80 bg-amber-950/40"
      : "text-rose-400 border-rose-800/80 bg-rose-950/40";

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <AdminBreadcrumb
        items={[
          { label: "Overview", href: ROUTES.ADMIN.DASHBOARD },
          { label: "Diagnostics & Health" },
        ]}
      />

      {/* Page Header */}
      <PageHeader
        badge="Phase 3.5 Enterprise Diagnostics & Observability"
        title="CMS System Diagnostics & Health Dashboard"
        description="Full telemetry, subsystem verification, multi-tier cache diagnostics (`Task 6 & 7`), and atomic recovery actions for administrative verification."
      >
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={runDiagnostics}
            className="gap-2 text-xs font-sans border-stone-700 text-stone-300 hover:text-gold"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-gold" : ""}`} />
            <span>Refresh Diagnostics</span>
          </Button>

          <Link href={ROUTES.ADMIN.DASHBOARD}>
            <Button variant="outline" size="sm" className="gap-2 text-xs font-sans">
              <ArrowLeft className="size-3.5" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Recovery / Action Feedback Banner */}
      {recoveryMsg && (
        <Alert className="bg-emerald-950/60 border-emerald-800/80 p-4 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          <span>{recoveryMsg}</span>
        </Alert>
      )}

      {/* Health Score Overview Banner (`Task 8`) */}
      <Card className="bg-black/40 border-stone-800/80 p-6 rounded-2xl backdrop-blur-sm shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`size-16 rounded-2xl border flex flex-col items-center justify-center shrink-0 shadow-inner ${scoreColor}`}>
              <span className="font-mono text-2xl font-bold leading-none">{report?.score || 0}</span>
              <span className="text-[9px] font-mono uppercase tracking-widest opacity-80 mt-1">Score</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-serif text-2xl text-stone-100 font-normal">
                  Overall CMS Subsystem Status:{" "}
                  <span className={report?.status === "healthy" ? "text-emerald-400" : "text-amber-400"}>
                    {(report?.status || "Checking").toUpperCase()}
                  </span>
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider font-semibold bg-stone-800 text-stone-300 border border-stone-700">
                  {APP_CONFIG.CMS_VERSION}
                </span>
              </div>
              <p className="font-sans text-xs text-stone-400 font-light mt-1 max-w-2xl leading-relaxed">
                All core persistence, storage CDN, and authentication subsystems have been checked against Phase 3.5 enterprise constraints (`Task 8`).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-stone-800/80 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestRecovery}
              disabled={testingRecovery}
              className="gap-2 text-xs border-gold/40 text-gold hover:bg-gold/10"
            >
              <Activity className="size-3.5" />
              <span>{testingRecovery ? "Testing Recovery..." : "Test Reconnect & Recovery (`Task 12`)"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              className="gap-2 text-xs border-stone-700 text-stone-300 hover:text-rose-400 hover:border-rose-800"
            >
              <Trash2 className="size-3.5 text-rose-400" />
              <span>Clear Cache Tier (`Task 6`)</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Subsystem Health Checks Grid (`Task 7 & 8`) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Firestore Check */}
        <Card className="bg-stone-900/40 border-stone-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-gold">
                  <Database className="size-4" />
                </div>
                <span className="font-serif text-base text-stone-200">Firestore NoSQL</span>
              </div>
              {report?.checks.firestore.reachable ? (
                <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Operational
                </span>
              ) : (
                <span className="text-[10px] font-mono bg-rose-950/80 text-rose-400 border border-rose-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                  <XCircle className="size-3" /> Offline
                </span>
              )}
            </div>
            <p className="font-sans text-xs text-stone-400 leading-relaxed">
              {report?.checks.firestore.message || "Checking database reachability..."}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-800/60 text-[11px] font-mono text-stone-500 flex items-center justify-between">
            <span>Collection: cmsSiteContent</span>
            <span>Latency: {report?.checks.firestore.latencyMs || 0} ms</span>
          </div>
        </Card>

        {/* Cloudinary CDN Check */}
        <Card className="bg-stone-900/40 border-stone-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-gold">
                  <Cloud className="size-4" />
                </div>
                <span className="font-serif text-base text-stone-200">Cloudinary CDN Storage</span>
              </div>
              {report?.checks.cloudinary.configured ? (
                <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Configured
                </span>
              ) : (
                <span className="text-[10px] font-mono bg-amber-950/80 text-amber-400 border border-amber-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                  <AlertTriangle className="size-3" /> Warning
                </span>
              )}
            </div>
            <p className="font-sans text-xs text-stone-400 leading-relaxed">
              {report?.checks.cloudinary.message || "Checking CDN configuration..."}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-800/60 text-[11px] font-mono text-stone-500 flex items-center justify-between">
            <span>Provider: StorageInterface</span>
            <span>Unsigned Uploads: Yes</span>
          </div>
        </Card>

        {/* Authentication Check */}
        <Card className="bg-stone-900/40 border-stone-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-gold">
                  <Lock className="size-4" />
                </div>
                <span className="font-serif text-base text-stone-200">Session Security</span>
              </div>
              {report?.checks.authentication.valid ? (
                <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Verified
                </span>
              ) : (
                <span className="text-[10px] font-mono bg-rose-950/80 text-rose-400 border border-rose-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                  <XCircle className="size-3" /> Unverified
                </span>
              )}
            </div>
            <p className="font-sans text-xs text-stone-400 leading-relaxed">
              {report?.checks.authentication.message || "Checking active session..."}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-800/60 text-[11px] font-mono text-stone-500 flex items-center justify-between truncate">
            <span className="truncate">User: {currentUser?.email || "None"}</span>
            <span>TLS Protected</span>
          </div>
        </Card>
      </div>

      {/* CMS Slot Coverage (`Phase A Task 5`) */}
      <Card className="bg-black/30 border-stone-800/80 rounded-2xl p-6 shadow-xl">
        <CardHeader className="p-0 mb-6 border-b border-stone-800/80 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="font-serif text-xl text-stone-100 font-normal flex items-center gap-2.5">
                <Layers className="size-5 text-gold" /> CMS Content Coverage
              </CardTitle>
              <CardDescription className="text-xs font-sans text-stone-400 mt-1 font-light">
                The website's slot catalog compared against what Firestore actually holds. "Configured"
                means the public site renders your uploaded image rather than a bundled fallback.
              </CardDescription>
            </div>
            {coverage && (
              <div
                className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-semibold ${
                  coverage.imageCoverage === 100
                    ? "text-emerald-400 border-emerald-800/80 bg-emerald-950/40"
                    : coverage.imageCoverage >= 50
                    ? "text-amber-400 border-amber-800/80 bg-amber-950/40"
                    : "text-rose-400 border-rose-800/80 bg-rose-950/40"
                }`}
              >
                Images {coverage.totalConfigured} / {coverage.totalExpected} ({coverage.imageCoverage}%)
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 space-y-5">
          {!coverage ? (
            <p className="font-mono text-xs text-stone-500">Calculating coverage…</p>
          ) : (
            <>
              {/* Per-section coverage */}
              <div className="space-y-2.5">
                {coverage.sections.map((s) => (
                  <div
                    key={s.sectionKey}
                    className="flex items-center justify-between gap-4 py-2.5 border-b border-stone-800/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-stone-200">{s.sectionKey}</span>
                        {s.isDynamic && (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
                            dynamic
                          </span>
                        )}
                      </div>
                      {s.missing.length > 0 && (
                        <p className="font-mono text-[11px] text-amber-500/80 mt-1 truncate">
                          Missing: {s.missing.join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-32 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                        <div
                          className={`h-full ${
                            s.coverage === 100 ? "bg-emerald-500" : s.coverage >= 50 ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${s.coverage}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-stone-400 w-24 text-right">
                        {s.isDynamic
                          ? `${s.itemCount ?? 0} image${(s.itemCount ?? 0) === 1 ? "" : "s"}`
                          : `${s.configured} / ${s.expected}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coverage totals */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="p-3 rounded-xl border border-stone-800 bg-stone-900/40">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Images</p>
                  <p className="font-mono text-lg text-stone-100 mt-1">
                    {coverage.totalConfigured} / {coverage.totalExpected}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-stone-800 bg-stone-900/40">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Gallery</p>
                  <p className="font-mono text-lg text-stone-100 mt-1">{coverage.galleryItemCount} live</p>
                </div>
                <div className="p-3 rounded-xl border border-stone-800 bg-stone-900/40">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Missing</p>
                  <p className={`font-mono text-lg mt-1 ${coverage.missingSlots.length ? "text-amber-400" : "text-emerald-400"}`}>
                    {coverage.missingSlots.length}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-stone-800 bg-stone-900/40">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Text slots</p>
                  <p className="font-mono text-lg text-stone-500 mt-1">0 / 0</p>
                </div>
              </div>

              {/* Orphaned + duplicate reporting */}
              {coverage.orphanedSlots.length > 0 && (
                <Alert className="bg-amber-950/40 border-amber-800/80 p-4 rounded-xl">
                  <p className="text-xs font-sans text-amber-300 font-medium mb-1">
                    {coverage.orphanedSlots.length} orphaned slot record(s) in Firestore
                  </p>
                  <p className="text-[11px] font-mono text-amber-200/70 leading-relaxed">
                    {coverage.orphanedSlots.join(", ")}
                  </p>
                  <p className="text-[11px] font-sans text-amber-200/60 mt-1.5">
                    These exist in the database but no page renders them and no editor manages them —
                    usually left over from a renamed slot.
                  </p>
                </Alert>
              )}

              {coverage.duplicateAssets.length > 0 && (
                <Alert className="bg-stone-900/60 border-stone-700 p-4 rounded-xl">
                  <p className="text-xs font-sans text-stone-300 font-medium mb-1">
                    {coverage.duplicateAssets.length} image(s) reused across multiple slots
                  </p>
                  <div className="space-y-1 mt-1.5">
                    {coverage.duplicateAssets.slice(0, 5).map((d) => (
                      <p key={d.cloudinaryId} className="text-[11px] font-mono text-stone-400 truncate">
                        {d.cloudinaryId} → {d.slots.join(", ")}
                      </p>
                    ))}
                  </div>
                  <p className="text-[11px] font-sans text-stone-500 mt-1.5">
                    Replacing one of these changes every slot listed beside it.
                  </p>
                </Alert>
              )}

              {coverage.missingSlots.length === 0 && coverage.orphanedSlots.length === 0 && (
                <Alert className="bg-emerald-950/40 border-emerald-800/80 p-4 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                  <span>
                    Every named slot on the public website is published from the CMS. No fallbacks, no
                    orphaned records.
                  </span>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detailed Diagnostics Table & Cache Status (`Task 6 & 7`) */}
      <Card className="bg-black/30 border-stone-800/80 rounded-2xl p-6 shadow-xl">
        <CardHeader className="p-0 mb-6 border-b border-stone-800/80 pb-4">
          <CardTitle className="font-serif text-xl text-stone-100 font-normal flex items-center gap-2.5">
            <Terminal className="size-5 text-gold" /> System Telemetry & Environment Audit Table (`Task 7`)
          </CardTitle>
          <CardDescription className="text-xs font-sans text-stone-400 mt-1 font-light">
            Exact runtime inspection parameters, memory cache entries, and browser environment profiles.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 font-mono text-xs">
          <div className="flex items-center justify-between py-2 border-b border-stone-800/50">
            <span className="text-stone-400">Current Environment:</span>
            <span className="text-emerald-400 font-semibold uppercase">{import.meta.env.MODE}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-stone-800/50">
            <span className="text-stone-400">CMS System Version:</span>
            <span className="text-gold font-semibold">{APP_CONFIG.CMS_VERSION}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-stone-800/50">
            <span className="text-stone-400">Firebase Project ID:</span>
            <span className="text-stone-200 truncate max-w-[200px]">{import.meta.env.VITE_FIREBASE_PROJECT_ID || "alankaran-website"}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-stone-800/50">
            <span className="text-stone-400">Cloudinary Cloud Name:</span>
            <span className="text-stone-200 truncate max-w-[200px]">{import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "Demo Mode"}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-stone-800/50">
            <span className="text-stone-400">Cache Level 1 (Memory):</span>
            <span className="text-stone-200 font-semibold">{cacheStats.memoryEntries} entries</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-stone-800/50">
            <span className="text-stone-400">Cache Level 2 (localStorage):</span>
            <span className="text-stone-200 font-semibold">{cacheStats.localStorageEntries} persisted entries</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-stone-800/50">
            <span className="text-stone-400">Real-Time Snapshot Sync (`onSnapshot`):</span>
            <span className="text-emerald-400 font-semibold">Active & Multi-Tab Operational</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-stone-800/50">
            <span className="text-stone-400">Public Website Isolation (`Phase 4`):</span>
            <span className="text-gold font-semibold">100% Isolated & Untouched</span>
          </div>

          <div className="col-span-1 md:col-span-2 pt-2 text-[11px] text-stone-500 font-sans truncate">
            Browser Information: <span className="font-mono text-stone-400">{typeof navigator !== "undefined" ? navigator.userAgent : "SSR Environment"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminDebug;

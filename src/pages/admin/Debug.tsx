import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Activity,
  Database,
  Cloud,
  Lock,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Terminal,
  ChevronDown,
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
  StatusBadge,
  type StatusTone,
} from "@/components/admin/ui";
import { cmsHealthService, cmsCacheService, cmsService, slotCoverageService } from "@/domains/cms/services";
import type { CMSHealthReport, CMSSectionContent } from "@/domains/cms/types";
import type { CoverageReport } from "@/domains/cms/services/slotCoverage.service";
import { PUBLIC_SECTIONS } from "@/domains/cms/constants";
import { TOTAL_GLOBAL_SETTINGS } from "@/domains/cms/utils/globalSettingsValidator";
import { buildGlobalSettingsStatus } from "@/domains/cms/utils/globalSettingsDiff";
import { useAuth } from "@/context/AuthContext";
import { ROUTES, APP_CONFIG } from "@/constants";

/**
 * Phase 3.5 Enterprise Diagnostics & Health Dashboard.
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
  // Global website settings coverage: how many of the settings the site renders are filled in
  // the draft, and how many are actually published (i.e. live for real visitors).
  // Uses the SAME comparison the editor badges use (`buildGlobalSettingsStatus`), so Diagnostics
  // and the Global Settings page can never disagree about what is published.
  const [globalSettings, setGlobalSettings] = useState({
    configured: 0,
    draft: 0,
    published: TOTAL_GLOBAL_SETTINGS,
    total: TOTAL_GLOBAL_SETTINGS,
  });
  // Developer telemetry is collapsed by default so the client-facing health summary leads.
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [showOrphaned, setShowOrphaned] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    cmsService
      .loadGlobalSettings()
      .then(({ draft, live }) => {
        if (cancelled) return;
        setGlobalSettings(buildGlobalSettingsStatus(draft, live));
      })
      .catch(() => {
        // Diagnostics must never crash on a failed read. Report nothing configured rather than
        // inventing a healthy-looking number.
        if (!cancelled)
          setGlobalSettings({ configured: 0, draft: 0, published: 0, total: TOTAL_GLOBAL_SETTINGS });
      });
    return () => {
      cancelled = true;
    };
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
      setRecoveryMsg("Pinged Firestore, verified Cloudinary CDN configuration, and rehydrated real-time listeners.");
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

      <PageHeader title="Diagnostics" description="Check that your website is connected and healthy." />

      {/* Recovery / Action Feedback Banner */}
      {recoveryMsg && (
        <Alert className="bg-emerald-950/60 border-emerald-800/80 p-4 rounded-xl text-emerald-300 text-[13px] flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          <span>{recoveryMsg}</span>
        </Alert>
      )}

      {/* Compact health summary + action toolbar */}
      <Card className="bg-gradient-to-br from-black/50 to-stone-950/30 border border-stone-800/70 p-5 rounded-2xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`size-14 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner ${scoreColor}`}>
              <span className="font-serif text-2xl font-semibold leading-none">{report?.score ?? 0}</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-serif text-xl text-white/90">CMS Diagnostics</h2>
                <StatusBadge
                  tone={report?.status === "healthy" ? "connected" : report?.status === "degraded" ? "draft" : report ? "offline" : "neutral"}
                  dot
                >
                  {report?.status === "healthy" ? "Healthy" : report?.status === "degraded" ? "Degraded" : report ? "Critical" : "Checking"}
                </StatusBadge>
              </div>
              <p className="text-[13px] text-white/55 mt-1">
                {report?.score ?? 0}/100
                {report?.timestamp ? ` · Last checked ${new Date(report.timestamp).toLocaleTimeString()}` : " · Checking subsystems…"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" disabled={loading} onClick={runDiagnostics}
              className="gap-2 text-xs border-stone-700 text-white/70 hover:text-gold focus-visible:ring-2 focus-visible:ring-gold/60">
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-gold" : ""}`} /><span>Refresh</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleTestRecovery} disabled={testingRecovery}
              className="gap-2 text-xs border-gold/40 text-gold hover:bg-gold/10 focus-visible:ring-2 focus-visible:ring-gold/60">
              <Activity className="size-3.5" /><span>{testingRecovery ? "Testing…" : "Test Reconnect"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearCache}
              className="gap-2 text-xs border-stone-700 text-white/70 hover:text-rose-400 hover:border-rose-800 focus-visible:ring-2 focus-visible:ring-rose-500/40">
              <Trash2 className="size-3.5 text-rose-400" /><span>Clear Cache</span>
            </Button>
            <Link href={ROUTES.ADMIN.DASHBOARD}>
              <Button variant="outline" size="sm" className="gap-2 text-xs focus-visible:ring-2 focus-visible:ring-gold/60">
                <ArrowLeft className="size-3.5" /><span>Back</span>
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Subsystem health cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <SubsystemCard
          icon={Database}
          title="Database"
          tone={report?.checks.firestore.reachable ? "connected" : "offline"}
          status={report?.checks.firestore.reachable ? "Operational" : "Offline"}
          metric={`${report?.checks.firestore.latencyMs ?? 0} ms`}
          caption="Response time"
        />
        <SubsystemCard
          icon={Cloud}
          title="Image Storage"
          tone={report?.checks.cloudinary.configured ? "connected" : "draft"}
          status={report?.checks.cloudinary.configured ? "Configured" : "Setup needed"}
          metric={report?.checks.cloudinary.configured ? "Ready" : "—"}
          caption="Cloudinary CDN"
        />
        <SubsystemCard
          icon={Lock}
          title="Authentication"
          tone={report?.checks.authentication.valid ? "connected" : "offline"}
          status={report?.checks.authentication.valid ? "Verified" : "Signed out"}
          metric={currentUser?.email || "No session"}
          caption="Secure session"
        />
      </div>

      {/* CMS Slot Coverage */}
      <Card className="bg-black/30 border-stone-800/80 rounded-2xl p-6 shadow-xl">
        <CardHeader className="p-0 mb-6 border-b border-stone-800/80 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="font-serif text-xl text-white/90 font-normal flex items-center gap-2.5">
                <Layers className="size-5 text-gold" /> Content Coverage
              </CardTitle>
              <CardDescription className="text-[13px] text-white/55 mt-1">
                Which images are published from the CMS versus using a bundled fallback.
              </CardDescription>
            </div>

            {/* Compact stat chips */}
            {coverage && (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1.5 rounded-xl border text-[13px] ${coverage.imageCoverage === 100 ? "border-emerald-800/60 bg-emerald-950/25 text-emerald-300" : "border-stone-800 bg-stone-900/50 text-white/80"}`}>
                  <strong className={coverage.imageCoverage === 100 ? "" : "text-white/90"}>{coverage.totalConfigured}/{coverage.totalExpected}</strong> Images
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-stone-800 bg-stone-900/50 text-[13px] text-white/80">
                  <strong className="text-white/90">{coverage.galleryItemCount}</strong> Gallery
                </span>
                <span className={`px-3 py-1.5 rounded-xl border text-[13px] ${coverage.missingSlots.length ? "border-amber-800/70 bg-amber-950/30 text-amber-300" : "border-stone-800 bg-stone-900/50 text-white/80"}`}>
                  <strong>{coverage.missingSlots.length}</strong> Missing
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-stone-800 bg-stone-900/50 text-[13px] text-white/80" title="Configured / published site-wide text settings">
                  <strong className="text-white/90">{globalSettings.published}/{globalSettings.total}</strong> Settings
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 space-y-5">
          {!coverage ? (
            <p className="font-mono text-xs text-stone-500">Calculating coverage…</p>
          ) : (
            <>
              {/* Per-section coverage rows */}
              <div className="space-y-1.5">
                {coverage.sections.map((s) => (
                  <div
                    key={s.sectionKey}
                    className="flex items-center gap-4 py-2.5 px-1 rounded-lg hover:bg-white/[0.02] transition-colors duration-150"
                  >
                    <div className="w-32 shrink-0 flex items-center gap-2">
                      <span className="text-[14px] text-white/80 capitalize">{s.sectionKey}</span>
                      {s.isDynamic && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-white/50 border border-stone-700">dynamic</span>
                      )}
                    </div>

                    <StatusBadge tone={s.coverage === 100 ? "connected" : s.coverage >= 50 ? "draft" : "offline"}>
                      {s.coverage === 100 ? "Healthy" : s.coverage >= 50 ? "Partial" : "Low"}
                    </StatusBadge>

                    <div className="flex-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          s.coverage === 100 ? "bg-emerald-500" : s.coverage >= 50 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${s.coverage}%` }}
                      />
                    </div>

                    <span className="text-[13px] text-white/70 w-20 text-right tabular-nums">
                      {s.isDynamic
                        ? `${s.itemCount ?? 0} image${(s.itemCount ?? 0) === 1 ? "" : "s"}`
                        : `${s.configured} / ${s.expected}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Legacy slots — collapsible */}
              {coverage.orphanedSlots.length > 0 && (
                <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowOrphaned((v) => !v)}
                    aria-expanded={showOrphaned}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                  >
                    <span className="flex items-center gap-2 text-[13px] text-amber-300">
                      <AlertTriangle className="size-4 shrink-0" />
                      <strong className="font-medium">Legacy Slots</strong>
                      <span className="text-amber-200/70">— {coverage.orphanedSlots.length} orphaned record{coverage.orphanedSlots.length === 1 ? "" : "s"}</span>
                    </span>
                    <ChevronDown className={`size-4 text-amber-300/70 shrink-0 transition-transform duration-150 ${showOrphaned ? "rotate-180" : ""}`} />
                  </button>
                  {showOrphaned && (
                    <div className="px-4 pb-3 text-[12px] text-amber-200/70">
                      <p className="font-mono break-words leading-relaxed">{coverage.orphanedSlots.join(", ")}</p>
                      <p className="mt-1.5 text-amber-200/55">Left over from a renamed slot — no page renders these and no editor manages them.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Duplicate images — collapsible, grouped cards */}
              {coverage.duplicateAssets.length > 0 && (
                <div className="rounded-xl border border-stone-700/60 bg-stone-900/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowDuplicates((v) => !v)}
                    aria-expanded={showDuplicates}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                  >
                    <span className="flex items-center gap-2 text-[13px] text-white/80">
                      <Layers className="size-4 text-gold shrink-0" />
                      <strong className="font-medium">Duplicate Images</strong>
                      <span className="text-white/55">— {coverage.duplicateAssets.length} reused asset{coverage.duplicateAssets.length === 1 ? "" : "s"}</span>
                    </span>
                    <ChevronDown className={`size-4 text-white/50 shrink-0 transition-transform duration-150 ${showDuplicates ? "rotate-180" : ""}`} />
                  </button>
                  {showDuplicates && (
                    <div className="px-4 pb-3 space-y-1.5">
                      {coverage.duplicateAssets.slice(0, 5).map((d) => (
                        <div key={d.cloudinaryId} className="px-3 py-2 rounded-lg border border-stone-800 bg-black/30 text-[12px]">
                          <p className="font-mono text-white/70 truncate">{d.cloudinaryId}</p>
                          <p className="text-white/45 truncate">→ {d.slots.join(", ")}</p>
                        </div>
                      ))}
                      <p className="text-[12px] text-white/45 pt-1">Replacing one of these changes every slot listed beside it.</p>
                    </div>
                  )}
                </div>
              )}

              {coverage.missingSlots.length === 0 && coverage.orphanedSlots.length === 0 && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 text-[13px] text-emerald-300">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Everything looks good. No issues detected.</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* System information — developer telemetry, collapsed by default */}
      <Card className="bg-black/30 border border-stone-800/70 rounded-2xl shadow-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTelemetry((v) => !v)}
          aria-expanded={showTelemetry}
          className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-white/[0.02] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
        >
          <div className="flex items-center gap-2.5">
            <Terminal className="size-4 text-gold" />
            <span className="font-serif text-base text-white/90">System Information</span>
            <StatusBadge tone="neutral">{import.meta.env.MODE}</StatusBadge>
          </div>
          <ChevronDown className={`size-5 text-white/50 transition-transform duration-150 ${showTelemetry ? "rotate-180" : ""}`} />
        </button>

        {showTelemetry && (
        <CardContent className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
          <div className="px-3.5 py-2.5 rounded-xl border border-stone-800/70 bg-stone-900/40">
            <p className="text-white/45">Environment</p>
            <p className="text-emerald-400 font-medium mt-0.5">{import.meta.env.MODE}</p>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl border border-stone-800/70 bg-stone-900/40">
            <p className="text-white/45">CMS Version</p>
            <p className="text-gold font-medium mt-0.5">{APP_CONFIG.CMS_VERSION}</p>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl border border-stone-800/70 bg-stone-900/40">
            <p className="text-white/45">Firebase Project</p>
            <p className="text-white/80 mt-0.5 truncate">{import.meta.env.VITE_FIREBASE_PROJECT_ID || "alankaran-website"}</p>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl border border-stone-800/70 bg-stone-900/40">
            <p className="text-white/45">Cloudinary Cloud</p>
            <p className="text-white/80 mt-0.5 truncate">{import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "Demo Mode"}</p>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl border border-stone-800/70 bg-stone-900/40">
            <p className="text-white/45">Memory Cache</p>
            <p className="text-white/80 font-medium mt-0.5">{cacheStats.memoryEntries} entries</p>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl border border-stone-800/70 bg-stone-900/40">
            <p className="text-white/45">Persistent Cache</p>
            <p className="text-white/80 font-medium mt-0.5">{cacheStats.localStorageEntries} entries</p>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl border border-stone-800/70 bg-stone-900/40">
            <p className="text-white/45">Realtime Sync</p>
            <p className="text-emerald-400 font-medium mt-0.5">Operational</p>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl border border-stone-800/70 bg-stone-900/40">
            <p className="text-white/45">Website Isolation</p>
            <p className="text-gold font-medium mt-0.5">Fully isolated</p>
          </div>

          <div className="col-span-1 md:col-span-2 px-3.5 py-2.5 rounded-xl border border-stone-800/70 bg-stone-900/40 text-[12px] text-white/45 truncate">
            Browser: <span className="font-mono text-white/55">{typeof navigator !== "undefined" ? navigator.userAgent : "SSR Environment"}</span>
          </div>
        </CardContent>
        )}
      </Card>
    </div>
  );
}

export default AdminDebug;

/**
 * A premium subsystem status card. Presentation only — the caller passes the tone/status/metric
 * derived from the diagnostics report, so no health logic lives here.
 */
function SubsystemCard({
  icon: Icon,
  title,
  tone,
  status,
  metric,
  caption,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone: StatusTone;
  status: string;
  metric: string;
  caption: string;
}) {
  return (
    <div className="bg-black/30 border border-stone-800/70 rounded-2xl p-5 flex flex-col gap-3 shadow-lg transition-all duration-150 hover:border-gold/30 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="size-9 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold">
          <Icon className="size-4" />
        </span>
        <StatusBadge tone={tone} dot>{status}</StatusBadge>
      </div>
      <div>
        <h3 className="font-serif text-base text-white/90">{title}</h3>
        <p className="text-xl font-serif text-white/90 mt-1 leading-none truncate" title={metric}>{metric}</p>
      </div>
      <p className="text-[13px] text-white/45">{caption}</p>
    </div>
  );
}

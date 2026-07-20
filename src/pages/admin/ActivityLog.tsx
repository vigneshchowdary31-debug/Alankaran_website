import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "wouter";
import {
  History,
  Search,
  SlidersHorizontal,
  RefreshCw,
  ArrowLeft,
  Upload,
  Trash2,
  Globe,
  RotateCcw,
  LogIn,
  LogOut,
  Edit3,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PageHeader,
  AdminBreadcrumb,
  PageLoader,
  EmptyState,
  ErrorState,
} from "@/components/admin/ui";
import { auditLogService } from "@/domains/cms/services/auditLog.service";
import { ROUTES } from "@/constants/routes";
import type { CMSAuditLogEntry, AuditActionType } from "@/domains/cms/types";

// ─── Icon & colour mapping per action type ───────────────────────────────────

const ACTION_META: Record<
  AuditActionType | string,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string; bg: string }
> = {
  Upload: { icon: Upload, label: "Upload", color: "text-emerald-400", bg: "bg-emerald-950/60 border-emerald-800" },
  Replace: { icon: Edit3, label: "Replace", color: "text-blue-400", bg: "bg-blue-950/60 border-blue-800" },
  Delete: { icon: Trash2, label: "Delete", color: "text-red-400", bg: "bg-red-950/60 border-red-800" },
  Publish: { icon: Globe, label: "Publish", color: "text-gold", bg: "bg-gold/10 border-gold/30" },
  Restore: { icon: RotateCcw, label: "Restore", color: "text-amber-400", bg: "bg-amber-950/60 border-amber-800" },
  Login: { icon: LogIn, label: "Login", color: "text-stone-300", bg: "bg-stone-800/60 border-stone-700" },
  Logout: { icon: LogOut, label: "Logout", color: "text-stone-400", bg: "bg-stone-900/60 border-stone-800" },
  Cache_Clear: { icon: RefreshCw, label: "Cache Clear", color: "text-purple-400", bg: "bg-purple-950/60 border-purple-800" },
};

const ALL_ACTIONS: (AuditActionType | "All")[] = [
  "All", "Upload", "Replace", "Delete", "Publish", "Restore", "Login", "Logout", "Cache_Clear",
];

// ─── Relative time formatter ──────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function absoluteTime(ts: number): string {
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export function AdminActivityLog() {
  const [logs, setLogs] = useState<CMSAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());

  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditActionType | "All">("All");
  const [currentPage, setCurrentPage] = useState(1);

  const loadLogs = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await auditLogService.getRecentLogs(200);
      setLogs(data);
      setLastRefreshed(Date.now());
    } catch (err: any) {
      setLoadError(err.message || "Failed to load activity logs from Firestore.");
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadLogs().finally(() => setIsLoading(false));

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadLogs, 30_000);
    return () => clearInterval(interval);
  }, [loadLogs]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadLogs();
    setIsRefreshing(false);
  };

  // Filtered & searched logs
  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (actionFilter !== "All" && entry.action !== actionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          entry.action.toLowerCase().includes(q) ||
          entry.user.toLowerCase().includes(q) ||
          entry.target.toLowerCase().includes(q) ||
          entry.details.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, actionFilter, searchQuery]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  return (
    <div className="space-y-8 animate-fade-in">
      <AdminBreadcrumb items={[{ label: "Activity Log", href: ROUTES.ADMIN.ACTIVITY }]} />

      {/* Page Header */}
      <PageHeader
        badge="Phase 7 Production Polish Active"
        title="Activity Log & Audit Trail"
        description="A chronological record of every administrative action performed inside the CMS — uploads, deletions, publishes, restores, logins, and cache operations. Auto-refreshes every 30 seconds."
      >
        <Link href={ROUTES.ADMIN.DASHBOARD}>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-sans border-stone-700 bg-stone-900 text-stone-300 hover:border-gold"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      </PageHeader>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["Upload", "Delete", "Publish", "Restore"] as AuditActionType[]).map((action) => {
          const count = logs.filter((l) => l.action === action).length;
          const meta = ACTION_META[action];
          const Icon = meta.icon;
          return (
            <button
              key={action}
              type="button"
              onClick={() => { setActionFilter(action); setCurrentPage(1); }}
              className={`flex items-center gap-3 p-4 rounded-xl border bg-black/30 hover:border-gold/40 transition-all text-left ${
                actionFilter === action ? "border-gold/50 bg-gold/5" : "border-stone-800"
              }`}
              aria-label={`Filter by ${action} actions`}
            >
              <div className={`size-9 rounded-lg border flex items-center justify-center shrink-0 ${meta.bg}`}>
                <Icon className={`size-4 ${meta.color}`} aria-hidden="true" />
              </div>
              <div>
                <p className={`font-mono text-lg font-bold ${meta.color}`}>{count}</p>
                <p className="font-sans text-[10px] uppercase tracking-wider text-stone-400">{action}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-black/30 border border-gold/15 p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="size-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search by user, action, section, or details..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9 bg-black/60 border-stone-800 text-xs text-stone-200 h-9 rounded-xl focus:border-gold"
            aria-label="Search activity logs"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="size-3.5 text-gold shrink-0" aria-hidden="true" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value as any); setCurrentPage(1); }}
            className="bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:border-gold outline-none"
            aria-label="Filter by action type"
          >
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>{a === "All" ? "All Actions" : a}</option>
            ))}
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 p-0 text-stone-400 hover:text-gold shrink-0"
            aria-label="Refresh activity log"
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin text-gold" : ""}`} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Log last refreshed indicator */}
      <p className="text-[11px] font-mono text-stone-500 -mt-4">
        Last synced: {relativeTime(lastRefreshed)} · {filteredLogs.length} entries shown
      </p>

      {/* Main Content */}
      {isLoading ? (
        <PageLoader text="Loading audit logs from Firestore..." />
      ) : loadError ? (
        <ErrorState
          type={navigator.onLine ? "firestore_unavailable" : "offline"}
          title="Activity Log Unavailable"
          description={loadError}
          onRetry={handleManualRefresh}
          retryLabel="Retry Load"
        />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={History}
          title={searchQuery || actionFilter !== "All" ? "No Matching Log Entries" : "No Activity Recorded Yet"}
          description={
            searchQuery || actionFilter !== "All"
              ? "No log entries matched your filter. Try clearing the search or selecting a different action type."
              : "Activity logs will appear here once you perform CMS operations like uploading images, publishing sections, or logging in. All actions are automatically tracked."
          }
          actionLabel={searchQuery || actionFilter !== "All" ? "Clear Filters" : undefined}
          onAction={
            searchQuery || actionFilter !== "All"
              ? () => { setSearchQuery(""); setActionFilter("All"); }
              : undefined
          }
        />
      ) : (
        <>
          {/* Log Table */}
          <div
            className="bg-black/30 border border-stone-800 rounded-2xl overflow-hidden shadow-xl"
            role="region"
            aria-label="Activity log entries"
            aria-busy={isLoading}
          >
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse" role="table">
                <thead>
                  <tr className="bg-stone-900/80 border-b border-stone-800 text-[11px] font-mono uppercase text-gold" role="row">
                    <th className="p-3.5 w-32" scope="col">Action</th>
                    <th className="p-3.5" scope="col">Target / Section</th>
                    <th className="p-3.5" scope="col">Details</th>
                    <th className="p-3.5 w-44" scope="col">
                      <span className="flex items-center gap-1.5">
                        <User className="size-3" aria-hidden="true" /> User
                      </span>
                    </th>
                    <th className="p-3.5 w-36 text-right" scope="col">
                      <span className="flex items-center justify-end gap-1.5">
                        <Clock className="size-3" aria-hidden="true" /> Timestamp
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/50" role="rowgroup">
                  {paginatedLogs.map((entry) => {
                    const meta = ACTION_META[entry.action] || ACTION_META.Replace;
                    const Icon = meta.icon;
                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-stone-900/40 transition-colors text-xs font-sans"
                        role="row"
                      >
                        <td className="p-3.5" role="cell">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono font-semibold ${meta.bg} ${meta.color}`}>
                            <Icon className="size-3 shrink-0" aria-hidden="true" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-stone-300 max-w-[200px]" role="cell">
                          <span className="truncate block" title={entry.target}>
                            {entry.target}
                          </span>
                        </td>
                        <td className="p-3.5 text-stone-400 max-w-[300px]" role="cell">
                          <span className="line-clamp-2 leading-relaxed" title={entry.details}>
                            {entry.details}
                          </span>
                        </td>
                        <td className="p-3.5 text-stone-400 truncate max-w-[160px]" role="cell">
                          <span title={entry.user}>{entry.user}</span>
                        </td>
                        <td className="p-3.5 text-right" role="cell">
                          <span
                            className="text-stone-500 font-mono text-[10px] block"
                            title={absoluteTime(entry.timestamp)}
                          >
                            {relativeTime(entry.timestamp)}
                          </span>
                          <span className="text-stone-600 font-mono text-[9px]">
                            {new Date(entry.timestamp).toLocaleDateString("en-IN")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-stone-800/50">
              {paginatedLogs.map((entry) => {
                const meta = ACTION_META[entry.action] || ACTION_META.Replace;
                const Icon = meta.icon;
                return (
                  <div key={entry.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono font-semibold ${meta.bg} ${meta.color}`}>
                        <Icon className="size-3 shrink-0" aria-hidden="true" />
                        {meta.label}
                      </span>
                      <span className="text-[10px] font-mono text-stone-500" title={absoluteTime(entry.timestamp)}>
                        {relativeTime(entry.timestamp)}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-stone-300 truncate">{entry.target}</p>
                    <p className="font-sans text-xs text-stone-400 line-clamp-2 leading-relaxed">{entry.details}</p>
                    <p className="font-sans text-[10px] text-stone-500 truncate">{entry.user}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-900/40 border border-stone-800 px-5 py-3 rounded-xl text-xs font-mono text-stone-400">
            <span>
              Showing <strong className="text-stone-200">{(currentPage - 1) * PAGE_SIZE + 1}</strong>–
              <strong className="text-stone-200">{Math.min(currentPage * PAGE_SIZE, filteredLogs.length)}</strong> of{" "}
              <strong className="text-gold">{filteredLogs.length}</strong> entries
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0 border-stone-700 bg-black/60 text-stone-300 disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <span className="px-2">
                Page <strong className="text-gold">{currentPage}</strong> / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 w-7 p-0 border-stone-700 bg-black/60 text-stone-300 disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

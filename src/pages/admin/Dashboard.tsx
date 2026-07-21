import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Image as ImageIcon,
  Images,
  Heart,
  Globe,
  History,
  Settings,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, AdminBreadcrumb, StatsCard, StatusBadge } from "@/components/admin/ui";
import { cmsService, slotCoverageService, auditLogService } from "@/domains/cms/services";
import { weddingStoriesService } from "@/domains/cms/services/weddingStories.service";
import { PUBLIC_SECTIONS } from "@/domains/cms/constants";
import type { CMSSectionContent, CMSAuditLogEntry } from "@/domains/cms/types";
import { ROUTES } from "@/constants";

/** Human "2 min ago" from a timestamp. Presentation-only. */
function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(ts).toLocaleDateString();
}

interface Stats {
  imagesPublished: number;
  galleryCount: number;
  storiesLive: number;
  lastPublished: number | null;
  loading: boolean;
}

const ACTION_TONE: Record<string, string> = {
  Publish: "text-emerald-400",
  Upload: "text-gold",
  Delete: "text-rose-400",
  Restore: "text-sky-400",
  Login: "text-stone-400",
  Logout: "text-stone-400",
};

export function AdminDashboard() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<Stats>({
    imagesPublished: 0,
    galleryCount: 0,
    storiesLive: 0,
    lastPublished: null,
    loading: true,
  });
  const [activity, setActivity] = useState<CMSAuditLogEntry[]>([]);
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
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
        const coverage = slotCoverageService.buildReport(sectionMap);
        const gallery = (sectionMap["gallery"] as any)?.publishedSlots ?? (sectionMap["gallery"] as any)?.slots ?? {};
        const stories = await weddingStoriesService.listStories().catch(() => []);
        const logs = await auditLogService.getRecentLogs(6).catch(() => []);

        if (cancelled) return;
        const published = logs.filter((l) => l.action === "Publish");
        setStats({
          imagesPublished: coverage.totalConfigured,
          galleryCount: Object.keys(gallery).length,
          storiesLive: stories.filter((s) => s.status === "published").length,
          lastPublished: published[0]?.timestamp ?? null,
          loading: false,
        });
        setActivity(logs);
      } catch {
        if (!cancelled) setStats((s) => ({ ...s, loading: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = [
    { label: "Published Images", value: stats.imagesPublished, icon: ImageIcon, href: ROUTES.ADMIN.IMAGES },
    { label: "Gallery Photos", value: stats.galleryCount, icon: Images, href: ROUTES.ADMIN.GALLERY },
    { label: "Wedding Stories", value: stats.storiesLive, icon: Heart, href: ROUTES.ADMIN.STORIES },
    {
      label: "Last Published",
      value: stats.lastPublished ? timeAgo(stats.lastPublished) : "—",
      icon: History,
      href: ROUTES.ADMIN.ACTIVITY,
      text: true,
    },
  ];

  const quickActions = [
    { label: "Page Images", icon: ImageIcon, href: ROUTES.ADMIN.IMAGES },
    { label: "Gallery", icon: Images, href: ROUTES.ADMIN.GALLERY },
    { label: "Wedding Stories", icon: Heart, href: ROUTES.ADMIN.STORIES },
    { label: "Global Settings", icon: Settings, href: ROUTES.ADMIN.SETTINGS },
    { label: "View Website", icon: Globe, href: "/", external: true },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <AdminBreadcrumb items={[{ label: "Dashboard" }]} />

      <PageHeader
        title="Dashboard"
        description={`Welcome back${currentUser?.email ? `, ${currentUser.email.split("@")[0]}` : ""}. Here's what's happening on your website.`}
      >
        <StatusBadge tone={online ? "connected" : "offline"} dot>
          {online ? "Connected" : "Offline"}
        </StatusBadge>
      </PageHeader>

      {/* ── Quick overview ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <Link key={c.label} href={c.href}>
            <StatsCard label={c.label} value={c.value} icon={c.icon} loading={stats.loading} compact={c.text} />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Recent activity ── */}
        <Card className="lg:col-span-2 bg-black/30 border border-stone-800/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-lg text-stone-100">Recent Activity</h2>
            <Link href={ROUTES.ADMIN.ACTIVITY} className="text-xs text-gold hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          {stats.loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-stone-900/60 animate-pulse" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="text-center py-10">
              <History className="size-8 text-stone-600 mx-auto mb-3" />
              <p className="text-sm text-stone-400">No activity yet</p>
              <p className="text-xs text-stone-500 mt-1">Your changes will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-800/60">
              {activity.map((log) => (
                <li key={log.id} className="flex items-center gap-3 py-2.5">
                  <span className={`text-xs font-medium w-16 shrink-0 ${ACTION_TONE[log.action] || "text-stone-400"}`}>
                    {log.action}
                  </span>
                  <span className="text-sm text-stone-300 truncate flex-1">{log.details || log.target}</span>
                  <span className="text-xs text-stone-500 shrink-0">{timeAgo(log.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ── Quick actions ── */}
        <Card className="bg-black/30 border border-stone-800/80 rounded-2xl p-6">
          <h2 className="font-serif text-lg text-stone-100 mb-5">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map((a) =>
              a.external ? (
                <a
                  key={a.label}
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-stone-800 bg-stone-900/40 text-stone-200 hover:border-gold/40 hover:text-gold transition-colors"
                >
                  <a.icon className="size-4 text-gold" />
                  <span className="text-sm flex-1">{a.label}</span>
                  <ArrowRight className="size-3.5 text-stone-500" />
                </a>
              ) : (
                <Link key={a.label} href={a.href}>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-stone-800 bg-stone-900/40 text-stone-200 hover:border-gold/40 hover:text-gold transition-colors">
                    <a.icon className="size-4 text-gold" />
                    <span className="text-sm flex-1">{a.label}</span>
                    <ArrowRight className="size-3.5 text-stone-500" />
                  </div>
                </Link>
              )
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default AdminDashboard;

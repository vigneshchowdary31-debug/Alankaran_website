import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LogOut,
  Menu,
  X,
  User,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { navigationItems } from "@/config/navigation";
import { ROUTES, APP_CONFIG, MESSAGES } from "@/constants";
import { AdminErrorBoundary } from "./ErrorBoundary";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { currentUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      showSuccess("Signed Out", MESSAGES.SUCCESS.LOGOUT);
      setLocation(ROUTES.ADMIN.LOGIN);
    } catch (error: any) {
      showError("Logout Error", error.message || MESSAGES.ERROR.UNKNOWN);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-nizami-dark text-stone-200 flex flex-col md:flex-row select-none">
      {/* ── Mobile Header Bar ── */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-black/40 border-b border-gold/15 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg tracking-widest text-gold font-medium">
            {APP_CONFIG.NAME.split(" ")[0].toUpperCase()}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20 font-mono">
            CMS
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-stone-300 hover:text-gold transition-colors focus:outline-none"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </header>

      {/* ── Mobile Overlay Backdrop ── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar Navigation ── */}
      <aside
        className={`
          fixed md:sticky top-0 bottom-0 left-0 z-50 w-64 bg-nizami-dark md:bg-black/25 border-r border-gold/15 flex flex-col justify-between p-6 transition-transform duration-300 ease-in-out shrink-0
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        role="navigation"
        aria-label="Sidebar navigation"
      >
        <div className="space-y-8">
          {/* Brand Logo & Title */}
          <div className="flex items-center justify-between">
            <div>
              <Link href={ROUTES.ADMIN.DASHBOARD} className="flex items-center gap-2 group">
                <span className="font-serif text-2xl tracking-[0.18em] text-stone-100 group-hover:text-gold transition-colors">
                  ALANKARAN
                </span>
              </Link>
              <p className="text-[11px] font-sans text-stone-400 font-light tracking-wider mt-0.5 flex items-center gap-1.5">
                <Sparkles className="size-3 text-gold" /> Image CMS {APP_CONFIG.CMS_VERSION.split("-")[0]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-stone-400 hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Configuration-driven Nav Items */}
          <nav className="space-y-1.5" aria-label="Main navigation">
            {navigationItems.map((item) => {
              const isActive = location === item.route;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.enabled ? item.route : ROUTES.ADMIN.DASHBOARD}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`
                    flex items-center justify-between px-3.5 py-2.5 rounded-lg font-sans text-sm transition-all
                    ${
                      isActive
                        ? "bg-gold/15 text-gold border border-gold/30 font-medium shadow-sm"
                        : !item.enabled
                        ? "opacity-50 cursor-not-allowed text-stone-600"
                        : "text-stone-400 hover:bg-white/5 hover:text-stone-200"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`size-4 ${isActive ? "text-gold" : "text-stone-400"}`} />
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-800/80 text-stone-400 border border-stone-700">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer & Logout */}
        <div className="pt-6 border-t border-gold/15 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="size-8 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0">
              <User className="size-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-sans font-medium text-stone-200 truncate">
                Administrator
              </p>
              <p className="text-[11px] font-sans text-stone-400 truncate">
                {currentUser?.email || APP_CONFIG.SUPPORT_EMAIL}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <a
              href={ROUTES.PUBLIC.HOME}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-md border border-stone-800 bg-stone-900/60 text-xs font-sans text-stone-300 hover:text-gold hover:border-gold/30 transition-all"
            >
              <span>View Live Website</span>
              <ExternalLink className="size-3" />
            </a>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/20 border-red-900/30 font-sans text-xs"
            >
              <LogOut className="size-3.5" />
              <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area with Error Boundary ── */}
      <main className="flex-1 min-w-0 p-4 md:p-8 lg:p-12 overflow-y-auto" role="main" id="main-content">
        <div className="max-w-6xl mx-auto">
          <AdminErrorBoundary>{children}</AdminErrorBoundary>
        </div>
      </main>
    </div>
  );
}

import React, { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { ProtectedRoute } from "./ProtectedRoute";
import { AdminLayout } from "./AdminLayout";
import { AdminLogin, AdminDashboard, AdminImages, AdminDebug, PlaceholderPage } from "@/pages/admin";
import { ROUTES } from "@/constants/routes";

export function AdminRouter() {
  const [location, setLocation] = useLocation();

  // Redirect /admin or /admin/ to /admin/dashboard
  useEffect(() => {
    if (location === ROUTES.ADMIN.ROOT || location === `${ROUTES.ADMIN.ROOT}/`) {
      setLocation(ROUTES.ADMIN.DASHBOARD);
    }
  }, [location, setLocation]);

  return (
    <Switch>
      {/* ── Public Auth Route ── */}
      <Route path={ROUTES.ADMIN.LOGIN} component={AdminLogin} />

      {/* ── Protected Dashboard Route ── */}
      <Route
        path={ROUTES.ADMIN.DASHBOARD}
        component={() => (
          <ProtectedRoute>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />

      {/* ── Phase 2 Route: Page Images & Hero Uploader ── */}
      <Route
        path={ROUTES.ADMIN.IMAGES}
        component={() => (
          <ProtectedRoute>
            <AdminLayout>
              <AdminImages />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />

      <Route
        path={ROUTES.ADMIN.GALLERY}
        component={() => (
          <ProtectedRoute>
            <AdminLayout>
              <PlaceholderPage
                title="Gallery & Portfolio Manager"
                phase="Phase 5"
                description="Interactive portfolio grid manager for categorizing, reordering, and bulk-uploading real wedding moments."
                upcomingFeatures={[
                  "Drag & Drop visual reordering (`@dnd-kit/core`)",
                  "Category assignment (`Mandap`, `Floral`, `Reception`, `Bridal Entry`, `Royal Themes`)",
                  "Bulk multi-file upload support up to 20 photos at once",
                  "Quick search and filtering by location, couple name, or tags",
                  "One-click lightbox preview test",
                ]}
              />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />

      <Route
        path={ROUTES.ADMIN.SETTINGS}
        component={() => (
          <ProtectedRoute>
            <AdminLayout>
              <PlaceholderPage
                title="CMS Configuration Settings"
                phase="Future Extension"
                description="Manage global site settings, administrator email credentials, and Firestore cache expiration rules."
                upcomingFeatures={[
                  "Update Administrator login email and password securely",
                  "Configure Cloudinary folder naming conventions (`{section}_{slug}_{timestamp}`)",
                  "Manage contact phone number, WhatsApp link, and social media handles",
                  "Review live Firestore read quota metrics and storage status",
                ]}
              />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />

      {/* ── Phase 3.5 Route: Enterprise Diagnostics & Health Dashboard ── */}
      <Route
        path={ROUTES.ADMIN.DEBUG}
        component={() => (
          <ProtectedRoute>
            <AdminLayout>
              <AdminDebug />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />

      <Route
        path={ROUTES.ADMIN.ACTIVITY}
        component={() => (
          <ProtectedRoute>
            <AdminLayout>
              <PlaceholderPage
                title="Activity Log & Rollback Backups"
                phase="Phase 6"
                description="Comprehensive audit trail of all image replacements, deletions, and automated JSON backups."
                upcomingFeatures={[
                  "Chronological history of all CMS image changes with timestamps",
                  "Automated snapshot backups (`cms/siteContent_backup`) on every save",
                  "1-click instant rollback if an image is accidentally deleted or replaced",
                  "Export complete website image configuration as a JSON file",
                ]}
              />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />

      {/* Fallback inside /admin/* to dashboard */}
      <Route
        component={() => (
          <ProtectedRoute>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />
    </Switch>
  );
}

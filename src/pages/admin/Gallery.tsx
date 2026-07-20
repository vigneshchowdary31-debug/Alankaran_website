import React from "react";
import { Link } from "wouter";
import { ArrowLeft, Images, Sparkles } from "lucide-react";
import {
  PageHeader,
  AdminBreadcrumb,
  Button,
} from "@/components/admin/ui";
import {
  GalleryManager,
  CMSStatusBanner,
} from "@/domains/cms";
import { ROUTES } from "@/constants/routes";

/**
 * Phase 6 Administrative Page: Gallery & Portfolio Content Manager.
 * Connects to `GalleryManager` for bulk uploads, drag-and-drop reordering, metadata editing, and device simulation.
 */
export function AdminGallery() {
  return (
    <div className="space-y-8 animate-fade-in select-none">
      <AdminBreadcrumb
        items={[
          { label: "Gallery Manager", href: ROUTES.ADMIN.GALLERY },
        ]}
      />

      {/* Page Header */}
      <PageHeader
        badge="Phase 6 Enterprise Gallery Management Active"
        title="Gallery & Portfolio Content Manager"
        description="Comprehensive image management studio for your luxury wedding portfolio. Upload multiple moments in bulk, reorder visually, categorize across royal themes, and simulate multi-device grids before publishing."
      >
        <Link href={ROUTES.ADMIN.DASHBOARD}>
          <Button variant="outline" size="sm" className="gap-2 text-xs font-sans border-stone-700 bg-stone-900 text-stone-300">
            <ArrowLeft className="size-3.5" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      </PageHeader>

      {/* Phase 3 Status & Offline Resilience Banner */}
      <CMSStatusBanner />

      {/* Interactive Gallery Manager Suite (`Task 1 through Task 9`) */}
      <GalleryManager />
    </div>
  );
}

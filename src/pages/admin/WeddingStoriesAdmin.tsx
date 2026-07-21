import React from "react";
import { Link } from "wouter";
import { ArrowLeft, Heart } from "lucide-react";
import { PageHeader, AdminBreadcrumb, Button } from "@/components/admin/ui";
import { WeddingStoriesManager } from "@/domains/cms/components/weddingStories/WeddingStoriesManager";
import { ROUTES } from "@/constants/routes";

export function WeddingStoriesAdmin() {
  return (
    <div className="space-y-8 animate-fade-in select-none">
      <AdminBreadcrumb items={[{ label: "Wedding Stories", href: ROUTES.ADMIN.STORIES }]} />
      <PageHeader
        badge="Live Website Integration Active"
        title="Wedding Stories"
        description="Edit the hero and manage the wedding stories shown on the public Wedding Stories page. Each story supports four images, drafts, publishing, duplication, and trash."
      >
        <Link href={ROUTES.ADMIN.DASHBOARD}>
          <Button variant="outline" size="sm" className="gap-2 text-xs font-sans">
            <ArrowLeft className="size-3.5" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      </PageHeader>
      <WeddingStoriesManager />
    </div>
  );
}

export default WeddingStoriesAdmin;

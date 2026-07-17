import React from "react";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Images,
  Settings,
  History,
  ShieldCheck,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

export interface NavigationItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  enabled: boolean;
  badge?: string | null;
}

/**
 * Configuration-driven sidebar navigation items.
 * Future phases can be activated simply by setting `enabled: true` and removing/updating the badge.
 */
export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    route: ROUTES.ADMIN.DASHBOARD,
    enabled: true,
    badge: null,
  },
  {
    id: "images",
    title: "Page Images",
    icon: ImageIcon,
    route: ROUTES.ADMIN.IMAGES,
    enabled: true, // Route is active and renders Phase 2/3 Cloudinary CDN uploader
    badge: "CDN Active",
  },
  {
    id: "debug",
    title: "Diagnostics & Health",
    icon: ShieldCheck,
    route: ROUTES.ADMIN.DEBUG,
    enabled: true, // Route is active and renders Phase 3.5 Enterprise Diagnostics Dashboard
    badge: "Phase 3.5",
  },
  {
    id: "gallery",
    title: "Gallery Manager",
    icon: Images,
    route: ROUTES.ADMIN.GALLERY,
    enabled: true, // Route is active and renders Phase 5 locked PlaceholderPage
    badge: "Phase 5",
  },
  {
    id: "settings",
    title: "CMS Settings",
    icon: Settings,
    route: ROUTES.ADMIN.SETTINGS,
    enabled: true, // Route is active and renders Future locked PlaceholderPage
    badge: "Future",
  },
  {
    id: "activity",
    title: "Activity Log",
    icon: History,
    route: ROUTES.ADMIN.ACTIVITY,
    enabled: true, // Route is active and renders Phase 6 locked PlaceholderPage
    badge: "Phase 6",
  },
];

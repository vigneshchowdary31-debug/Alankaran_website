/**
 * Section keys supported in the Alankaran Custom Image CMS.
 * Future sections (`destinations`, `testimonials`) require no structural or database changes.
 */
export type SectionKey = "hero" | "about" | "services" | "gallery" | "settings";

/**
 * Slot metadata record stored inside Firestore under `cms/siteContent/{sectionKey}`.
 * Exposes full asset characteristics without relying solely on raw CDN URLs.
 */
export interface CMSSlotMetadata {
  id: string; // Domain unique slot ID (e.g. "hero_hero_main_1721200000000")
  sectionKey: SectionKey | string;
  slotName: string; // e.g. "hero_main", "about_portrait", "service_mandap"
  cloudinaryId: string; // Cloudinary public_id
  url: string; // Cloudinary secure_url (HTTPS)
  altText: string;
  width?: number;
  height?: number;
  format?: string;
  resourceType?: string;
  sizeBytes?: number;
  createdAt?: number;
  updatedAt: number;
  updatedBy: string; // Admin user email (`currentUser.email`)
}

/**
 * Complete document structure stored inside `cms/siteContent/{sectionKey}`.
 * A section document contains its title, description, and a map of `slots` keyed by `slotName`.
 */
export interface CMSSectionContent {
  sectionKey: SectionKey | string;
  title?: string;
  description?: string;
  slots: Record<string, CMSSlotMetadata>;
  updatedAt: number;
  updatedBy: string;
}

/**
 * System configuration settings stored inside `cms/siteContent/settings`.
 */
export interface CMSSettings {
  cmsTitle: string;
  autoOptimize: boolean;
  maxUploadMB: number;
  allowedFormats: string[];
  updatedAt: number;
  updatedBy: string;
}

/**
 * UI loading and mutation state representation for administrative components.
 */
export type CMSMutationState = "idle" | "loading" | "saving" | "updating" | "deleting" | "error" | "success";

/**
 * Phase 3.5 Draft and Published Workflow (`Task 1`).
 * Every section maintains both its working Draft (`slots` or `draftSlots`) and its immutable Published state (`publishedSlots`).
 */
export interface CMSSectionWithPublishing extends CMSSectionContent {
  draftSlots?: Record<string, CMSSlotMetadata>;
  publishedSlots?: Record<string, CMSSlotMetadata>;
  publishedAt?: number | null;
  publishedBy?: string | null;
  publishedVersionId?: string | null;
}

/**
 * Phase 3.5 Version History Snapshot (`Task 2`).
 * Stored inside `cms/versions/{versionId}` or subcollections on every Publish action.
 */
export interface CMSVersionSnapshot {
  versionId: string;
  timestamp: number;
  user: string;
  section: SectionKey | string;
  changes: string; // Human-readable summary of slot changes in this snapshot
  metadata: {
    slots: Record<string, CMSSlotMetadata>;
  };
}

/**
 * Phase 3.5 Soft Delete Trash Record (`Task 3`).
 * Stored inside `cms/trash/{trashId}` when an image slot or record is deleted.
 */
export interface CMSTrashRecord {
  trashId: string;
  deletedAt: number;
  deletedBy: string;
  originalLocation: {
    sectionKey: string;
    slotName: string;
  };
  asset: CMSSlotMetadata;
}

/**
 * Phase 3.5 Audit Log Action Types and Entry Model (`Task 10`).
 * Stored inside `cms/auditLogs/{logId}`. Exclusively accessible by administrators.
 */
export type AuditActionType = "Upload" | "Replace" | "Delete" | "Publish" | "Restore" | "Login" | "Logout" | "Cache_Clear";

export interface CMSAuditLogEntry {
  id: string;
  action: AuditActionType;
  user: string;
  timestamp: number;
  target: string; // e.g. "hero/hero_main" or "cms/settings"
  details: string;
}

/**
 * Phase 3.5 CMS Health & Diagnostic Status Report (`Task 8`).
 */
export interface CMSHealthReport {
  score: number; // 0 to 100
  status: "healthy" | "degraded" | "critical";
  checks: {
    firestore: { reachable: boolean; latencyMs: number; message: string };
    cloudinary: { reachable: boolean; configured: boolean; message: string };
    authentication: { valid: boolean; userEmail: string | null; message: string };
    realtime: { active: boolean; listenerCount: number; message: string };
    storage: { available: boolean; provider: string; message: string };
  };
  timestamp: number;
}

/**
 * Phase 3.5 Cache Layer Entry Model (`Task 6`).
 */
export interface CMSCacheEntry<T> {
  data: T;
  version: string;
  lastSync: number;
  expiration: number;
}

/**
 * Phase 3.5 Image Usage Tracking Reference (`Task 9`).
 */
export interface ImageUsageReference {
  slotId: string;
  sectionKey: string;
  slotName: string;
  displayName: string;
  url: string;
  cloudinaryId: string;
}

/**
 * Phase 4 CMS System Configuration Schema (`Task 14`).
 * Stored under `cms/config/system` in Firestore.
 */
export interface CMSSystemConfig {
  cacheTTL: number; // in milliseconds
  maxUploadSizeMB: number;
  maxVersions: number;
  maintenanceMode: boolean;
  enablePublishing: boolean;
  featureFlags: {
    enablePreviewMode: boolean;
    enableScheduledPublishing: boolean;
    enableApprovalWorkflow: boolean;
    enableContentLocking: boolean;
  };
  updatedAt: number;
  updatedBy: string;
}

/**
 * Phase 4 Content Locking Architecture (`Task 10`).
 * Prevents simultaneous administrative overwrites when multiple admins edit the same section.
 */
export interface ContentEditLock {
  sectionKey: SectionKey | string;
  lockedBy: string; // Admin user email
  userName?: string;
  timestamp: number;
  expiresAt: number; // Lock automatically expires if inactive
}

/**
 * Phase 4 Scheduled Publishing Architecture (`Task 11`).
 * Prepares system for future scheduled publishing without requiring immediate cron execution.
 */
export interface ScheduledPublication {
  scheduleId: string;
  sectionKey: SectionKey | string;
  versionId: string;
  scheduledPublishTime: number;
  expiresAt?: number | null;
  status: "pending" | "published" | "cancelled" | "expired";
  createdBy: string;
  createdAt: number;
}

/**
 * Phase 4 Approval Workflow Architecture (`Task 12`).
 * Defines role hierarchy (`viewer -> editor -> admin -> owner`) and review state progression.
 */
export type RoleHierarchyLevel = "viewer" | "editor" | "admin" | "owner";
export type WorkflowStatus = "draft" | "in_review" | "approved" | "rejected" | "published";

export interface ApprovalWorkflowRecord {
  workflowId: string;
  sectionKey: SectionKey | string;
  submittedBy: string;
  submittedAt: number;
  status: WorkflowStatus;
  reviewedBy?: string | null;
  reviewedAt?: number | null;
  comments?: string;
}

/**
 * Phase 4 Analytics & Telemetry Event (`Task 18`).
 */
export type CMSAnalyticsEventType = "load" | "update" | "cache_hit" | "cache_miss" | "fallback_trigger";

export interface CMSAnalyticsEvent {
  eventId: string;
  eventType: CMSAnalyticsEventType;
  target: string; // e.g. "hero/hero_main"
  durationMs?: number;
  timestamp: number;
  details?: string;
}



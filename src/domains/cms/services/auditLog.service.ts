import { firestoreService, FirestorePaths } from "@/services/firestore";
import type { CMSAuditLogEntry, AuditActionType } from "../types";

/**
 * Phase 3.5 Audit Log Foundation + Phase 7 Activity Log Read Implementation.
 * Tracks critical administrative actions (Upload, Replace, Delete, Publish, Restore, Login, Logout).
 * Written to `cmsAuditLogs`. Read by the Activity Log UI page.
 */
class AuditLogService {
  /**
   * Records a new audit log entry.
   * Called internally by cmsService and gallery components after every CMS mutation.
   */
  async log(action: AuditActionType, userEmail: string, target: string, details: string): Promise<void> {
    try {
      const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const entry: CMSAuditLogEntry = {
        id,
        action,
        user: userEmail || "unknown@alankaran.com",
        timestamp: Date.now(),
        target,
        details,
      };

      // We save asynchronously without blocking critical UI workflows
      await firestoreService.save(FirestorePaths.activityLog(id), entry);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[AuditLogService] Failed to record audit log:", err);
      }
    }
  }

  /**
   * Phase 7 Task 1: Retrieves recent audit log entries ordered by timestamp descending.
   * Queries the `cmsAuditLogs` collection via `firestoreService.list`.
   */
  async getRecentLogs(limitCount: number = 100): Promise<CMSAuditLogEntry[]> {
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        return [];
      }

      return await firestoreService.list<CMSAuditLogEntry>(FirestorePaths.activityLogsCollection(), {
        orderBy: { field: "timestamp", direction: "desc" },
        limit: limitCount,
      });
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.warn("[AuditLogService] Failed to retrieve audit logs:", err);
      }
      return [];
    }
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;

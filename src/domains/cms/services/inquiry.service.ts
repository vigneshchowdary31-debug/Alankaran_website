import { firestoreService, FirestorePaths } from "@/services/firestore";
import { auditLogService } from "./auditLog.service";
import type { CMSInquiry, CMSInquiryInput, InquiryStatus } from "../types";

/**
 * Phase A Task 7 — Inquiry Persistence.
 *
 * Every public form (Contact, Booking, Consultation, Destination) previously validated input, showed
 * a success toast, and discarded the lead. Submissions now persist to `cmsInquiries/{id}` and raise an
 * `Inquiry` entry in the Activity Log so an admin can see them arrive.
 *
 * Email delivery is deliberately out of scope for this phase.
 */
class InquiryService {
  /**
   * Persists a public inquiry. Returns the stored record.
   *
   * Submitters are anonymous website visitors, so this is the one CMS write that does not require an
   * authenticated session — see the `cmsInquiries` create rule in `firestore.rules`, which validates
   * shape and pins `status` to "new".
   */
  async submit(input: CMSInquiryInput): Promise<CMSInquiry> {
    const id = `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const record: CMSInquiry = {
      id,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: (input.email || "").trim(),
      eventType: input.eventType || "Not specified",
      message: (input.message || "").trim(),
      createdAt: Date.now(),
      status: "new",
      sourcePage: input.sourcePage,
      ...(input.eventDate ? { eventDate: input.eventDate } : {}),
      ...(input.guestCount ? { guestCount: input.guestCount } : {}),
      ...(input.location ? { location: input.location } : {}),
      ...(input.budget ? { budget: input.budget } : {}),
      ...(input.company ? { company: input.company } : {}),
      ...(input.referralSource ? { referralSource: input.referralSource } : {}),
    };

    await firestoreService.save(FirestorePaths.inquiry(id), record);

    // Notify the admin through the existing Activity Log rather than a new channel (`Task 7`).
    // Fire-and-forget: a logging failure must never fail the visitor's submission.
    auditLogService.log(
      "Inquiry",
      record.email || record.phone || "anonymous@website",
      `${record.sourcePage}/${id}`,
      `New ${record.eventType} inquiry from ${record.name} (${record.phone})`
    );

    return record;
  }

  /**
   * Retrieves recent inquiries, newest first. Administrators only.
   */
  async getRecent(limitCount: number = 100): Promise<CMSInquiry[]> {
    try {
      return await firestoreService.list<CMSInquiry>(FirestorePaths.inquiriesCollection(), {
        orderBy: { field: "createdAt", direction: "desc" },
        limit: limitCount,
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[InquiryService] Failed to load inquiries:", err);
      }
      return [];
    }
  }

  async updateStatus(inquiryId: string, status: InquiryStatus, userEmail: string): Promise<void> {
    await firestoreService.update<CMSInquiry>(FirestorePaths.inquiry(inquiryId), { status });
    auditLogService.log(
      "Inquiry",
      userEmail || "admin@alankaran.com",
      `inquiry/${inquiryId}`,
      `Inquiry marked as ${status}`
    );
  }
}

export const inquiryService = new InquiryService();
export default inquiryService;

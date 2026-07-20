/**
 * Single source of truth for every Firestore location used by the CMS.
 *
 * Firestore addresses documents with an even number of path segments and collections with an odd
 * number. Every collection below is therefore a single top-level segment, and each helper returns a
 * `{ collection, docId }` pair that resolves to exactly two segments. Nothing outside this module
 * may build a Firestore path — `firestoreService` only accepts `FirestoreDocumentPath` values, so a
 * hardcoded string like `"cms/siteContent"` cannot reach the SDK.
 */

export const FIRESTORE_COLLECTIONS = {
  /** Per-section image slot documents: `cmsSiteContent/{sectionKey}` */
  SITE_CONTENT: "cmsSiteContent",
  /** Immutable publish snapshots: `cmsVersions/{sectionKey}_{versionId}` */
  VERSIONS: "cmsVersions",
  /** Soft-deleted slot records: `cmsTrash/{trashId}` */
  TRASH: "cmsTrash",
  /** Administrative activity entries: `cmsAuditLogs/{logId}` */
  AUDIT_LOGS: "cmsAuditLogs",
  /** Runtime system configuration: `cmsSettings/system` */
  SETTINGS: "cmsSettings",
  /** Public website inquiry submissions: `cmsInquiries/{inquiryId}` */
  INQUIRIES: "cmsInquiries",
} as const;

export type FirestoreCollectionName =
  (typeof FIRESTORE_COLLECTIONS)[keyof typeof FIRESTORE_COLLECTIONS];

/** A fully qualified, always-even-segment Firestore document address. */
export interface FirestoreDocumentPath {
  collection: FirestoreCollectionName;
  docId: string;
}

/** The single document holding CMS runtime configuration. */
export const SYSTEM_CONFIG_DOC_ID = "system";

/**
 * Builds the version snapshot document id. Snapshots are keyed by section so a section's history
 * stays contiguous, and carry a `section` field for querying.
 */
export function buildVersionDocId(sectionKey: string, versionId: string): string {
  return `${sectionKey}_${versionId}`;
}

export const FirestorePaths = {
  siteContentCollection: (): FirestoreCollectionName => FIRESTORE_COLLECTIONS.SITE_CONTENT,

  siteContent: (sectionKey: string): FirestoreDocumentPath => ({
    collection: FIRESTORE_COLLECTIONS.SITE_CONTENT,
    docId: String(sectionKey),
  }),

  gallery: (): FirestoreDocumentPath => FirestorePaths.siteContent("gallery"),

  versionsCollection: (): FirestoreCollectionName => FIRESTORE_COLLECTIONS.VERSIONS,

  version: (sectionKey: string, versionId: string): FirestoreDocumentPath => ({
    collection: FIRESTORE_COLLECTIONS.VERSIONS,
    docId: buildVersionDocId(String(sectionKey), versionId),
  }),

  trashCollection: (): FirestoreCollectionName => FIRESTORE_COLLECTIONS.TRASH,

  trash: (trashId: string): FirestoreDocumentPath => ({
    collection: FIRESTORE_COLLECTIONS.TRASH,
    docId: trashId,
  }),

  activityLogsCollection: (): FirestoreCollectionName => FIRESTORE_COLLECTIONS.AUDIT_LOGS,

  activityLog: (logId: string): FirestoreDocumentPath => ({
    collection: FIRESTORE_COLLECTIONS.AUDIT_LOGS,
    docId: logId,
  }),

  settings: (): FirestoreDocumentPath => ({
    collection: FIRESTORE_COLLECTIONS.SETTINGS,
    docId: SYSTEM_CONFIG_DOC_ID,
  }),

  /** Site-wide contact details singleton, read by Contact, Footer, and the WhatsApp button. */
  contact: (): FirestoreDocumentPath => FirestorePaths.siteContent("contact"),

  inquiriesCollection: (): FirestoreCollectionName => FIRESTORE_COLLECTIONS.INQUIRIES,

  inquiry: (inquiryId: string): FirestoreDocumentPath => ({
    collection: FIRESTORE_COLLECTIONS.INQUIRIES,
    docId: inquiryId,
  }),
} as const;

export default FirestorePaths;

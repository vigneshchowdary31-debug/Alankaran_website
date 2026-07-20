import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as limitTo,
  runTransaction as firebaseRunTransaction,
  writeBatch as firebaseWriteBatch,
  type QueryConstraint,
  type WhereFilterOp,
  type OrderByDirection,
  type Transaction,
  type WriteBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MESSAGES } from "@/constants/messages";
import type { FirestoreCollectionName, FirestoreDocumentPath } from "./firestorePaths";
import {
  FirestoreOperationError,
  traceAttempt,
  traceSuccess,
  traceFailure,
  traceConfig,
  type FirestoreOp,
} from "./firestoreDiagnostics";

traceConfig();

/**
 * Wraps a raw Firestore error in a `FirestoreOperationError` that keeps the machine-readable `code`
 * alongside the human-readable message. Previously every failure was flattened into a bare
 * `new Error(friendlyString)`, so callers could not tell a rules rejection from a network blip and
 * the underlying code never reached the console.
 */
function toOperationError(
  op: FirestoreOp,
  target: FirestoreDocumentPath | FirestoreCollectionName,
  error: any
): FirestoreOperationError {
  const code = traceFailure(op, target, error);
  const path = typeof target === "string" ? `${target}/*` : `${target.collection}/${target.docId}`;
  return new FirestoreOperationError(getFriendlyFirestoreError(error), code, op, path);
}

/**
 * Raised when a caller builds a structurally invalid Firestore address. This is a programming error
 * rather than a runtime/network failure, so it deliberately bypasses the friendly-error translation
 * and surfaces verbatim.
 */
export class FirestorePathError extends Error {
  constructor(message: string) {
    super(`[FirestoreService] ${message}`);
    this.name = "FirestorePathError";
  }
}

/**
 * Guards the even-segment rule at the boundary: a collection name must be exactly one segment and a
 * document id exactly one segment, so `collection/docId` always resolves to a valid 2-segment document.
 */
function assertValidCollectionName(collectionName: string): void {
  if (!collectionName || collectionName.includes("/")) {
    throw new FirestorePathError(
      `Invalid collection name "${collectionName}". Collections must be a single top-level segment — use FirestorePaths instead of a slash-separated string.`
    );
  }
}

function toDocumentRef(path: FirestoreDocumentPath) {
  if (!path) {
    throw new FirestorePathError("A FirestoreDocumentPath is required.");
  }
  assertValidCollectionName(path.collection);
  if (!path.docId || path.docId.includes("/")) {
    throw new FirestorePathError(
      `Invalid document id "${path.docId}" for collection "${path.collection}". Document ids must be a single segment.`
    );
  }
  return doc(db, path.collection, path.docId);
}

/**
 * Translates raw Firestore or network error codes into clean, non-technical human-friendly strings.
 */
export function getFriendlyFirestoreError(error: any): string {
  if (!error) return MESSAGES.ERROR.UNKNOWN;

  if (typeof window !== "undefined" && !navigator.onLine) {
    return "You are currently offline. Please check your internet connection and try again.";
  }

  const code = error?.code || error?.message || "";
  if (code.includes("permission-denied") || code.includes("PERMISSION_DENIED")) {
    return "Permission denied: You must be signed in as an administrator to save or view CMS data.";
  }
  if (code.includes("unavailable") || code.includes("UNAVAILABLE") || code.includes("network")) {
    return "Network error or timeout while connecting to cloud database. Please verify internet access.";
  }
  if (code.includes("not-found") || code.includes("NOT_FOUND")) {
    return "Requested CMS document was not found.";
  }

  if (import.meta.env.DEV) {
    console.error("[FirestoreService] Unhandled error:", error);
  }
  return `Database operation failed (${code}). Please try again later.`;
}

/** Declarative query options for `list`, keeping raw Firestore query objects out of domain services. */
export interface FirestoreListOptions {
  where?: { field: string; op: WhereFilterOp; value: unknown };
  orderBy?: { field: string; direction?: OrderByDirection };
  limit?: number;
}

export interface IFirestoreService {
  /**
   * Save or overwrite the document at `path.collection/path.docId`.
   */
  save<T extends Record<string, any>>(path: FirestoreDocumentPath, data: T): Promise<T>;

  /**
   * Partially update the existing document at `path.collection/path.docId`.
   */
  update<T extends Record<string, any>>(path: FirestoreDocumentPath, partialData: Partial<T>): Promise<T>;

  /**
   * Retrieve a typed document. Returns `null` if the document is missing.
   */
  get<T extends Record<string, any>>(path: FirestoreDocumentPath): Promise<T | null>;

  /**
   * Delete the document at `path.collection/path.docId`.
   */
  delete(path: FirestoreDocumentPath): Promise<boolean>;

  /**
   * Retrieve every document in a collection, optionally filtered, ordered, and capped.
   */
  list<T extends Record<string, any>>(
    collectionName: FirestoreCollectionName,
    options?: FirestoreListOptions
  ): Promise<T[]>;

  /**
   * Real-time subscription to a single document.
   * Fires `callback(data)` whenever the document mutates in the cloud or local cache.
   */
  subscribe<T extends Record<string, any>>(
    path: FirestoreDocumentPath,
    callback: (data: T | null, error?: Error) => void
  ): Unsubscribe;

  /**
   * Executes atomic Firestore transactions (`Task 4`).
   * Guarantees all multi-document operations succeed or fail as a single atomic unit.
   */
  runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T>;

  /**
   * Executes batched Firestore writes (`Task 4`).
   */
  executeBatch(operations: (batch: WriteBatch) => void): Promise<void>;
}

/**
 * Enterprise Firestore Abstraction Layer (`firestoreService`).
 * Encapsulates all raw Firebase SDK calls (`doc`, `getDoc`, `setDoc`, `onSnapshot`) ensuring zero
 * Firestore-specific objects leak into domain services or UI components. Every address arrives as a
 * `FirestoreDocumentPath` built by `FirestorePaths`, which is what keeps document paths even-segment.
 */
export const firestoreService: IFirestoreService = {
  async save<T extends Record<string, any>>(path: FirestoreDocumentPath, data: T): Promise<T> {
    const documentRef = toDocumentRef(path);
    traceAttempt("save", path, data);
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      await setDoc(documentRef, data, { merge: true });
      traceSuccess("save", path);
      return data;
    } catch (error: any) {
      throw toOperationError("save", path, error);
    }
  },

  async update<T extends Record<string, any>>(path: FirestoreDocumentPath, partialData: Partial<T>): Promise<T> {
    const documentRef = toDocumentRef(path);
    traceAttempt("update", path, partialData);
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      await updateDoc(documentRef, partialData as Record<string, any>);
      traceSuccess("update", path);
      // Return merged representation by fetching latest or overlaying partial Data
      const latest = await this.get<T>(path);
      return latest || (partialData as T);
    } catch (error: any) {
      throw toOperationError("update", path, error);
    }
  },

  async get<T extends Record<string, any>>(path: FirestoreDocumentPath): Promise<T | null> {
    const documentRef = toDocumentRef(path);
    traceAttempt("get", path);
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      const snapshot = await getDoc(documentRef);
      traceSuccess("get", path);
      if (!snapshot.exists()) {
        return null;
      }
      return snapshot.data() as T;
    } catch (error: any) {
      throw toOperationError("get", path, error);
    }
  },

  async delete(path: FirestoreDocumentPath): Promise<boolean> {
    const documentRef = toDocumentRef(path);
    traceAttempt("delete", path);
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      await deleteDoc(documentRef);
      traceSuccess("delete", path);
      return true;
    } catch (error: any) {
      throw toOperationError("delete", path, error);
    }
  },

  async list<T extends Record<string, any>>(
    collectionName: FirestoreCollectionName,
    options: FirestoreListOptions = {}
  ): Promise<T[]> {
    assertValidCollectionName(collectionName);
    traceAttempt("list", collectionName, options);
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }

      const constraints: QueryConstraint[] = [];
      if (options.where) {
        constraints.push(where(options.where.field, options.where.op, options.where.value));
      }
      if (options.orderBy) {
        constraints.push(orderBy(options.orderBy.field, options.orderBy.direction || "asc"));
      }
      if (options.limit) {
        constraints.push(limitTo(options.limit));
      }

      const snapshot = await getDocs(query(collection(db, collectionName), ...constraints));
      traceSuccess("list", collectionName);
      return snapshot.docs.map((docSnap) => docSnap.data() as T);
    } catch (error: any) {
      throw toOperationError("list", collectionName, error);
    }
  },

  subscribe<T extends Record<string, any>>(
    path: FirestoreDocumentPath,
    callback: (data: T | null, error?: Error) => void
  ): Unsubscribe {
    if (typeof window === "undefined") {
      callback(null);
      return () => {};
    }

    const documentRef = toDocumentRef(path);
    traceAttempt("subscribe", path);
    return onSnapshot(
      documentRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
        } else {
          callback(snapshot.data() as T);
        }
      },
      (error) => {
        callback(null, toOperationError("subscribe", path, error));
      }
    );
  },

  async runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      const result = await firebaseRunTransaction(db, updateFunction);
      traceSuccess("transaction", "(transaction)");
      return result;
    } catch (error: any) {
      throw toOperationError("transaction", "(transaction)" as FirestoreCollectionName, error);
    }
  },

  async executeBatch(operations: (batch: WriteBatch) => void): Promise<void> {
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      const batch = firebaseWriteBatch(db);
      operations(batch);
      await batch.commit();
      traceSuccess("batch", "(batch)");
    } catch (error: any) {
      throw toOperationError("batch", "(batch)" as FirestoreCollectionName, error);
    }
  },
};

export default firestoreService;

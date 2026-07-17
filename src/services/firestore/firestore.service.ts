import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction as firebaseRunTransaction,
  writeBatch as firebaseWriteBatch,
  type Transaction,
  type WriteBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MESSAGES } from "@/constants/messages";

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

export interface IFirestoreService {
  /**
   * Save or overwrite a document at `collectionPath/docId`.
   */
  save<T extends Record<string, any>>(collectionPath: string, docId: string, data: T): Promise<T>;

  /**
   * Partially update an existing document at `collectionPath/docId`.
   */
  update<T extends Record<string, any>>(collectionPath: string, docId: string, partialData: Partial<T>): Promise<T>;

  /**
   * Retrieve a typed document from `collectionPath/docId`. Returns `null` if document is missing.
   */
  get<T extends Record<string, any>>(collectionPath: string, docId: string): Promise<T | null>;

  /**
   * Delete a document at `collectionPath/docId`.
   */
  delete(collectionPath: string, docId: string): Promise<boolean>;

  /**
   * Real-time subscription to `collectionPath/docId`.
   * Fires `callback(data)` whenever the document mutates in the cloud or local cache.
   */
  subscribe<T extends Record<string, any>>(
    collectionPath: string,
    docId: string,
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
 * Firestore-specific objects leak into domain services or UI components.
 */
export const firestoreService: IFirestoreService = {
  async save<T extends Record<string, any>>(collectionPath: string, docId: string, data: T): Promise<T> {
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      const documentRef = doc(db, collectionPath, docId);
      await setDoc(documentRef, data, { merge: true });
      return data;
    } catch (error: any) {
      throw new Error(getFriendlyFirestoreError(error));
    }
  },

  async update<T extends Record<string, any>>(collectionPath: string, docId: string, partialData: Partial<T>): Promise<T> {
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      const documentRef = doc(db, collectionPath, docId);
      await updateDoc(documentRef, partialData as Record<string, any>);
      // Return merged representation by fetching latest or overlaying partial Data
      const latest = await this.get<T>(collectionPath, docId);
      return latest || (partialData as T);
    } catch (error: any) {
      throw new Error(getFriendlyFirestoreError(error));
    }
  },

  async get<T extends Record<string, any>>(collectionPath: string, docId: string): Promise<T | null> {
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      const documentRef = doc(db, collectionPath, docId);
      const snapshot = await getDoc(documentRef);
      if (!snapshot.exists()) {
        return null;
      }
      return snapshot.data() as T;
    } catch (error: any) {
      throw new Error(getFriendlyFirestoreError(error));
    }
  },

  async delete(collectionPath: string, docId: string): Promise<boolean> {
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      const documentRef = doc(db, collectionPath, docId);
      await deleteDoc(documentRef);
      return true;
    } catch (error: any) {
      throw new Error(getFriendlyFirestoreError(error));
    }
  },

  subscribe<T extends Record<string, any>>(
    collectionPath: string,
    docId: string,
    callback: (data: T | null, error?: Error) => void
  ): Unsubscribe {
    if (typeof window === "undefined") {
      callback(null);
      return () => {};
    }

    const documentRef = doc(db, collectionPath, docId);
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
        const friendlyMsg = getFriendlyFirestoreError(error);
        callback(null, new Error(friendlyMsg));
      }
    );
  },

  async runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      return await firebaseRunTransaction(db, updateFunction);
    } catch (error: any) {
      throw new Error(getFriendlyFirestoreError(error));
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
    } catch (error: any) {
      throw new Error(getFriendlyFirestoreError(error));
    }
  },
};

export default firestoreService;

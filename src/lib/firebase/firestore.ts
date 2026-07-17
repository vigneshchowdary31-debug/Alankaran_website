import { getFirestore, type Firestore } from "firebase/firestore";
import { app } from "./app";

/**
 * Singleton Firestore database instance initialization.
 * Safely initialized for client-side execution; SSR static pre-rendering receives a stub or unexecuted reference.
 */
let db: Firestore;

if (typeof window !== "undefined") {
  db = getFirestore(app);
} else {
  // During Vite SSR static generation, getFirestore is not invoked to avoid network connection attempts
  db = {} as Firestore;
}

export { db };
export default db;

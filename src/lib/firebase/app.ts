import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { firebaseConfig } from "@/config/firebase";

/**
 * Singleton Firebase app instance initialization.
 * Prevents duplicate initialization warnings during hot module replacement (HMR) or multi-tab usage.
 */
let app: FirebaseApp;

if (!getApps().length) {
  if (import.meta.env.DEV && firebaseConfig.isPlaceholder && !firebaseConfig.isSSR) {
    console.warn(
      "[Firebase SDK] Missing or default VITE_FIREBASE_API_KEY in environment. Please check your .env or environment configuration."
    );
  }
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export { app };
export default app;

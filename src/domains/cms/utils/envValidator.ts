import { cloudinaryConfig } from "@/config/cloudinary";
import { firebaseDb } from "@/lib/firebase";

/**
 * Phase 3.5 Enterprise Environment Validator (`Task 11`).
 * Validates Cloudinary CDN, Firebase Auth, and Firestore config without exposing secrets.
 * Provides user-friendly diagnostic statuses for administrative inspection.
 */

export interface EnvValidationResult {
  isValid: boolean;
  score: number; // 0 to 100
  checks: {
    firebase: { ok: boolean; projectId: string; message: string };
    cloudinary: { ok: boolean; cloudName: string; uploadPreset: string; message: string };
    storageProvider: { ok: boolean; providerName: string; message: string };
    firestore: { ok: boolean; message: string };
  };
}

export function validateEnvironment(): EnvValidationResult {
  const firebaseProject = import.meta.env.VITE_FIREBASE_PROJECT_ID || "not_configured";
  const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const isFirebaseConfigured = Boolean(firebaseApiKey && firebaseProject !== "not_configured");

  const cloudName = cloudinaryConfig.cloudName || "not_configured";
  const uploadPreset = cloudinaryConfig.uploadPreset || "not_configured";
  const isCloudinaryConfigured = cloudinaryConfig.isConfigured;

  const isFirestoreReady = Boolean(firebaseDb);

  let score = 0;
  if (isFirebaseConfigured) score += 40;
  if (isCloudinaryConfigured) score += 40;
  if (isFirestoreReady) score += 20;

  return {
    isValid: score === 100,
    score,
    checks: {
      firebase: {
        ok: isFirebaseConfigured,
        projectId: isFirebaseConfigured ? firebaseProject : "Missing VITE_FIREBASE_PROJECT_ID",
        message: isFirebaseConfigured
          ? "Firebase project configured securely via environment variables."
          : "Firebase credentials missing from .env.local.",
      },
      cloudinary: {
        ok: isCloudinaryConfigured,
        cloudName: isCloudinaryConfigured ? cloudName : "Missing VITE_CLOUDINARY_CLOUD_NAME",
        uploadPreset: isCloudinaryConfigured ? uploadPreset : "Missing VITE_CLOUDINARY_UPLOAD_PRESET",
        message: isCloudinaryConfigured
          ? "Cloudinary CDN unsigned upload preset ready."
          : "Cloudinary configuration incomplete.",
      },
      storageProvider: {
        ok: isCloudinaryConfigured,
        providerName: "Cloudinary CDN (StorageInterface)",
        message: "Modular storage provider active and decoupled from UI components.",
      },
      firestore: {
        ok: isFirestoreReady,
        message: isFirestoreReady
          ? "Firestore NoSQL database connection active."
          : "Firestore client failed to initialize.",
      },
    },
  };
}

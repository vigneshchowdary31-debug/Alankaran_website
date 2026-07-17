/**
 * Centralized Firebase configuration reader.
 * Validates environment variables and provides safe fallbacks during SSR static pre-rendering.
 */
const isSSR = typeof window === "undefined";

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isPlaceholderKey =
  !rawApiKey ||
  rawApiKey === "your-api-key-here" ||
  rawApiKey.includes("your-");

export const firebaseConfig = {
  apiKey: isPlaceholderKey ? "AIzaSyDummyKeyForSSRPreRenderingOnly000" : rawApiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "alankaran-cms.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "alankaran-cms",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "alankaran-cms.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
  isPlaceholder: isPlaceholderKey,
  isSSR,
} as const;

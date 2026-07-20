import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { MESSAGES } from "@/constants/messages";

/**
 * Maps raw Firebase Authentication error codes to clean, human-friendly messages for non-technical users.
 */
export function getFriendlyErrorMessage(error: any): string {
  if (!error) {
    return MESSAGES.ERROR.UNKNOWN;
  }

  const code = String(error.code || "");
  const message = String(error.message || "");

  if (code.includes("api-key-not-valid") || message.includes("api-key-not-valid")) {
    return "System configuration error (`auth/api-key-not-valid`): Firebase API key is missing or invalid. Please populate `.env.local` with your valid Firebase API credentials and restart the development server (`npm run dev`).";
  }
  if (code.includes("invalid-credential") || code.includes("user-not-found") || code.includes("wrong-password")) {
    return MESSAGES.ERROR.INVALID_CREDENTIALS;
  }
  if (code.includes("invalid-email")) {
    return "The email address format is invalid. Please enter a valid email address.";
  }
  if (code.includes("user-disabled")) {
    return "This administrator account has been disabled. Please contact system support.";
  }
  if (code.includes("too-many-requests")) {
    return "Too many failed login attempts. For security reasons, please wait a few minutes before trying again.";
  }
  if (code.includes("network-request-failed") || message.includes("network-request-failed")) {
    return MESSAGES.ERROR.NETWORK;
  }

  if (import.meta.env.DEV) {
    console.error("[AuthService] Unhandled Firebase error:", error);
  }
  return `Authentication failed due to a system error (${code || message}). Please try again later.`;
}

export interface IAuthService {
  login(email: string, pass: string): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): User | null;
  onAuthStateChange(callback: (user: User | null) => void): Unsubscribe;
}

/**
 * Authentication Service layer abstracting Firebase SDK calls.
 * Ensures React UI components remain completely decoupled from direct Firebase SDK usage.
 */
export const authService: IAuthService = {
  /**
   * Log in an administrator using email and password credentials.
   * @throws {Error} Human-readable error message on failure
   */
  async login(email: string, pass: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      return userCredential.user;
    } catch (error: any) {
      throw new Error(getFriendlyErrorMessage(error));
    }
  },

  /**
   * Log out the currently authenticated user session.
   */
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(getFriendlyErrorMessage(error));
    }
  },

  /**
   * Retrieve the currently authenticated Firebase User synchronously.
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  /**
   * Subscribe to authentication state changes.
   * @param callback Function called whenever the active session changes (login/logout/token refresh)
   * @returns Unsubscribe function to clean up the listener
   */
  onAuthStateChange(callback: (user: User | null) => void): Unsubscribe {
    return onAuthStateChanged(auth, callback);
  },
};

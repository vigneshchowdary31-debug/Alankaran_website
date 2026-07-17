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
  if (!error || !error.code) {
    return error?.message || MESSAGES.ERROR.UNKNOWN;
  }

  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return MESSAGES.ERROR.INVALID_CREDENTIALS;
    case "auth/invalid-email":
      return "The email address format is invalid. Please enter a valid email address.";
    case "auth/user-disabled":
      return "This administrator account has been disabled. Please contact system support.";
    case "auth/too-many-requests":
      return "Too many failed login attempts. For security reasons, please wait a few minutes before trying again.";
    case "auth/network-request-failed":
      return MESSAGES.ERROR.NETWORK;
    case "auth/api-key-not-valid":
      return "System configuration error: Firebase API key is missing or invalid.";
    default:
      if (import.meta.env.DEV) {
        console.error("[AuthService] Unhandled Firebase error:", error);
      }
      return "Authentication failed due to a system error (" + error.code + "). Please try again later.";
  }
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

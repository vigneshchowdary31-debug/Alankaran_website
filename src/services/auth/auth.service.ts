import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toUserFacingError } from "@/utils/userFacingError";

/**
 * Maps raw Firebase Authentication error codes to clean, human-friendly messages for non-technical users.
 */
export function getFriendlyErrorMessage(error: any): string {
  const code = String(error?.code || "") + " " + String(error?.message || "");

  // Sign-in has a few failure modes with genuinely different advice, so they are handled here
  // rather than by the generic mapper.
  if (code.includes("api-key-not-valid")) {
    return "The CMS is not configured correctly. Its Firebase credentials are missing or invalid — please contact your administrator.";
  }
  if (code.includes("invalid-credential") || code.includes("user-not-found") || code.includes("wrong-password")) {
    return "Incorrect email or password. Please check your details and try again.";
  }
  if (code.includes("invalid-email")) {
    return "That doesn't look like a valid email address. Please check it and try again.";
  }
  if (code.includes("user-disabled")) {
    return "This account has been disabled. Please contact your administrator to restore access.";
  }
  if (code.includes("too-many-requests")) {
    return "Too many sign-in attempts. For security, please wait a few minutes before trying again.";
  }

  const { title, message } = toUserFacingError(error, "signing you in");
  return `${title}. ${message}`;
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

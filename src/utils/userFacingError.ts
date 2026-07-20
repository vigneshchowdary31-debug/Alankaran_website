/**
 * Translates technical failures into messages an administrator can act on.
 *
 * Two rules govern this module:
 *
 *  1. Nothing internal reaches the user. No stack traces, no Firebase error codes, no document
 *     paths, no "FirebaseError:" prefixes. Those go to the console instead, where the developer
 *     tracing a problem can find them.
 *  2. Every message answers three questions: what happened, why, and what to do next. A message
 *     that only says "Operation failed" leaves the user with no move.
 */

export interface UserFacingError {
  /** Short headline, sentence case, no error codes. */
  title: string;
  /** Plain-language explanation plus the suggested next step. */
  message: string;
  /**
   * Whether retrying the same action could plausibly succeed. Drives whether the UI offers a
   * "Try again" button — offering retry on a permission error just wastes the user's time.
   */
  retryable: boolean;
}

/** Extracts a lowercase haystack from any thrown value without assuming its shape. */
function describe(error: unknown): string {
  if (!error) return "";
  const e = error as any;
  return String(e.code || "") + " " + String(e.message || "") + " " + String(e.name || "");
}

const OFFLINE: UserFacingError = {
  title: "You appear to be offline",
  message:
    "We couldn't reach the server. Check your internet connection, then try again — your unsaved changes are still here.",
  retryable: true,
};

/**
 * Maps any thrown value to a user-facing message.
 *
 * `context` names the action in progress ("saving your changes", "loading the gallery") so the
 * message can be specific without the caller having to write a bespoke string each time.
 */
export function toUserFacingError(error: unknown, context?: string): UserFacingError {
  // A genuinely offline browser trumps whatever code the SDK reported.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return OFFLINE;

  const haystack = describe(error).toLowerCase();
  const doing = context ? ` while ${context}` : "";

  if (haystack.includes("permission-denied") || haystack.includes("insufficient permissions")) {
    return {
      title: "You don't have permission to do that",
      message:
        "Your account isn't allowed to make this change. If you believe this is a mistake, ask your administrator to check your access — or confirm the database security rules have been deployed.",
      retryable: false,
    };
  }

  if (haystack.includes("unauthenticated") || haystack.includes("auth/")) {
    return {
      title: "Your session has expired",
      message: "Please sign in again to continue. Any unsaved changes on this page will be lost.",
      retryable: false,
    };
  }

  if (
    haystack.includes("unavailable") ||
    haystack.includes("network") ||
    haystack.includes("timeout") ||
    haystack.includes("deadline")
  ) {
    return {
      title: "Couldn't reach the server",
      message: `The connection timed out${doing}. Check your internet connection and try again in a moment.`,
      retryable: true,
    };
  }

  if (haystack.includes("not-found") || haystack.includes("not found")) {
    return {
      title: "We couldn't find that item",
      message:
        "It may have been deleted or moved by someone else. Refresh the page to see the current content.",
      retryable: false,
    };
  }

  if (haystack.includes("already-exists")) {
    return {
      title: "That already exists",
      message: "An item with this name is already saved. Choose a different name and try again.",
      retryable: false,
    };
  }

  if (haystack.includes("quota") || haystack.includes("resource-exhausted")) {
    return {
      title: "Service limit reached",
      message:
        "The database has hit its usage limit for now. Please wait a few minutes and try again. If this keeps happening, contact your administrator.",
      retryable: true,
    };
  }

  // Cloudinary upload rejections carry a readable message, but not one meant for end users.
  if (haystack.includes("upload") || haystack.includes("cloudinary")) {
    return {
      title: "The image couldn't be uploaded",
      message:
        "Check that the file is a JPG, PNG, WebP or AVIF under 10 MB, then try again. If it keeps failing, try a different image.",
      retryable: true,
    };
  }

  if (haystack.includes("cancel") || haystack.includes("abort")) {
    return {
      title: "Cancelled",
      message: "The action was stopped before it finished. Nothing was changed.",
      retryable: true,
    };
  }

  return {
    title: "Something went wrong",
    message: `We hit an unexpected problem${doing}. Refresh the page and try again — if the problem continues, contact your administrator.`,
    retryable: true,
  };
}

/**
 * Logs the full technical detail for developers, then returns the sanitised user-facing version.
 * Use this at the boundary where an error becomes a toast or an error panel.
 */
export function reportError(error: unknown, context?: string): UserFacingError {
  const friendly = toUserFacingError(error, context);
  if (import.meta.env.DEV) {
    console.error(`[${context || "error"}]`, error);
  }
  return friendly;
}

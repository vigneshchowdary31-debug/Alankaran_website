/**
 * Standardized system messaging for notifications, alerts, and feedback.
 */
export const MESSAGES = {
  SUCCESS: {
    LOGIN: "Successfully signed in to Alankaran CMS Dashboard.",
    LOGOUT: "You have been successfully logged out of the CMS.",
  },
  ERROR: {
    AUTH_REQUIRED: "Authentication required. Please sign in to access the administrative portal.",
    INVALID_CREDENTIALS: "Incorrect email or password. Please verify your credentials and try again.",
    UNAUTHORIZED: "You do not have sufficient permissions to perform this action.",
    NETWORK: "Unable to connect to server. Please verify your internet connection.",
    UNKNOWN: "An unexpected system error occurred. Please try again or contact support.",
  },
  INFO: {
    SESSION_ACTIVE: "Active secure session verified.",
    UNDER_CONSTRUCTION: "This module is scheduled for an upcoming development phase.",
  },
} as const;

/**
 * Global application metadata and default configurations.
 */
export const APP_CONFIG = {
  NAME: "Alankaran Luxury Weddings",
  CMS_TITLE: "Alankaran Custom Image CMS",
  CMS_VERSION: "v1.5.0-hardened",
  ENVIRONMENT: import.meta.env.MODE || "production",
  SUPPORT_EMAIL: "admin@alankaran.com",
  MAX_UPLOAD_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/avif"],
} as const;

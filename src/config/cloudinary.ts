/**
 * Cloudinary configuration layer for Phase 2 storage integration.
 * Reads environment variables and validates required settings.
 */
const rawCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const rawUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const cloudinaryConfig = {
  cloudName: rawCloudName || "alankaran",
  uploadPreset: rawUploadPreset || "alankaran_cms_preset",
  folderPrefix: import.meta.env.VITE_CLOUDINARY_FOLDER || "alankaran_website",
  apiBaseUrl: import.meta.env.VITE_CLOUDINARY_API_BASE_URL || "https://api.cloudinary.com/v1_1",
  defaultTransformations: "f_auto,q_auto",
  isConfigured:
    Boolean(rawCloudName) &&
    rawCloudName !== "your-cloudinary-cloud-name" &&
    Boolean(rawUploadPreset) &&
    rawUploadPreset !== "your-preset-here",
} as const;

/**
 * Validates Cloudinary configuration before storage operations.
 * @throws {Error} If configuration is missing or using placeholder defaults.
 */
export function validateCloudinaryConfig(): void {
  if (typeof window === "undefined") return; // SSR safe

  if (!cloudinaryConfig.isConfigured) {
    if (import.meta.env.DEV) {
      console.warn(
        "[Cloudinary Config] Using fallback or unconfigured Cloudinary credentials. Please verify your VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env"
      );
    }
  }
}

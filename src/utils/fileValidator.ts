import { APP_CONFIG } from "@/constants/app";
import type { ValidationResult } from "@/storage/storage.interface";

/**
 * Validates image file formats and maximum byte size prior to storage upload.
 */
export const fileValidator = {
  /**
   * Validate file against maximum allowed size and supported MIME types.
   */
  validate(file: File): ValidationResult {
    if (!file) {
      return { valid: false, error: "No file provided for upload." };
    }

    // Check size (10 MB limit)
    const maxSizeBytes = APP_CONFIG.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `File size (${sizeMB} MB) exceeds the maximum allowed limit of ${APP_CONFIG.MAX_UPLOAD_SIZE_MB} MB. Please select or compress your image.`,
      };
    }

    // Check format
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ];
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const isValidExtension =
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png") ||
      fileName.endsWith(".webp") ||
      fileName.endsWith(".svg");

    if (!allowedTypes.includes(fileType) && !isValidExtension) {
      return {
        valid: false,
        error: `Unsupported file format (${file.type || "unknown"}). Allowed formats are JPG, JPEG, PNG, WEBP, and SVG.`,
      };
    }

    return { valid: true };
  },
};

export const { validate: validateImageFile } = fileValidator;
export default fileValidator;

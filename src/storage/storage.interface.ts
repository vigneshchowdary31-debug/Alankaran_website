import type { ImageTransformation } from "@/types";

export interface StorageAsset {
  id: string; // public_id in Cloudinary
  url: string; // secure_url
  filename: string; // original_filename
  format: string; // e.g. webp, jpg, png
  sizeBytes: number; // bytes
  width?: number;
  height?: number;
  resourceType?: string; // e.g. image
  createdAt: number;
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  onProgress?: (percentage: number) => void;
  signal?: AbortSignal;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Storage Abstraction Interface.
 * Cloudinary implements this interface. Future storage providers (Firebase Storage, S3, Cloudflare R2)
 * can be swapped directly without any UI or component code modifications.
 */
export interface IStorageProvider {
  /**
   * Upload a file to the storage provider.
   */
  upload(file: File, options?: UploadOptions): Promise<StorageAsset>;

  /**
   * Replace an existing asset with a new file.
   */
  replace(publicId: string, file: File, options?: UploadOptions): Promise<StorageAsset>;

  /**
   * Detach an asset from the CMS.
   *
   * Providers that cannot delete safely from the browser (e.g. Cloudinary, where
   * destroy requires a server-side signature) may treat this as a no-op and let
   * Firestore removal be the effective delete.
   */
  delete(publicId: string): Promise<boolean>;

  /**
   * Generate an optimized or transformed CDN URL for an asset.
   */
  getUrl(publicId: string, transformations?: ImageTransformation): string;

  /**
   * Validate file size and format prior to uploading.
   */
  validate(file: File): ValidationResult;
}

import { cloudinaryConfig, validateCloudinaryConfig } from "@/config/cloudinary";
import { fileValidator } from "@/utils/fileValidator";
import { imageOptimizer } from "@/utils/imageOptimizer";
import type {
  IStorageProvider,
  StorageAsset,
  UploadOptions,
  ValidationResult,
} from "./storage.interface";
import type { ImageTransformation } from "@/types";

/**
 * Cloudinary Storage Provider implementing IStorageProvider interface.
 * UI components must communicate only through this abstraction layer.
 */
export class CloudinaryStorage implements IStorageProvider {
  /**
   * Validate file against format and maximum byte limits.
   */
  public validate(file: File): ValidationResult {
    return fileValidator.validate(file);
  }

  /**
   * Upload an image to Cloudinary CDN via XHR to support real-time progress monitoring and cancellation.
   */
  public async upload(file: File, options?: UploadOptions): Promise<StorageAsset> {
    validateCloudinaryConfig();

    const validation = this.validate(file);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid file format or size.");
    }

    // Optimize image before uploading
    const optimizedFile = await imageOptimizer.optimize(file);

    const formData = new FormData();
    formData.append("file", optimizedFile);
    formData.append("upload_preset", cloudinaryConfig.uploadPreset);

    const folder = options?.folder || cloudinaryConfig.folderPrefix;
    if (folder) {
      formData.append("folder", folder);
    }

    if (options?.publicId) {
      // Clean up publicId if it already includes the folder path
      const cleanPublicId = options.publicId.includes("/")
        ? options.publicId.split("/").pop()!
        : options.publicId;
      formData.append("public_id", cleanPublicId);
    }

    // Unsigned uploads accept only a fixed parameter allow-list. Do NOT append
    // `return_delete_token` or `overwrite` — Cloudinary rejects the whole upload
    // with "<Param> parameter is not allowed when using unsigned upload."
    // Sending an API secret to sign the request is not an option in the browser.
    // Asset lifecycle is tracked in Firestore; cloud-side cleanup is deferred to
    // a future signed backend job.

    const uploadUrl = `${cloudinaryConfig.apiBaseUrl}/${cloudinaryConfig.cloudName}/image/upload`;

    return new Promise<StorageAsset>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Handle cancellation if AbortSignal is passed
      if (options?.signal) {
        if (options.signal.aborted) {
          return reject(new Error("Upload cancelled by user."));
        }
        options.signal.addEventListener("abort", () => {
          xhr.abort();
          reject(new Error("Upload cancelled by user."));
        });
      }

      // Track progress
      if (xhr.upload && options?.onProgress) {
        xhr.upload.addEventListener("progress", (evt) => {
          if (evt.lengthComputable) {
            const percentage = Math.round((evt.loaded / evt.total) * 100);
            options.onProgress!(Math.min(percentage, 99)); // Cap at 99% until response completes
          }
        });
      }

      xhr.open("POST", uploadUrl, true);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (options?.onProgress) {
              options.onProgress(100);
            }

            const asset: StorageAsset = {
              id: response.public_id,
              url: response.secure_url,
              filename: response.original_filename || optimizedFile.name,
              format: response.format || optimizedFile.type.split("/")[1] || "webp",
              sizeBytes: response.bytes || optimizedFile.size,
              width: response.width,
              height: response.height,
              resourceType: response.resource_type || "image",
              createdAt: response.created_at ? new Date(response.created_at).getTime() : Date.now(),
            };

            resolve(asset);
          } catch (parseErr) {
            reject(new Error("Failed to parse Cloudinary response data."));
          }
        } else {
          let errorMessage = `Upload failed (Status ${xhr.status})`;
          try {
            const errJson = JSON.parse(xhr.responseText);
            if (errJson.error && errJson.error.message) {
              errorMessage = errJson.error.message;
            }
          } catch {
            // Use default HTTP status message
          }
          reject(new Error(errorMessage));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during Cloudinary upload. Please check your internet connection."));
      };

      xhr.onabort = () => {
        reject(new Error("Upload cancelled by user."));
      };

      xhr.send(formData);
    });
  }

  /**
   * Replace an existing image asset with a new file.
   *
   * The new file is uploaded as a NEW Cloudinary asset and the caller is
   * expected to repoint its Firestore record at the returned URL.
   *
   * We deliberately do not reuse `publicId`: overwriting requires the
   * `overwrite` parameter, which unsigned uploads reject. Without it Cloudinary
   * silently returns the *existing* asset and discards the new file — the CMS
   * would report a successful replace while the image never changed.
   *
   * The superseded Cloudinary asset is left in place (see `delete`) and will be
   * reclaimed by a future backend cleanup job.
   */
  public async replace(
    _publicId: string,
    file: File,
    options?: UploadOptions
  ): Promise<StorageAsset> {
    return await this.upload(file, { ...options, publicId: undefined });
  }

  /**
   * Detach an image from the CMS.
   *
   * Cloud-side deletion is intentionally disabled. Destroying a Cloudinary asset
   * requires a signed Admin API call, and the API secret must never reach the
   * frontend. Unsigned `delete_by_token` is not an option either — it requires
   * `return_delete_token` at upload time, which Cloudinary rejects for unsigned
   * presets.
   *
   * Firestore remains the source of truth: removing the asset record there is
   * what takes the image out of the site, Trash, and Version History. Orphaned
   * Cloudinary assets are expected to accumulate until a backend cleanup job
   * (signed, server-side) is implemented.
   */
  public async delete(publicId: string): Promise<boolean> {
    if (!publicId) return false;

    if (import.meta.env.DEV) {
      console.info(
        `[CloudinaryStorage] Detached asset "${publicId}" from the CMS. The Cloudinary object is retained and will be reclaimed by a future backend cleanup job.`
      );
    }

    return true;
  }

  /**
   * Generate an optimized Cloudinary CDN URL applying exact transformations.
   */
  public getUrl(publicIdOrUrl: string, transformations?: ImageTransformation): string {
    if (!publicIdOrUrl) return "";

    // If already a full Cloudinary secure_url, inject transformation string right after `/image/upload/`
    if (publicIdOrUrl.startsWith("http://") || publicIdOrUrl.startsWith("https://")) {
      if (!transformations) return publicIdOrUrl;

      const transArray: string[] = [];
      if (transformations.width) transArray.push(`w_${transformations.width}`);
      if (transformations.height) transArray.push(`h_${transformations.height}`);
      if (transformations.crop) transArray.push(`c_${transformations.crop}`);
      if (transformations.quality) transArray.push(`q_${transformations.quality}`);
      if (transformations.format) transArray.push(`f_${transformations.format}`);
      else transArray.push("f_auto");

      if (transArray.length === 0) return publicIdOrUrl;
      const transStr = transArray.join(",");

      if (publicIdOrUrl.includes("/image/upload/")) {
        return publicIdOrUrl.replace("/image/upload/", `/image/upload/${transStr}/`);
      }
      return publicIdOrUrl;
    }

    // Build URL from publicId
    const transArray: string[] = ["f_auto", "q_auto"];
    if (transformations?.width) transArray.push(`w_${transformations.width}`);
    if (transformations?.height) transArray.push(`h_${transformations.height}`);
    if (transformations?.crop) transArray.push(`c_${transformations.crop}`);
    const transStr = transArray.join(",");

    return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/${transStr}/${publicIdOrUrl}`;
  }
}

export const cloudinaryStorage = new CloudinaryStorage();
export default cloudinaryStorage;

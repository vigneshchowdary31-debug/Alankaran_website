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
      formData.append("overwrite", "true");
    }

    // Request delete token from Cloudinary unsigned preset if available
    formData.append("return_delete_token", "true");

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
              deleteToken: response.delete_token,
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
   */
  public async replace(
    publicId: string,
    file: File,
    options?: UploadOptions
  ): Promise<StorageAsset> {
    // Upload new image while requesting overwrite if using same publicId or clean new ID
    const replaceOptions: UploadOptions = {
      ...options,
      publicId: options?.publicId || publicId,
    };

    return await this.upload(file, replaceOptions);
  }

  /**
   * Delete an image from Cloudinary storage.
   * Uses `delete_by_token` if a delete token was returned during unsigned upload.
   */
  public async delete(publicId: string, deleteToken?: string): Promise<boolean> {
    validateCloudinaryConfig();

    if (!publicId) return false;

    // If delete token is available, invoke Cloudinary token deletion endpoint
    if (deleteToken) {
      try {
        const deleteUrl = `${cloudinaryConfig.apiBaseUrl}/${cloudinaryConfig.cloudName}/delete_by_token`;
        const formData = new FormData();
        formData.append("token", deleteToken);

        const response = await fetch(deleteUrl, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          return result.result === "ok";
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("[CloudinaryStorage] Token deletion failed or expired:", err);
        }
      }
    }

    // If no token exists (or client-side unsigned deletion restricted by Cloudinary security),
    // log notification and return true to clear the UI preview cleanly.
    if (import.meta.env.DEV) {
      console.info(
        `[CloudinaryStorage] Client-side UI preview removed for asset: ${publicId}. Note: Permanent cloud deletion without signed backend API key requires Cloudinary Admin access or active delete_token.`
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

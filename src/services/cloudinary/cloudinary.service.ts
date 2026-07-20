import type { ImageAsset } from "@/types";
import { storageProvider, type UploadOptions } from "@/storage";
import { authService } from "@/services/auth/auth.service";

/**
 * Interface definition for Phase 2 Cloudinary Service operations.
 * Maps raw storage assets to typed domain `ImageAsset` objects.
 */
export interface ICloudinaryService {
  uploadImage(
    file: File,
    sectionKey: string,
    slotName: string,
    altText: string,
    options?: UploadOptions
  ): Promise<ImageAsset>;

  replaceImage(
    publicId: string,
    file: File,
    sectionKey: string,
    slotName: string,
    altText: string,
    options?: UploadOptions
  ): Promise<ImageAsset>;

  deleteImage(publicId: string): Promise<boolean>;
}

export const cloudinaryService: ICloudinaryService = {
  async uploadImage(
    file: File,
    sectionKey: string,
    slotName: string,
    altText: string,
    options?: UploadOptions
  ): Promise<ImageAsset> {
    const storageAsset = await storageProvider.upload(file, {
      ...options,
      folder: options?.folder || `alankaran_website/${sectionKey}`,
    });

    const currentUser = authService.getCurrentUser();

    return {
      id: `${sectionKey}_${slotName}_${Date.now()}`,
      sectionKey,
      slotName,
      cloudinaryId: storageAsset.id,
      url: storageAsset.url,
      altText: altText || file.name,
      width: storageAsset.width,
      height: storageAsset.height,
      sizeBytes: storageAsset.sizeBytes,
      format: storageAsset.format,
      resourceType: storageAsset.resourceType,
      originalFilename: storageAsset.filename,
      createdAt: storageAsset.createdAt,
      updatedAt: storageAsset.createdAt,
      updatedBy: currentUser?.email || "admin@alankaran.com",
    };
  },

  async replaceImage(
    publicId: string,
    file: File,
    sectionKey: string,
    slotName: string,
    altText: string,
    options?: UploadOptions
  ): Promise<ImageAsset> {
    const storageAsset = await storageProvider.replace(publicId, file, {
      ...options,
      folder: options?.folder || `alankaran_website/${sectionKey}`,
    });

    const currentUser = authService.getCurrentUser();

    return {
      id: `${sectionKey}_${slotName}_${Date.now()}`,
      sectionKey,
      slotName,
      cloudinaryId: storageAsset.id,
      url: storageAsset.url,
      altText: altText || file.name,
      width: storageAsset.width,
      height: storageAsset.height,
      sizeBytes: storageAsset.sizeBytes,
      format: storageAsset.format,
      resourceType: storageAsset.resourceType,
      originalFilename: storageAsset.filename,
      createdAt: storageAsset.createdAt,
      updatedAt: storageAsset.createdAt,
      updatedBy: currentUser?.email || "admin@alankaran.com",
    };
  },

  async deleteImage(publicId: string): Promise<boolean> {
    return await storageProvider.delete(publicId);
  },
};

export default cloudinaryService;

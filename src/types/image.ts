export interface ImageTransformation {
  width?: number;
  height?: number;
  quality?: string | number;
  format?: "auto" | "webp" | "avif" | "jpg" | "png";
  crop?: string;
}

export interface ImageAsset {
  id: string;
  sectionKey: string;
  slotName: string;
  cloudinaryId: string;
  url: string;
  altText: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  format?: string;
  resourceType?: string;
  originalFilename?: string;
  createdAt?: number;
  updatedAt: number;
  updatedBy: string;
}

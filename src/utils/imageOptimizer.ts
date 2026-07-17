/**
 * Modular client-side image optimization engine.
 * Compresses large image blobs prior to CDN upload while preserving aspect ratio and transparency.
 */
export interface OptimizationOptions {
  maxDimension?: number;
  compressionQuality?: number;
  sizeThresholdBytes?: number;
}

export const imageOptimizer = {
  /**
   * Optimize file before upload if it exceeds the byte threshold and is not an SVG.
   * @param file Original File object chosen by user
   * @param options Compression targets
   * @returns Optimized File or the original File if optimization is unnecessary or unsupported
   */
  async optimize(
    file: File,
    options: OptimizationOptions = {
      maxDimension: 2560, // 2.5K max width/height to avoid excessive memory and upload bandwidth
      compressionQuality: 0.85,
      sizeThresholdBytes: 2 * 1024 * 1024, // Optimize if larger than 2 MB
    }
  ): Promise<File> {
    // If SSR or non-browser environment, or SVG / very small file, return original
    if (typeof window === "undefined" || !file || file.type === "image/svg+xml") {
      return file;
    }

    const { maxDimension = 2560, compressionQuality = 0.85, sizeThresholdBytes = 2 * 1024 * 1024 } = options;

    // Only run canvas recompression if file size is above threshold or dimensions need capping
    if (file.size <= sizeThresholdBytes) {
      return file;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const { width, height } = bitmap;

      // Do not upscale. Calculate scaling ratio if width or height > maxDimension
      let targetWidth = width;
      let targetHeight = height;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        targetWidth = Math.round(width * ratio);
        targetHeight = Math.round(height * ratio);
      } else if (file.size <= sizeThresholdBytes) {
        bitmap.close();
        return file;
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        bitmap.close();
        return file;
      }

      // Preserve transparency for PNG/WEBP by not filling background with opaque white unless it's a JPEG
      const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg";
      if (isJpeg) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      bitmap.close();

      const outputMimeType = isJpeg ? "image/jpeg" : "image/webp";
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputMimeType, compressionQuality);
      });

      if (!blob || blob.size >= file.size) {
        // If recompression did not reduce file size, return original file
        return file;
      }

      // Create new File from optimized blob with same filename and modified timestamp
      const optimizedName = file.name.replace(/\.[^/.]+$/, isJpeg ? ".jpg" : ".webp");
      return new File([blob], optimizedName, {
        type: outputMimeType,
        lastModified: Date.now(),
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[ImageOptimizer] Optimization skipped due to canvas error:", err);
      }
      return file;
    }
  },
};

export const { optimize: optimizeImage } = imageOptimizer;
export default imageOptimizer;

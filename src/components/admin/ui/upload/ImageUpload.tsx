import React, { useState, useRef, useEffect } from "react";
import { cloudinaryService } from "@/services/cloudinary/cloudinary.service";
import { storageProvider } from "@/storage";
import { showSuccess, showError } from "@/utils/toast";
import type { ImageAsset } from "@/types";
import { UploadDropzone } from "./UploadDropzone";
import { UploadProgress } from "./UploadProgress";
import { ImagePreview } from "./ImagePreview";
import { DeleteDialog } from "./DeleteDialog";
import { cn } from "@/lib/utils";

export interface ImageUploadProps {
  sectionKey: string;
  slotName: string;
  label?: string;
  description?: string;
  initialAsset?: ImageAsset | null;
  onUploadSuccess?: (asset: ImageAsset) => void;
  onRemoveSuccess?: () => void;
  className?: string;
}

/**
 * Master Reusable ImageUpload Controller Component for Alankaran CMS Phase 2 & 3.
 * Encapsulates Drag & Drop selection, client-side validation, Cloudinary CDN XHR upload,
 * real-time progress bar, abort/retry handling, live preview cards, and confirmation modal deletion.
 */
export function ImageUpload({
  sectionKey,
  slotName,
  label,
  description,
  initialAsset = null,
  onUploadSuccess,
  onRemoveSuccess,
  className,
}: ImageUploadProps) {
  const [currentAsset, setCurrentAsset] = useState<ImageAsset | null>(initialAsset);
  const [status, setStatus] = useState<"idle" | "uploading" | "error" | "success">("idle");
  const [uploadPercentage, setUploadPercentage] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingFilename, setUploadingFilename] = useState<string>("");
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);

  // Deletion state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Abort controller for upload cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Synchronize currentAsset with initialAsset when Firestore data loads or mutates across tabs (Phase 3)
  useEffect(() => {
    if (initialAsset && initialAsset.url !== currentAsset?.url) {
      setCurrentAsset(initialAsset);
      setStatus("success");
    } else if (initialAsset === null && currentAsset && status !== "uploading") {
      setCurrentAsset(null);
      setStatus("idle");
    }
  }, [initialAsset]);

  const handleFileSelect = async (file: File) => {
    setLastSelectedFile(file);
    setErrorMessage(null);

    // Validate using storage abstraction
    const validation = storageProvider.validate(file);
    if (!validation.valid) {
      setStatus("error");
      setErrorMessage(validation.error || "Unsupported image file format or size limit exceeded.");
      showError("Validation Error", validation.error || "Unsupported image file format or size limit exceeded.");
      return;
    }

    // Prepare abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("uploading");
    setUploadPercentage(5);
    setUploadingFilename(file.name);

    try {
      let newAsset: ImageAsset;
      const uploadOptions = {
        folder: `alankaran_website/${sectionKey}`,
        signal: controller.signal,
        onProgress: (percentage: number) => {
          setUploadPercentage(percentage);
        },
      };

      if (currentAsset && currentAsset.cloudinaryId) {
        // Replace existing asset
        newAsset = await cloudinaryService.replaceImage(
          currentAsset.cloudinaryId,
          file,
          sectionKey,
          slotName,
          file.name,
          uploadOptions
        );
      } else {
        // Upload new asset
        newAsset = await cloudinaryService.uploadImage(
          file,
          sectionKey,
          slotName,
          file.name,
          uploadOptions
        );
      }

      setStatus("success");
      setUploadPercentage(100);
      setCurrentAsset(newAsset);

      showSuccess(
        "Image Uploaded Successfully",
        `Asset "${file.name}" has been stored on Cloudinary CDN.`
      );

      if (onUploadSuccess) {
        onUploadSuccess(newAsset);
      }

      // Return to idle view after short success indication if preview card is rendered
      setTimeout(() => {
        setStatus("idle");
      }, 1500);
    } catch (err: any) {
      if (err.message && err.message.includes("cancelled")) {
        setStatus("idle");
        showSuccess("Upload Cancelled", "The image upload was cancelled.");
        return;
      }

      setStatus("error");
      const cleanError = err.message || "An unexpected error occurred while communicating with Cloudinary.";
      setErrorMessage(cleanError);
      showError("Cloudinary Upload Failed", cleanError);
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus("idle");
  };

  const handleRetryUpload = () => {
    if (lastSelectedFile) {
      handleFileSelect(lastSelectedFile);
    } else {
      setStatus("idle");
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentAsset) return;

    setIsDeleting(true);
    try {
      await cloudinaryService.deleteImage(currentAsset.cloudinaryId, (currentAsset as any).deleteToken);
      setCurrentAsset(null);
      setDeleteDialogOpen(false);
      showSuccess("Image Removed", `Asset "${currentAsset.altText || slotName}" has been removed from storage.`);

      if (onRemoveSuccess) {
        onRemoveSuccess();
      }
    } catch (err: any) {
      showError("Deletion Failed", err.message || "Unable to remove image asset.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={cn("space-y-4 select-none", className)}>
      {/* Optional Label & Description Header */}
      {(label || description) && (
        <div className="space-y-1">
          {label && (
            <h3 className="font-serif text-base text-stone-100 font-normal tracking-wide">
              {label}
            </h3>
          )}
          {description && (
            <p className="font-sans text-xs text-stone-400 font-light leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Render Progress Card during active upload or error/success */}
      {(status === "uploading" || status === "error" || (status === "success" && !currentAsset)) && (
        <UploadProgress
          filename={uploadingFilename}
          percentage={uploadPercentage}
          status={status}
          errorMessage={errorMessage}
          onCancel={handleCancelUpload}
          onRetry={handleRetryUpload}
        />
      )}

      {/* Render Preview Card when an asset is active and we are not currently uploading */}
      {currentAsset && status !== "uploading" ? (
        <>
          <ImagePreview
            asset={currentAsset}
            onReplaceClick={() => {
              // Trigger hidden file input inside dropzone or clear error
              setStatus("idle");
              setErrorMessage(null);
              // Open file picker by temporarily triggering dropzone click behavior
              const tempInput = document.createElement("input");
              tempInput.type = "file";
              tempInput.accept = "image/jpeg,image/png,image/webp,image/svg+xml";
              tempInput.onchange = (e) => {
                const target = e.target as HTMLInputElement;
                if (target.files && target.files.length > 0) {
                  handleFileSelect(target.files[0]);
                }
              };
              tempInput.click();
            }}
            onRemoveClick={() => setDeleteDialogOpen(true)}
          />

          <DeleteDialog
            isOpen={deleteDialogOpen}
            assetName={currentAsset.altText || slotName}
            isDeleting={isDeleting}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteDialogOpen(false)}
          />
        </>
      ) : status === "idle" ? (
        /* Render Dropzone when no image exists or after cancel */
        <UploadDropzone
          onFileSelect={handleFileSelect}
          error={errorMessage}
        />
      ) : null}
    </div>
  );
}

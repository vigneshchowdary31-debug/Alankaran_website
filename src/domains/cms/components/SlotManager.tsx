import React from "react";
import { useSection } from "../hooks/useSection";
import type { SectionKey, CMSSlotMetadata } from "../types";
import { ImageUpload } from "@/components/admin/ui/upload/ImageUpload";
import type { ImageAsset } from "@/types";
import { Loader2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";

export interface SlotManagerProps {
  sectionKey: SectionKey | string;
  slotName: string;
  label?: string;
  description?: string;
  className?: string;
}

/**
 * Smart CMS Domain Component (`SlotManager`).
 * Automatically binds Phase 2 `ImageUpload` component directly to Phase 3 Firestore `useSection` hook.
 * Handles automatic reading, saving upload results, loading states,
 * and real-time multi-tab synchronization.
 */
export function SlotManager({
  sectionKey,
  slotName,
  label,
  description,
  className,
}: SlotManagerProps) {
  const { section, status, error, getSlot, saveSlot, softDelete } = useSection(sectionKey);
  const { currentUser } = useAuth();

  const savedSlot: CMSSlotMetadata | undefined = getSlot(slotName);

  // Map domain slot record (`CMSSlotMetadata`) to UI presentation model (`ImageAsset`)
  const initialAsset: ImageAsset | null = savedSlot
    ? {
        id: savedSlot.id,
        sectionKey: savedSlot.sectionKey,
        slotName: savedSlot.slotName,
        cloudinaryId: savedSlot.cloudinaryId,
        url: savedSlot.url,
        altText: savedSlot.altText || label || slotName,
        width: savedSlot.width,
        height: savedSlot.height,
        sizeBytes: savedSlot.sizeBytes,
        format: savedSlot.format,
        resourceType: savedSlot.resourceType,
        originalFilename: savedSlot.altText,
        createdAt: savedSlot.createdAt,
        updatedAt: savedSlot.updatedAt,
        updatedBy: savedSlot.updatedBy,
      }
    : null;

  const handleUploadSuccess = async (asset: ImageAsset) => {
    const metadata: CMSSlotMetadata = {
      id: asset.id,
      sectionKey,
      slotName,
      cloudinaryId: asset.cloudinaryId,
      url: asset.url,
      altText: asset.altText || label || slotName,
      width: asset.width,
      height: asset.height,
      format: asset.format || "webp",
      resourceType: asset.resourceType || "image",
      sizeBytes: asset.sizeBytes || 0,
      createdAt: asset.createdAt || Date.now(),
      updatedAt: Date.now(),
      updatedBy: asset.updatedBy || "admin@alankaran.com",
    };

    const success = await saveSlot(slotName, metadata);
    if (success) {
      showSuccess("Image Updated", `"${label || slotName}" is now live on your website.`);
    } else {
      // The Cloudinary upload already reported success, so a silent save failure here reads as
      // "the upload worked" while nothing was persisted. Always surface it — in client language.
      showError(
        "Couldn't Save Image",
        `"${label || slotName}" uploaded but couldn't be saved. Please try again.`
      );
    }
  };

  /**
   * Persist the removal.
   *
   * `ImageUpload` only clears its own React state when the Remove dialog is confirmed — it has no
   * knowledge of Firestore. Without this callback the slot was never soft-deleted: no trash record
   * was written, the Firestore document kept the slot, and the image reappeared on the next reload
   * while the site went on rendering it. This is the CMS-side half of the delete.
   */
  const handleRemoveSuccess = async () => {
    const ok = await softDelete(slotName, currentUser?.email || "admin@alankaran.com");
    if (ok) {
      showSuccess(
        "Image Removed",
        `"${label || slotName}" has been removed from your website and archived in Trash.`
      );
    } else {
      showError(
        "Couldn't Remove Image",
        `"${label || slotName}" couldn't be removed and is still live. Please try again.`
      );
    }
  };

  return (
    <div className="relative">
      {/* Quiet saving indicator — only appears mid-save. The developer "FIRESTORE SLOT" label was
          removed as part of the client-facing polish; behaviour is unchanged. */}
      {status === "saving" && (
        <div className="flex items-center justify-end gap-1.5 mb-2 text-[11px] text-gold/90">
          <Loader2 className="size-3 animate-spin" />
          <span>Saving…</span>
        </div>
      )}

      <ImageUpload
        sectionKey={sectionKey}
        slotName={slotName}
        label={label}
        description={description}
        initialAsset={initialAsset}
        onUploadSuccess={handleUploadSuccess}
        onRemoveSuccess={handleRemoveSuccess}
        className={className}
      />
    </div>
  );
}

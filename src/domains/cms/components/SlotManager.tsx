import React from "react";
import { useSection } from "../hooks/useSection";
import type { SectionKey, CMSSlotMetadata } from "../types";
import { ImageUpload } from "@/components/admin/ui/upload/ImageUpload";
import type { ImageAsset } from "@/types";
import { Loader2, Database } from "lucide-react";
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
      showSuccess("CMS Database Updated", `Saved image metadata to Firestore [cmsSiteContent/${sectionKey}]`);
    } else {
      // The Cloudinary upload already reported success, so a silent Firestore failure here reads as
      // "the upload worked" while nothing was persisted. Always surface it.
      showError(
        "Firestore Save Failed",
        `Image reached Cloudinary but its metadata was NOT written to cmsSiteContent/${sectionKey}. See the console for the document path, UID, and error code.`
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
        "Moved to Trash",
        `"${label || slotName}" was removed from ${sectionKey} and archived in Trash. Publish the section to take it off the live site.`
      );
    } else {
      showError(
        "Delete Failed",
        `"${label || slotName}" could not be removed from cmsSiteContent/${sectionKey}. It is still live — see the console for the document path and error code.`
      );
    }
  };

  return (
    <div className="relative">
      {/* ── Status Bar for Section Synchronization ── */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-400">
          <Database className="size-3 text-gold" />
          <span>FIRESTORE SLOT: <strong className="text-stone-200">{sectionKey}/{slotName}</strong></span>
        </div>

        {status === "saving" && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-gold animate-pulse">
            <Loader2 className="size-3 animate-spin" />
            <span>Persisting to cloud...</span>
          </div>
        )}
      </div>

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

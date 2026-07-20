import React, { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  FileImage,
  Loader2,
  FolderPlus,
  Tag as TagIcon,
} from "lucide-react";
import { cloudinaryService } from "@/services/cloudinary/cloudinary.service";
import { cmsService } from "@/domains/cms/services/cms.service";
import { auditLogService } from "@/domains/cms/services/auditLog.service";
import { fileValidator } from "@/utils/fileValidator";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import type { CMSSlotMetadata, SectionKey } from "@/domains/cms/types";
import { GALLERY_CATEGORIES } from "@/domains/cms/constants";

export interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionKey?: SectionKey | string;
  onUploadComplete?: () => void;
  existingSlotCount?: number;
}

interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  errorMessage?: string;
  slotName?: string;
}

export function BulkUploadModal({
  isOpen,
  onClose,
  sectionKey = "gallery",
  onUploadComplete,
  existingSlotCount = 0,
}: BulkUploadModalProps) {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Royal Weddings");
  const [customTags, setCustomTags] = useState<string>("Luxury, Udaipur, Decor");

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadQueueItem[] = [];
    Array.from(files).forEach((file) => {
      // Use existing fileValidator.validate — single argument
      const validation = fileValidator.validate(file);
      if (!validation.valid) {
        showError("Invalid File Rejected", validation.error || "Unsupported file format.");
        return;
      }

      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
        progress: 0,
      });
    });

    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (isUploading) return;
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect, isUploading]
  );

  const removeItem = (id: string) => {
    if (isUploading) return;
    setQueue((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const startBulkUpload = async () => {
    if (queue.length === 0 || isUploading) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;
    const tagsArray = customTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // Fetch current section to determine incremental order indexes
    let currentMaxOrder = existingSlotCount;
    try {
      const sectionDoc = await cmsService.loadSection(sectionKey);
      if (sectionDoc?.slots) {
        Object.values(sectionDoc.slots).forEach((s: CMSSlotMetadata) => {
          if (typeof s.order === "number" && s.order > currentMaxOrder) {
            currentMaxOrder = s.order;
          }
        });
      }
    } catch {
      // Use existing count as fallback
    }

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === "success") {
        successCount++;
        continue;
      }

      // Mark item uploading
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading", progress: 25 } : q))
      );

      try {
        const cleanBasename = item.file.name
          .replace(/\.[^/.]+$/, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_");
        const slotName = `gallery_${cleanBasename}_${Date.now()}`;
        const altText = `${selectedCategory} — ${item.file.name.replace(/\.[^/.]+$/, "")}`;

        // Upload to Cloudinary using the established 4-argument API
        const imageAsset = await cloudinaryService.uploadImage(
          item.file,
          String(sectionKey),
          slotName,
          altText
        );

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, progress: 80 } : q))
        );

        const newOrderIndex = currentMaxOrder + successCount + 1;

        const slotMetadata: CMSSlotMetadata = {
          id: imageAsset.id,
          sectionKey: String(sectionKey),
          slotName,
          cloudinaryId: imageAsset.cloudinaryId,
          url: imageAsset.url,
          altText: imageAsset.altText,
          width: imageAsset.width,
          height: imageAsset.height,
          format: imageAsset.format,
          sizeBytes: imageAsset.sizeBytes,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          updatedBy: currentUser?.email || "admin@alankaran.com",
          caption: `Exquisite luxury decor and moments from our ${selectedCategory.toLowerCase()} collection.`,
          category: selectedCategory,
          tags: tagsArray,
          order: newOrderIndex,
          visibility: true,
        };

        // Persist slot metadata directly into Firestore draft/slots
        await cmsService.saveSlot(String(sectionKey), slotName, slotMetadata);

        // Record audit trail entry using the correct .log(action, userEmail, target, details) signature
        await auditLogService.log(
          "Upload",
          currentUser?.email || "admin@alankaran.com",
          `${sectionKey}/${slotName}`,
          `Bulk uploaded ${item.file.name} to Cloudinary (${imageAsset.cloudinaryId}) with category "${selectedCategory}"`
        );

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "success", progress: 100, slotName }
              : q
          )
        );
        successCount++;
      } catch (err: any) {
        errorCount++;
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "error", progress: 0, errorMessage: err.message || "Upload failed." }
              : q
          )
        );
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      showSuccess(
        "Bulk Upload Complete",
        `Successfully added ${successCount} image(s) to gallery Draft.${errorCount > 0 ? ` ${errorCount} failed.` : ""}`
      );
      if (onUploadComplete) onUploadComplete();
    } else if (errorCount > 0) {
      showError("Bulk Upload Failed", "None of the selected images could be uploaded. Please verify your Cloudinary connection.");
    }
  };

  const handleModalClose = () => {
    if (isUploading) return;
    setQueue([]);
    onClose();
  };

  const pendingCount = queue.filter((i) => i.status !== "success").length;
  const totalProgress =
    queue.length > 0
      ? Math.round(queue.reduce((acc, q) => acc + q.progress, 0) / queue.length)
      : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-3xl bg-stone-950 border-gold/30 text-stone-200 shadow-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-4 border-b border-stone-800/80">
          <DialogTitle className="font-serif text-xl text-stone-100 flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
              <UploadCloud className="size-4" />
            </div>
            <span>Bulk Gallery Image Uploader</span>
          </DialogTitle>
          <DialogDescription className="font-sans text-xs text-stone-400">
            Upload multiple high-resolution wedding moments directly to Cloudinary. All items are automatically assigned your selected category and persisted to the working Draft.
          </DialogDescription>
        </DialogHeader>

        {/* Category & Tags Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 bg-stone-900/50 border border-stone-800/80 rounded-xl px-4">
          <div>
            <label className="block text-[11px] font-mono text-gold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FolderPlus className="size-3 text-gold" /> Assign Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={isUploading}
              className="w-full bg-black/60 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-gold transition-colors"
            >
              {GALLERY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-stone-900 text-stone-200">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <TagIcon className="size-3 text-gold" /> Default Tags (Comma separated)
            </label>
            <input
              type="text"
              value={customTags}
              onChange={(e) => setCustomTags(e.target.value)}
              disabled={isUploading}
              placeholder="e.g. Luxury, Udaipur, Floral"
              className="w-full bg-black/60 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-gold transition-colors"
            />
          </div>
        </div>

        {/* Drag & Drop Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isUploading
              ? "border-stone-800 bg-black/30 opacity-60 cursor-not-allowed"
              : "border-gold/30 hover:border-gold/60 bg-black/40 hover:bg-gold/5"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <UploadCloud className="size-8 text-gold mx-auto mb-2 opacity-80" />
          <p className="font-serif text-sm text-stone-200">
            Drag & drop multiple images here, or{" "}
            <span className="text-gold underline font-semibold">browse files</span>
          </p>
          <p className="font-sans text-[11px] text-stone-400 mt-1">
            Supports WebP, JPG, PNG, and SVG · Max 10 MB per file · Up to 20 images at once
          </p>
        </div>

        {/* Overall Upload Progress bar */}
        {isUploading && (
          <div className="space-y-1.5 bg-gold/10 border border-gold/30 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs font-mono text-gold">
              <span className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" /> Uploading to Cloudinary CDN & Saving to Firestore...
              </span>
              <span>{totalProgress}%</span>
            </div>
            <Progress value={totalProgress} className="h-2 bg-black/60" />
          </div>
        )}

        {/* Selected Files Queue */}
        <div className="flex-1 overflow-y-auto min-h-[160px] max-h-[260px] space-y-2 pr-1 my-2">
          {queue.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-500 py-8 border border-stone-800/40 rounded-xl bg-black/20">
              <FileImage className="size-6 mb-2 opacity-40" />
              <p className="font-sans text-xs">No images added to queue yet.</p>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-stone-900/60 border border-stone-800 rounded-xl p-2.5 gap-3 hover:border-stone-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-11 rounded-lg overflow-hidden border border-stone-700/80 bg-black shrink-0">
                    <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-xs text-stone-200 font-medium truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400 mt-0.5">
                      <span>{(item.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                      <span>•</span>
                      <span className="text-gold">{selectedCategory}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.status === "uploading" && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gold">{item.progress}%</span>
                      <Loader2 className="size-4 animate-spin text-gold" />
                    </div>
                  )}
                  {item.status === "success" && (
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Saved
                    </span>
                  )}
                  {item.status === "error" && (
                    <span
                      title={item.errorMessage}
                      className="text-[11px] font-mono text-red-400 bg-red-950/80 border border-red-800 px-2 py-0.5 rounded flex items-center gap-1 max-w-[140px] truncate"
                    >
                      <AlertCircle className="size-3 shrink-0" /> {item.errorMessage || "Error"}
                    </span>
                  )}
                  {item.status === "pending" && !isUploading && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-stone-400 hover:text-red-400 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-stone-800/80 flex items-center justify-between gap-3 sm:justify-between">
          <div className="text-xs font-mono text-stone-400">
            {queue.length > 0 ? `${queue.length} files (${pendingCount} pending)` : "0 files selected"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleModalClose}
              disabled={isUploading}
              className="text-xs font-sans border-stone-700 bg-stone-900/60 text-stone-300"
            >
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={startBulkUpload}
              disabled={queue.length === 0 || pendingCount === 0 || isUploading}
              className="gap-2 text-xs font-sans bg-gold text-nizami-dark hover:bg-gold-light font-semibold"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="size-3.5" />
                  <span>Start Bulk Upload</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

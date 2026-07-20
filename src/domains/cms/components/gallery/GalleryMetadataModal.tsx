import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tag,
  Save,
  Loader2,
  Image as ImageIcon,
  FolderTree,
  Hash,
  Eye,
  FileText,
} from "lucide-react";
import { cmsService } from "@/domains/cms/services/cms.service";
import { auditLogService } from "@/domains/cms/services/auditLog.service";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import type { CMSSlotMetadata } from "@/domains/cms/types";
import { GALLERY_CATEGORIES } from "@/domains/cms/constants";

export interface GalleryMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: CMSSlotMetadata | null;
  onSave?: (updatedSlot: CMSSlotMetadata) => void;
}

export function GalleryMetadataModal({
  isOpen,
  onClose,
  slot,
  onSave,
}: GalleryMetadataModalProps) {
  const { currentUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState("Royal Weddings");
  const [order, setOrder] = useState<number>(1);
  const [visibility, setVisibility] = useState(true);

  useEffect(() => {
    if (slot) {
      setAltText(slot.altText || "");
      setCaption(slot.caption || "");
      setTagsInput((slot.tags || []).join(", "));
      setCategory(slot.category || "Royal Weddings");
      setOrder(typeof slot.order === "number" ? slot.order : 1);
      setVisibility(slot.visibility !== false);
    }
  }, [slot, isOpen]);

  if (!slot) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const tagsArray = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const updatedSlot: CMSSlotMetadata = {
        ...slot,
        altText: altText.trim() || slot.slotName,
        caption: caption.trim(),
        tags: tagsArray,
        category,
        order: Number(order) || 1,
        visibility,
        updatedAt: Date.now(),
        updatedBy: currentUser?.email || "admin@alankaran.com",
      };

      await cmsService.saveSlot(slot.sectionKey, slot.slotName, updatedSlot);

      // Use correct 4-arg signature: log(action, userEmail, target, details)
      await auditLogService.log(
        "Replace",
        currentUser?.email || "admin@alankaran.com",
        `${slot.sectionKey}/${slot.slotName}`,
        `Updated gallery metadata: altText="${updatedSlot.altText}", category="${updatedSlot.category}", order=${updatedSlot.order}`
      );

      showSuccess("Gallery Metadata Saved", `Updated attributes for ${slot.slotName}.`);
      if (onSave) onSave(updatedSlot);
      onClose();
    } catch (err: any) {
      showError("Metadata Save Error", err.message || "Failed to update Firestore document.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSaving && !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-stone-950 border-gold/30 text-stone-200 shadow-2xl p-6">
        <DialogHeader className="pb-4 border-b border-stone-800/80">
          <DialogTitle className="font-serif text-xl text-stone-100 flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
              <Tag className="size-4" />
            </div>
            <span>Edit Gallery Metadata</span>
          </DialogTitle>
          <DialogDescription className="font-sans text-xs text-stone-400">
            Customize alt text, caption, categorization, display order, and visibility for{" "}
            <strong className="text-gold font-mono">{slot.slotName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-3">
          {/* Asset Preview Mini Bar */}
          <div className="flex items-center gap-4 p-3 bg-stone-900/60 border border-stone-800 rounded-xl">
            <div className="size-16 rounded-lg overflow-hidden border border-stone-700 bg-black shrink-0">
              <img src={slot.url} alt={slot.altText} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-sm text-stone-200 font-medium truncate">{slot.cloudinaryId}</p>
              <div className="flex items-center gap-3 text-xs font-mono text-stone-400 mt-1">
                <span>{slot.width} × {slot.height} px</span>
                <span>•</span>
                <span className="uppercase">{slot.format || "WEBP"}</span>
                <span>•</span>
                <span>{((slot.sizeBytes || 0) / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-gold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FolderTree className="size-3 text-gold" /> Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSaving}
                className="w-full bg-black/60 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-gold transition-colors"
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
                <Hash className="size-3 text-gold" /> Display Order Index
              </label>
              <Input
                type="number"
                min={1}
                max={999}
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value, 10) || 1)}
                disabled={isSaving}
                className="w-full bg-black/60 border-stone-700 text-xs text-stone-200 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ImageIcon className="size-3 text-gold" /> Alt Text (Screen readers & SEO)
            </label>
            <Input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              disabled={isSaving}
              required
              placeholder="e.g. Royal couple wedding mandap decor setup at Jagmandir Palace"
              className="w-full bg-black/60 border-stone-700 text-xs text-stone-200 font-sans"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="size-3 text-gold" /> Image Caption / Story Details
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={isSaving}
              rows={2}
              placeholder="Enter a descriptive caption highlighting the venue, floral accents, or royal theme..."
              className="w-full bg-black/60 border-stone-700 text-xs text-stone-200 font-sans resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Tag className="size-3 text-gold" /> Tags (Comma separated)
            </label>
            <Input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              disabled={isSaving}
              placeholder="e.g. Mandap, Udaipur, Luxury, Gold Theme, Reception"
              className="w-full bg-black/60 border-stone-700 text-xs text-stone-200 font-sans"
            />
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-3 bg-stone-900/40 border border-stone-800 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Eye className="size-4 text-gold" />
              <div>
                <p className="font-serif text-xs text-stone-200">Public Gallery Visibility</p>
                <p className="font-sans text-[11px] text-stone-400">
                  {visibility ? "Image will appear publicly once published." : "Hidden from public website grid."}
                </p>
              </div>
            </div>
            <Switch checked={visibility} onCheckedChange={setVisibility} disabled={isSaving} />
          </div>

          <DialogFooter className="pt-4 border-t border-stone-800/80 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs font-sans border-stone-700 bg-stone-900 text-stone-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSaving}
              className="gap-2 text-xs font-sans bg-gold text-nizami-dark hover:bg-gold-light font-semibold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>Save Gallery Metadata</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

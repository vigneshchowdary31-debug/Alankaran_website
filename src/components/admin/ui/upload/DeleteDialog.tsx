import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLoader } from "@/components/admin/ui/Loaders";

interface DeleteDialogProps {
  isOpen: boolean;
  assetName: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable DeleteDialog confirmation modal.
 * Prevents accidental removal of Cloudinary CDN image assets.
 */
export function DeleteDialog({
  isOpen,
  assetName,
  isDeleting = false,
  onConfirm,
  onCancel,
}: DeleteDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-nizami-dark/85 backdrop-blur-sm p-4 select-none animate-fade-in">
      <div className="max-w-md w-full bg-black/90 border border-red-800/60 rounded-2xl p-6 shadow-2xl relative">
        <div className="size-12 rounded-2xl bg-red-950/60 border border-red-800 flex items-center justify-center text-red-400 mb-4">
          <AlertTriangle className="size-6" />
        </div>

        <h3 className="font-serif text-xl text-stone-100 font-normal mb-2">
          Confirm Image Removal
        </h3>

        <p className="font-sans text-xs text-stone-400 leading-relaxed mb-6">
          Are you sure you want to delete <strong className="text-stone-200">{assetName}</strong> from storage? This action will remove the asset preview from the current CMS slot.
        </p>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800/80">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            className="h-9 px-4 text-xs font-sans bg-stone-900 border-stone-800 text-stone-300 hover:text-white"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-9 px-4 text-xs font-sans bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            {isDeleting ? (
              <ButtonLoader text="Removing..." />
            ) : (
              <>
                <Trash2 className="size-3.5" />
                <span>Delete Asset</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

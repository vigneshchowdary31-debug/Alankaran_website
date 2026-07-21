import React, { useRef, useState } from "react";
import { UploadCloud, FileImage, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_CONFIG } from "@/constants/app";

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  error?: string | null;
  className?: string;
  accept?: string;
}

/**
 * Accessible Drag & Drop and Click-to-Upload Dropzone component.
 * Communicates selected files to parent ImageUpload controller.
 */
export function UploadDropzone({
  onFileSelect,
  disabled = false,
  error,
  className,
  accept = "image/jpeg,image/png,image/webp,image/svg+xml",
}: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileSelect(file);
      // Reset input value so re-selecting same file triggers change event
      e.target.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Drag and drop or click to select an image for upload"
      aria-disabled={disabled}
      onClick={() => !disabled && fileInputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
        isDragging
          ? "border-gold bg-gold/10 scale-[1.01] shadow-lg shadow-gold/10"
          : disabled
          ? "border-stone-800 bg-stone-950/40 cursor-not-allowed opacity-60"
          : error
          ? "border-red-800/80 bg-red-950/20 hover:border-red-700"
          : "border-stone-800 bg-black/30 hover:border-gold/40 hover:bg-stone-900/30",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      <div
        className={cn(
          "size-14 rounded-2xl flex items-center justify-center mb-4 transition-colors shadow-inner",
          isDragging
            ? "bg-gold/20 text-gold border border-gold/50"
            : error
            ? "bg-red-950/60 text-red-400 border border-red-800/60"
            : "bg-stone-900 border border-stone-800 text-stone-400 group-hover:text-gold"
        )}
      >
        {error ? <AlertCircle className="size-6" /> : <UploadCloud className="size-6" />}
      </div>

      <p className="font-serif text-sm text-white/90 text-center font-normal mb-1">
        {isDragging ? (
          <span className="text-gold font-semibold">Drop your image here</span>
        ) : (
          <>
            <span className="text-gold font-medium underline underline-offset-4">Click to upload</span> or drag and drop
          </>
        )}
      </p>

      <p className="font-sans text-xs text-white/55 text-center font-light mt-1">
        JPG, PNG, WEBP, or SVG · up to {APP_CONFIG.MAX_UPLOAD_SIZE_MB} MB
      </p>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-white/45 bg-stone-900/60 border border-stone-800 px-3 py-1 rounded-full">
        <FileImage className="size-3 text-gold/80" />
        <span>Optimized automatically</span>
      </div>
    </div>
  );
}

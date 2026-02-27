import React, { useEffect, useCallback } from "react";
import { X, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  filename?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, filename, onClose }: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = src;
    a.download = filename || "image";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-150" />

      {/* Controls top-right */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white px-3 py-2 text-sm font-medium transition-colors backdrop-blur-sm"
          aria-label="Download image"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
        <button
          onClick={onClose}
          className="rounded-lg bg-white/10 hover:bg-white/20 text-white p-2 transition-colors backdrop-blur-sm"
          aria-label="Close preview"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      <div
        className="relative z-[1] max-w-[90vw] max-h-[85vh] animate-in zoom-in-95 fade-in-0 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt || filename || "Preview"}
          className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
          draggable={false}
        />
        {filename && (
          <p className="text-center text-white/60 text-xs mt-2 truncate max-w-[90vw]">
            {filename}
          </p>
        )}
      </div>
    </div>
  );
}

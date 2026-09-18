import React, { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  filename?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, filename, onClose }: ImageLightboxProps) {
  const [actualSize, setActualSize] = useState(false);
  useEffect(() => setActualSize(false), [src]);
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

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center gap-4 px-4 pb-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-150" />

      <div className="relative self-end shrink-0 z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setActualSize(value => !value)}
          aria-pressed={actualSize}
          className="min-h-11 rounded-lg bg-white/10 hover:bg-white/20 text-white px-3 py-2 text-sm font-medium"
        >
          {actualSize ? "Fit to screen" : "Actual size"}
        </button>
        <button
          onClick={handleDownload}
          className="min-h-11 flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white px-3 py-2 text-sm font-medium transition-colors backdrop-blur-sm"
          aria-label="Download image"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
        <button
          onClick={onClose}
          className="min-h-11 min-w-11 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white p-2 transition-colors backdrop-blur-sm"
          aria-label="Close preview"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative z-[1] flex-1 min-h-0 w-full flex items-center justify-center">
      <div
        className={cn("relative z-[1] max-w-[90vw] max-h-[calc(100dvh-180px)]", actualSize ? "overflow-auto" : "animate-in zoom-in-95 fade-in-0 duration-150")}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt || filename || "Preview"}
          className={cn("object-contain rounded-xl shadow-2xl", actualSize ? "max-w-none max-h-none" : "max-w-full max-h-[calc(100dvh-180px)]")}
          draggable={false}
        />
        {filename && (
          <p className="text-center text-white/60 text-xs mt-2 truncate max-w-[90vw]">
            {filename}
          </p>
        )}
      </div>
      </div>
    </div>,
    document.body
  );
}

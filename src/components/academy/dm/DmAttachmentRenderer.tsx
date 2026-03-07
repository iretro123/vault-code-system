import { useState } from "react";
import { FileText, Download } from "lucide-react";
import { ImageLightbox } from "../community/ImageLightbox";

export interface DmAttachment {
  type: "image" | "file";
  url: string;
  filename: string;
  size: number;
  mime: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DmAttachmentRenderer({ attachments }: { attachments: DmAttachment[] }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className="space-y-1.5 mt-1">
        {attachments.map((att, i) => {
          if (att.type === "image") {
            return (
              <button
                key={i}
                onClick={() => setLightboxUrl(att.url)}
                className="block rounded-lg overflow-hidden max-w-[220px] border border-white/[0.08] hover:border-white/[0.16] transition-colors"
              >
                <img
                  src={att.url}
                  alt={att.filename}
                  className="w-full h-auto max-h-[180px] object-cover"
                  loading="lazy"
                />
              </button>
            );
          }
          return (
            <a
              key={i}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12] transition-colors max-w-[220px]"
            >
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{att.filename}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(att.size)}</p>
              </div>
              <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </a>
          );
        })}
      </div>
      {lightboxUrl && (
        <ImageLightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </>
  );
}

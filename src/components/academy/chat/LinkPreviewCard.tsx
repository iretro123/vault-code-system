import { useLinkPreview } from "@/hooks/useLinkPreview";
import { ExternalLink } from "lucide-react";

interface LinkPreviewCardProps {
  url: string;
}

export function LinkPreviewCard({ url }: LinkPreviewCardProps) {
  const { data, loading } = useLinkPreview(url);

  if (loading) {
    return (
      <div className="mt-1.5 max-w-[400px] rounded-lg border border-white/[0.08] bg-white/[0.03] overflow-hidden animate-pulse">
        <div className="flex">
          <div className="w-1 self-stretch bg-primary/40 shrink-0" />
          <div className="p-3 space-y-2 flex-1">
            <div className="h-3 w-24 rounded bg-white/[0.08]" />
            <div className="h-4 w-48 rounded bg-white/[0.08]" />
            <div className="h-3 w-full rounded bg-white/[0.06]" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 max-w-[400px] rounded-lg border border-white/[0.08] bg-white/[0.03] overflow-hidden hover:bg-white/[0.05] hover:border-white/[0.12] transition-colors block group/preview"
    >
      <div className="flex">
        {/* Accent border */}
        <div className="w-1 self-stretch bg-primary/60 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="p-3 space-y-1">
            {/* Site name */}
            {data.site_name && (
              <div className="flex items-center gap-1.5">
                {data.favicon && (
                  <img
                    src={data.favicon}
                    alt=""
                    className="h-3.5 w-3.5 rounded-sm"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <span className="text-[11px] text-primary font-medium truncate">
                  {data.site_name}
                </span>
              </div>
            )}

            {/* Title */}
            {data.title && (
              <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover/preview:underline">
                {data.title}
              </p>
            )}

            {/* Description */}
            {data.description && (
              <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                {data.description}
              </p>
            )}
          </div>

          {/* Image */}
          {data.image && (
            <div className="border-t border-white/[0.06]">
              <img
                src={data.image}
                alt=""
                className="w-full h-auto max-h-[200px] object-cover"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

import { useAcademyAnnouncements, type Announcement } from "@/hooks/useAcademyAnnouncements";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pin, Lock, Megaphone, ExternalLink } from "lucide-react";
import { formatDateTimeFull } from "@/lib/formatTime";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function CommunityAnnouncements() {
  const { announcements, loading } = useAcademyAnnouncements();
  const navigate = useNavigate();

  const pinned = announcements.filter((a) => a.is_pinned);
  const rest = announcements.filter((a) => !a.is_pinned);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-24 max-w-xs mx-auto">
        <Megaphone className="h-8 w-8 text-[hsl(220,10%,70%)] mx-auto mb-3" />
        <p className="text-sm text-[hsl(220,10%,40%)]">No announcements yet.</p>
        <p className="text-xs text-[hsl(220,10%,55%)] mt-1">Official updates from coaches and admins will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-[800px] mx-auto px-4 py-8 space-y-5">
        {/* Pinned section */}
        {pinned.length > 0 && (
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-[hsl(220,10%,50%)] uppercase tracking-[0.15em] flex items-center gap-1.5">
              <Pin className="h-3 w-3" /> Pinned
            </p>
            {pinned.map((a) => (
              <AnnouncementItem key={a.id} announcement={a} onNavigate={navigate} />
            ))}
          </div>
        )}

        {/* Rest */}
        <div className="space-y-4">
          {rest.map((a) => (
            <AnnouncementItem key={a.id} announcement={a} onNavigate={navigate} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AnnouncementItem({ announcement: a, onNavigate }: { announcement: Announcement; onNavigate: (path: string) => void }) {
  return (
    <div className={cn(
      "rounded-[20px] border bg-white/[0.04] backdrop-blur-md p-6 space-y-4 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-white/[0.12]",
      a.is_pinned ? "border-amber-500/15" : "border-white/[0.07]"
    )}>
      <div className="flex items-start gap-4">
        <div className="mt-0.5 shrink-0">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Megaphone className="h-4.5 w-4.5 text-primary" />
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] gap-1 h-5 border-primary/30 text-primary font-bold">
              Official
            </Badge>
            <h3 className="text-base font-semibold text-foreground tracking-[-0.01em]">{a.title}</h3>
            {a.is_pinned && (
              <Badge variant="outline" className="text-[10px] gap-1 h-5 border-amber-500/30 text-amber-400">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </Badge>
            )}
            {a.replies_locked && (
              <Badge variant="outline" className="text-[10px] gap-1 h-5">
                <Lock className="h-2.5 w-2.5" /> Locked
              </Badge>
            )}
          </div>

          {a.body && (
            <p className="text-[15px] text-white/65 leading-[1.7] whitespace-pre-wrap">{a.body}</p>
          )}

          {a.image_url && (
            <img
              src={a.image_url}
              alt=""
              className="rounded-2xl max-w-full max-h-[300px] object-cover border border-white/[0.06]"
              loading="lazy"
            />
          )}

          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] text-white/20">{formatDateTimeFull(a.created_at)}</span>
            {a.link && (
              <button
                onClick={() => onNavigate(a.link!)}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-2.5 w-2.5" /> View more
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

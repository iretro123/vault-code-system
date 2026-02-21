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
        <Megaphone className="h-8 w-8 text-white/10 mx-auto mb-3" />
        <p className="text-sm text-white/40">No announcements yet.</p>
        <p className="text-xs text-white/20 mt-1">Official updates from coaches and admins will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-[800px] mx-auto px-4 py-6 space-y-4">
        {/* Pinned section */}
        {pinned.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider flex items-center gap-1.5">
              <Pin className="h-3 w-3" /> Pinned
            </p>
            {pinned.map((a) => (
              <AnnouncementItem key={a.id} announcement={a} onNavigate={navigate} />
            ))}
          </div>
        )}

        {/* Rest */}
        <div className="space-y-3">
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
      "rounded-2xl border bg-white/[0.03] backdrop-blur-sm p-5 space-y-3 transition-colors",
      a.is_pinned ? "border-amber-500/15" : "border-white/[0.06]"
    )}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] gap-1 h-5 border-primary/30 text-primary">
              Official
            </Badge>
            <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
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
            <p className="text-[15px] text-white/70 leading-relaxed whitespace-pre-wrap">{a.body}</p>
          )}

          {a.image_url && (
            <img
              src={a.image_url}
              alt=""
              className="rounded-xl max-w-full max-h-[300px] object-cover"
              loading="lazy"
            />
          )}

          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] text-white/25">{formatDateTimeFull(a.created_at)}</span>
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

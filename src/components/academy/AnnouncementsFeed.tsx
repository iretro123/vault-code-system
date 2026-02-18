import { useAcademyAnnouncements, Announcement } from "@/hooks/useAcademyAnnouncements";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pin, Lock, Megaphone, ExternalLink } from "lucide-react";
import { formatDateTimeFull } from "@/lib/formatTime";
import { useNavigate } from "react-router-dom";

export function AnnouncementsFeed() {
  const { announcements, loading } = useAcademyAnnouncements();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-16">
        <Megaphone className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No announcements yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-[920px] w-full">
      {announcements.map((a) => (
        <AnnouncementCard key={a.id} announcement={a} onNavigate={navigate} />
      ))}
    </div>
  );
}

function AnnouncementCard({
  announcement: a,
  onNavigate,
}: {
  announcement: Announcement;
  onNavigate: (path: string) => void;
}) {
  return (
    <Card
      className={`p-4 space-y-2 transition-colors ${
        a.is_pinned
          ? "border-amber-500/20 bg-amber-500/[0.03]"
          : "hover:bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
            {a.is_pinned && (
              <Badge variant="outline" className="text-[10px] gap-1 h-5 border-amber-500/30 text-amber-400">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </Badge>
            )}
            {a.replies_locked && (
              <Badge variant="outline" className="text-[10px] gap-1 h-5">
                <Lock className="h-2.5 w-2.5" /> No Replies
              </Badge>
            )}
          </div>

          {a.body && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
          )}

          {a.image_url && (
            <img
              src={a.image_url}
              alt=""
              className="rounded-lg max-w-full max-h-[300px] object-cover mt-2"
              loading="lazy"
            />
          )}

          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] text-muted-foreground/60">
              {formatDateTimeFull(a.created_at)}
            </span>
            {a.link && (
              <button
                onClick={() => onNavigate(a.link!)}
                className="text-[10px] text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                View more
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Radio, Calendar, Bell, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatTimeInTZ, getUserTimezone } from "@/lib/userTime";
import { disableGuestMode, isGuestMode } from "@/lib/guestMode";

interface PublicLiveSession {
  id: string;
  title: string;
  description: string;
  session_date: string;
  session_type: string;
  duration_minutes: number;
}

/**
 * View-only guest preview. Renders public live-session info only — no chat,
 * no billing, no posting. Everything else is gated behind sign-in.
 */
export default function GuestPreview() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<PublicLiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const tz = getUserTimezone();

  useEffect(() => {
    if (!isGuestMode()) {
      navigate("/auth", { replace: true });
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("live_sessions_public" as any)
          .select("id,title,description,session_date,session_type,duration_minutes")
          .order("session_date", { ascending: true })
          .limit(8);
        setSessions(((data as unknown) as PublicLiveSession[]) || []);
      } catch {
        void 0;
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleExit = () => {
    disableGuestMode();
    window.dispatchEvent(new Event("guest-mode-changed"));
    navigate("/auth", { replace: true });
  };

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(59,130,246,0.10) 0%, transparent 70%),
          linear-gradient(180deg, hsl(212,25%,6%) 0%, hsl(212,25%,4%) 100%)
        `,
      }}
    >
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Sign in
          </button>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
            Guest preview
          </span>
        </header>

        {/* Title */}
        <div className="text-center pt-4">
          <h1 className="text-3xl font-black tracking-tight">
            <span className="text-foreground">VAULT</span>
            <span className="text-primary">OS</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            You're previewing the platform as a guest. Browse upcoming live sessions
            below. Full access requires an account.
          </p>
        </div>

        {/* Live sessions */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Upcoming Live Sessions
            </h2>
          </div>

          {loading ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Loading sessions…
            </Card>
          ) : sessions.length === 0 ? (
            <Card className="p-6 text-center">
              <Calendar className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No upcoming sessions scheduled right now. Check back soon.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const d = new Date(s.session_date);
                return (
                  <Card key={s.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {s.title}
                        </h3>
                        {s.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {s.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/80">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(d, "EEE, MMM d")}
                          </span>
                          <span>{formatTimeInTZ(d, tz)}</span>
                          {s.duration_minutes ? <span>{s.duration_minutes} min</span> : null}
                        </div>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider px-2 py-1">
                        <Bell className="h-3 w-3" />
                        Notify
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* View-only notice */}
        <Card className="p-5 border-primary/20 bg-primary/[0.04]">
          <div className="flex items-start gap-3">
            <div className="shrink-0 h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Guest access is view-only
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Chat, posting, journaling, and community participation are
                disabled. Create an account to join discussions and unlock
                everything.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button asChild className="w-full h-11">
              <Link to="/auth" onClick={handleExit}>Create an account</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

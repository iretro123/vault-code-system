import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useChatProfiles } from "@/hooks/useChatProfiles";
import { ChatAvatar } from "@/lib/chatAvatars";
import { AcademyRoleBadge } from "@/components/academy/AcademyRoleBadge";
import { Loader2, Crosshair } from "lucide-react";
import { formatDateTime } from "@/lib/formatTime";

interface SetupMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  body: string;
  attachments: any[];
  created_at: string;
}

const CACHE_KEY = "vault_daily_setups_cache";

export function CommunityDailySetups() {
  const [setups, setSetups] = useState<SetupMessage[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(() => {
    try { return !localStorage.getItem(CACHE_KEY); } catch { return true; }
  });
  const { ensureProfiles, getProfile } = useChatProfiles();

  const fetchSetups = useCallback(async () => {
    const { data } = await supabase
      .from("academy_messages")
      .select("*")
      .eq("room_slug", "daily-setups")
      .eq("is_deleted", false)
      .is("parent_message_id", null)
      .order("created_at", { ascending: false })
      .limit(50);

    const msgs = (data ?? []) as SetupMessage[];
    setSetups(msgs);
    setLoading(false);

    try { localStorage.setItem(CACHE_KEY, JSON.stringify(msgs)); } catch {}

    if (msgs.length > 0) {
      ensureProfiles([...new Set(msgs.map((m) => m.user_id))]);
    }
  }, [ensureProfiles]);

  useEffect(() => {
    fetchSetups();
  }, [fetchSetups]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("daily-setups-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "academy_messages", filter: "room_slug=eq.daily-setups" },
        () => { fetchSetups(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSetups]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (setups.length === 0) {
    return (
      <div className="text-center py-24 max-w-xs mx-auto">
        <Crosshair className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No daily setups posted yet.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Coaches will share daily market setups here each morning.</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-[800px] mx-auto px-4 py-8 space-y-5">
        {setups.map((setup) => {
          const profile = getProfile(setup.user_id);
          const attachments = (setup.attachments as any[]) ?? [];
          const imageAtts = attachments.filter((a: any) => a.type === "image");
          const fields = parseSetupFields(setup.body);

          return (
            <div
              key={setup.id}
              className="rounded-[20px] border border-[hsl(220,10%,82%)] bg-white p-6 space-y-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-[hsl(220,10%,75%)] transition-colors"
            >
              {/* Author row */}
              <div className="flex items-center gap-3">
                {profile ? (
                  <ChatAvatar avatarUrl={profile.avatar_url} userName={setup.user_name} size="h-10 w-10" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[15px] font-semibold text-foreground truncate">{setup.user_name}</span>
                    <AcademyRoleBadge roleName={profile?.academy_role_name} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{formatDateTime(setup.created_at)}</span>
                </div>
              </div>

              {/* Structured fields or plain body */}
              {fields.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {fields.map((f, i) => (
                    <div key={i} className={f.label.toLowerCase() === "notes" ? "col-span-2" : ""}>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{f.label}</span>
                      <p className="text-sm text-foreground mt-0.5">{f.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[15px] text-muted-foreground leading-[1.65] whitespace-pre-line">{setup.body}</p>
              )}

              {/* Chart images */}
              {imageAtts.length > 0 && (
                <div className="space-y-3">
                  {imageAtts.map((img: any, i: number) => (
                    <img
                      key={i}
                      src={img.url}
                      alt="Chart screenshot"
                      className="rounded-2xl max-w-full max-h-[400px] object-cover border border-[hsl(220,10%,85%)]"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseSetupFields(body: string): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = [];
  const lines = body.split("\n");
  for (const line of lines) {
    const match = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if (match) fields.push({ label: match[1], value: match[2] });
  }
  return fields;
}

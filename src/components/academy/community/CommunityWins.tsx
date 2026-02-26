import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessageReactions, type ReactionEmoji } from "@/hooks/useMessageReactions";
import { useChatProfiles } from "@/hooks/useChatProfiles";
import { ChatAvatar } from "@/lib/chatAvatars";
import { AcademyRoleBadge } from "@/components/academy/AcademyRoleBadge";
import { Loader2, Trophy, Flame } from "lucide-react";
import { formatDateTime } from "@/lib/formatTime";
import { cn } from "@/lib/utils";

interface WinMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  body: string;
  attachments: any[];
  created_at: string;
}

export function CommunityWins() {
  const { user } = useAuth();
  const [wins, setWins] = useState<WinMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { trackMessages, getReactions, toggleReaction } = useMessageReactions("wins-proof", user?.id);
  const { ensureProfiles, getProfile } = useChatProfiles();

  const fetchWins = useCallback(async () => {
    const { data } = await supabase
      .from("academy_messages")
      .select("*")
      .eq("room_slug", "wins-proof")
      .eq("is_deleted", false)
      .is("parent_message_id", null)
      .order("created_at", { ascending: false })
      .limit(50);

    const msgs = (data ?? []) as WinMessage[];
    setWins(msgs);
    setLoading(false);

    if (msgs.length > 0) {
      trackMessages(msgs.map((m) => m.id));
      ensureProfiles([...new Set(msgs.map((m) => m.user_id))]);
    }
  }, [trackMessages, ensureProfiles]);

  useEffect(() => {
    fetchWins();
  }, [fetchWins]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
      </div>
    );
  }

  if (wins.length === 0) {
    return (
      <div className="text-center py-24 max-w-xs mx-auto">
        <Trophy className="h-8 w-8 text-[hsl(220,10%,70%)] mx-auto mb-3" />
        <p className="text-sm text-[hsl(220,10%,40%)]">No wins posted yet.</p>
        <p className="text-xs text-[hsl(220,10%,55%)] mt-1">Post proof of wins with screenshots and trade summaries.</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-[900px] mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {wins.map((win) => {
            const profile = getProfile(win.user_id);
            const reactions = getReactions(win.id);
            const fireReaction = reactions.find((r) => r.emoji === "🔥");
            const attachments = (win.attachments as any[]) ?? [];
            const imageAtt = attachments.find((a: any) => a.type === "image");

            const fields = parseWinFields(win.body);

            return (
              <div
                key={win.id}
                className="rounded-[20px] border border-[hsl(220,10%,82%)] bg-white overflow-hidden transition-all hover:border-[hsl(220,10%,75%)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              >
                {/* Image */}
                {imageAtt && (
                  <div className="aspect-video bg-[hsl(220,10%,95%)] overflow-hidden">
                    <img
                      src={(imageAtt as any).url}
                      alt="Trade screenshot"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="p-5 space-y-4">
                  {/* Author */}
                  <div className="flex items-center gap-3">
                    {profile ? (
                      <ChatAvatar avatarUrl={profile.avatar_url} userName={win.user_name} size="h-10 w-10" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[hsl(220,10%,90%)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[15px] font-semibold text-[hsl(220,15%,15%)] truncate">{win.user_name}</span>
                        <AcademyRoleBadge roleName={profile?.academy_role_name} />
                      </div>
                      <span className="text-[11px] text-[hsl(220,10%,55%)]">{formatDateTime(win.created_at)}</span>
                    </div>
                  </div>

                  {/* Fields or body */}
                  {fields.length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {fields.map((f, i) => (
                        <div key={i} className={f.label.toLowerCase() === "lesson learned" ? "col-span-2" : ""}>
                          <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">{f.label}</span>
                          <p className="text-sm text-white/80 mt-0.5">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[15px] text-white/65 leading-[1.65] whitespace-pre-line line-clamp-4">{win.body}</p>
                  )}

                  {/* Fire reaction */}
                  <div className="flex items-center pt-1">
                    <button
                      onClick={() => toggleReaction(win.id, "🔥" as ReactionEmoji)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all",
                        fireReaction?.reacted
                          ? "bg-orange-500/15 border-orange-500/30 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.1)]"
                          : "bg-white/[0.03] border-white/[0.06] text-white/30 hover:text-white/50 hover:bg-white/[0.06]"
                      )}
                    >
                      <Flame className="h-4 w-4" />
                      {fireReaction?.count ?? 0}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function parseWinFields(body: string): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = [];
  const lines = body.split("\n");
  for (const line of lines) {
    const match = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if (match) fields.push({ label: match[1], value: match[2] });
  }
  return fields;
}

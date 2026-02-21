import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, SendHorizontal, Loader2, MessageSquare } from "lucide-react";
import { ChatAvatar } from "@/lib/chatAvatars";
import { useChatProfiles } from "@/hooks/useChatProfiles";
import { AcademyRoleBadge } from "@/components/academy/AcademyRoleBadge";
import { formatTime, formatDateTime } from "@/lib/formatTime";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ThreadMessage {
  id: string;
  room_slug: string;
  user_id: string;
  user_name: string;
  user_role: string;
  body: string;
  created_at: string;
  parent_message_id: string | null;
  is_deleted: boolean;
}

interface ThreadDrawerProps {
  parentMessage: {
    id: string;
    room_slug: string;
    user_id: string;
    user_name: string;
    body: string;
    created_at: string;
    reply_count: number;
  };
  onClose: () => void;
}

export function ThreadDrawer({ parentMessage, onClose }: ThreadDrawerProps) {
  const { user, profile, userRole } = useAuth();
  const { ensureProfiles, getProfile } = useChatProfiles();
  const [replies, setReplies] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch thread replies
  const fetchReplies = useCallback(async () => {
    const { data } = await supabase
      .from("academy_messages")
      .select("*")
      .eq("parent_message_id", parentMessage.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      setReplies(data as ThreadMessage[]);
      const userIds = [...new Set(data.map((m: any) => m.user_id))];
      ensureProfiles(userIds);
    }
    setLoading(false);
  }, [parentMessage.id, ensureProfiles]);

  useEffect(() => { fetchReplies(); }, [fetchReplies]);

  // Realtime for thread
  useEffect(() => {
    const channel = supabase
      .channel(`thread-${parentMessage.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "academy_messages",
        filter: `parent_message_id=eq.${parentMessage.id}`,
      }, (payload) => {
        const msg = payload.new as ThreadMessage;
        setReplies((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        ensureProfiles([msg.user_id]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [parentMessage.id, ensureProfiles]);

  // Scroll to bottom on new replies
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  }, [draft]);

  const sendReply = async () => {
    if (!user || !draft.trim() || sending) return;
    setSending(true);

    const userName =
      (profile as any)?.display_name ||
      (profile as any)?.username ||
      user.email?.split("@")[0] ||
      "Anonymous";

    const roleStr = userRole?.role === "operator" ? "admin" : "beginner";

    const { error } = await supabase.from("academy_messages").insert({
      room_slug: parentMessage.room_slug,
      user_id: user.id,
      user_name: userName,
      body: draft.trim(),
      user_role: roleStr,
      parent_message_id: parentMessage.id,
    } as any);

    if (error) {
      toast.error("Failed to send reply");
    } else {
      setDraft("");
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
    if (e.key === "Escape") onClose();
  };

  const parentProfile = getProfile(parentMessage.user_id);

  return (
    <div className="flex flex-col h-full border-l border-white/[0.06] bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Thread</h2>
          <span className="text-xs text-white/30">{parentMessage.reply_count} {parentMessage.reply_count === 1 ? "reply" : "replies"}</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Parent message */}
      <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 shrink-0">
            {parentProfile ? (
              <ChatAvatar avatarUrl={parentProfile.avatar_url} userName={parentMessage.user_name} />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[13px] font-semibold text-foreground">{parentMessage.user_name}</span>
              {parentProfile && <AcademyRoleBadge roleName={parentProfile.academy_role_name} />}
              <span className="text-[11px] text-white/30">{formatDateTime(parentMessage.created_at)}</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{parentMessage.body}</p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 text-white/30 animate-spin" />
          </div>
        ) : replies.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-8">No replies yet. Start the conversation.</p>
        ) : (
          replies.filter((r) => !r.is_deleted).map((reply) => {
            const rp = getProfile(reply.user_id);
            return (
              <div key={reply.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 shrink-0">
                  {rp ? (
                    <ChatAvatar avatarUrl={rp.avatar_url} userName={reply.user_name} />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/[0.06]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12px] font-semibold text-foreground">{reply.user_name}</span>
                    <span className="text-[10px] text-white/25">{formatTime(reply.created_at)}</span>
                  </div>
                  <p className="text-[13px] text-white/75 leading-relaxed whitespace-pre-line">{reply.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
        <div className="flex items-end gap-2 rounded-xl bg-white/[0.06] border border-white/[0.10] px-3 py-2 focus-within:border-primary/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply in thread…"
            maxLength={1000}
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-white/90 placeholder:text-white/35 resize-none outline-none min-h-[22px] max-h-[100px] leading-relaxed py-0.5 caret-primary"
          />
          <button
            onClick={sendReply}
            disabled={!draft.trim() || sending}
            className={cn(
              "shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all",
              draft.trim() && !sending
                ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-95"
                : "text-white/25 cursor-not-allowed"
            )}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

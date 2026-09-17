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
import { sanitizeText } from "@/lib/safeText";
import { useCommunityDraft } from "@/hooks/useCommunityDraft";
import './thread-drawer.css';

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
  const [draft, setDraft] = useCommunityDraft(user?.id, `thread:${parentMessage.id}`);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch thread replies
  const fetchReplies = useCallback(async () => {
    setLoadError(false);
    const { data, error } = await supabase
      .from("academy_messages")
      .select("*")
      .eq("parent_message_id", parentMessage.id)
      .order("created_at", { ascending: true })
      .limit(100);

    setLoadError(Boolean(error));
    if (data) {
      setReplies(data as ThreadMessage[]);
      const userIds = [...new Set(data.map((m) => m.user_id))];
      ensureProfiles([parentMessage.user_id, ...userIds]);
    }
    setLoading(false);
  }, [parentMessage.id, parentMessage.user_id, ensureProfiles]);

  useEffect(() => { setReplies([]); setLoading(true); void fetchReplies(); }, [fetchReplies]);

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
  const threadContainerRef = useRef<HTMLDivElement>(null);
  const followingLatest = useRef(true);

  useEffect(() => {
    if (followingLatest.current) {
      threadContainerRef.current?.scrollTo({ top: threadContainerRef.current.scrollHeight, behavior: "auto" });
    }
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
      profile?.display_name ||
      profile?.username ||
      user.email?.split("@")[0] ||
      "Anonymous";

    const roleStr = userRole?.role === "operator" ? "admin" : "beginner";

    try {
    const { error } = await supabase.from("academy_messages").insert({
      room_slug: parentMessage.room_slug,
      user_id: user.id,
      user_name: userName,
      body: sanitizeText(draft.trim()),
      user_role: roleStr,
      parent_message_id: parentMessage.id,
    });

    if (error) {
      console.error("[ThreadDrawer] Reply insert failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        roomSlug: parentMessage.room_slug,
        parentMessageId: parentMessage.id,
      });
      toast.error(
        error.code === "42501"
          ? "Your session could not post this reply. Sign out, sign back in, and try again."
          : "Reply failed to send. Your text was kept so you can try again."
      );
    } else {
      setDraft("");
      followingLatest.current = true;
      threadContainerRef.current?.scrollTo({ top: threadContainerRef.current.scrollHeight });
    }
    } catch {
      toast.error("Reply failed to send. Your text was kept so you can try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
    if (e.key === "Escape") onClose();
  };

  const parentProfile = getProfile(parentMessage.user_id);
  const visibleReplies = replies.filter(reply => !reply.is_deleted);

  return (
    <div className="community-thread flex flex-col min-h-0 h-full border-l border-white/[0.06] bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Replies</h2>
          <span className="thread-reply-count text-xs text-white/30">{Math.max(parentMessage.reply_count, replies.filter(r => !r.is_deleted).length)} replies</span>
        </div>
        <button aria-label="Close thread" onClick={onClose} className="h-11 w-11 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Parent message */}
      <div className="thread-original px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="thread-eyebrow">Replying to</span>
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 shrink-0">
            <ChatAvatar avatarUrl={parentProfile?.avatar_url} userName={parentMessage.user_name} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[13px] font-semibold text-foreground">{parentMessage.user_name}</span>
              {parentProfile && <AcademyRoleBadge roleName={parentProfile.academy_role_name} />}
              <span className="text-[11px] text-white/30">{formatDateTime(parentMessage.created_at)}</span>
            </div>
            <details className="thread-original-details">
              <summary><span>{parentMessage.body || 'Attachment'}</span></summary>
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{parentMessage.body || 'Attachment'}</p>
            </details>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div ref={threadContainerRef} onScroll={(event) => {
        const el = event.currentTarget;
        followingLatest.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      }} className="thread-replies vault-chat-scroll flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 text-white/30 animate-spin" />
          </div>
        ) : loadError ? (
          <div role="status" className="text-sm text-center py-8">Replies couldn’t load. <button className="underline p-3" onClick={() => void fetchReplies()}>Try again</button></div>
        ) : visibleReplies.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-8">No replies yet. Start the conversation.</p>
        ) : (
          visibleReplies.map((reply, index) => {
            const rp = getProfile(reply.user_id);
            const previous = visibleReplies[index - 1];
            const grouped = previous?.user_id === reply.user_id && Date.parse(reply.created_at)-Date.parse(previous.created_at)>=0 && Date.parse(reply.created_at)-Date.parse(previous.created_at)<300000;
            return (
              <div key={reply.id} className={cn('thread-reply-row flex items-start gap-2.5',grouped && 'is-grouped')}>
                <div className="w-8 h-8 shrink-0">
                  {!grouped && <ChatAvatar avatarUrl={rp?.avatar_url} userName={reply.user_name} />}
                </div>
                <div className="flex-1 min-w-0">
                  {!grouped && <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12px] font-semibold text-foreground">{reply.user_name}</span>
                    <span className="text-[10px] text-white/25">{formatTime(reply.created_at)}</span>
                  </div>}
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
            aria-label="Reply in thread"
            disabled={sending}
            maxLength={1000}
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-white/90 placeholder:text-white/35 resize-none outline-none min-h-[22px] max-h-[100px] leading-relaxed py-0.5 caret-primary"
          />
          <button
            aria-label={sending ? "Sending reply" : "Send reply"}
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

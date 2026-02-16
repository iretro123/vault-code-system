import { useState, useRef, useEffect, useCallback } from "react";
import { useRoomMessages } from "@/hooks/useRoomMessages";
import { useAuth } from "@/hooks/useAuth";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TradeRecapForm } from "./chat/TradeRecapForm";

interface RoomChatProps {
  roomSlug: string;
  canPost: boolean;
}

/* ── helpers ── */

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  admin:        { label: "Admin",        cls: "bg-red-500/20 text-red-400 border-red-500/30" },
  coach:        { label: "Coach",        cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  advanced:     { label: "Advanced",     cls: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  veteran:      { label: "Advanced",     cls: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  intermediate: { label: "Intermediate", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  active:       { label: "Intermediate", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  beginner:     { label: "Beginner",     cls: "bg-white/10 text-white/50 border-white/10" },
  newbie:       { label: "Beginner",     cls: "bg-white/10 text-white/50 border-white/10" },
};

function RoleBadge({ role }: { role?: string }) {
  const cfg = ROLE_CONFIG[role?.toLowerCase() ?? ""];
  if (!cfg) return null;
  return (
    <span className={cn("text-[10px] leading-none px-1.5 py-0.5 rounded font-medium border", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

/* ── message body renderers ── */

function isRecapPost(body: string) {
  return body.startsWith("**📋 Trade Post**") || body.startsWith("**📋 Trade Recap**");
}

function renderRecapCard(body: string) {
  const lines = body.split("\n").filter(Boolean);
  const fields: { label: string; value: string }[] = [];
  for (const line of lines.slice(1)) {
    const match = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if (match) fields.push({ label: match[1], value: match[2] });
  }

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 space-y-1.5 mt-1">
      <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">📋 Trade Post</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {fields.map((f, i) => (
          <div key={i} className={f.label === "Lesson" ? "col-span-2" : ""}>
            <span className="text-[10px] text-white/40 uppercase tracking-wider">{f.label}</span>
            <p className="text-sm text-white/90">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderPlainBody(body: string) {
  const parts = body.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <span key={i} className="font-semibold text-white">{part.slice(2, -2)}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

/* ── grouping logic ── */

function shouldShowHeader(
  msg: { user_id: string; created_at: string },
  prev?: { user_id: string; created_at: string }
) {
  if (!prev) return true;
  if (prev.user_id !== msg.user_id) return true;
  return new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 3 * 60 * 1000;
}

/* ── avatar palette ── */
const AVATAR_COLORS = [
  "bg-blue-600/30 text-blue-300",
  "bg-emerald-600/30 text-emerald-300",
  "bg-amber-600/30 text-amber-300",
  "bg-purple-600/30 text-purple-300",
  "bg-rose-600/30 text-rose-300",
  "bg-cyan-600/30 text-cyan-300",
];

function avatarColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ── main component ── */

export function RoomChat({ roomSlug, canPost }: RoomChatProps) {
  const { messages, loading, hasMore, loadMore, sendMessage, sending, error } =
    useRoomMessages(roomSlug);
  const { user, profile } = useAuth();

  const displayName =
    (profile as any)?.display_name ||
    (profile as any)?.username ||
    user?.email?.split("@")[0] ||
    "Anonymous";

  const { typingText, broadcastTyping } = useTypingIndicator(roomSlug, user?.id, displayName);

  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const isTradeRecaps = roomSlug === "trade-recaps";

  const handleDraftChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft(e.target.value);
      broadcastTyping();
    },
    [broadcastTyping]
  );
  useEffect(() => {
    if (shouldAutoScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [loading]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    shouldAutoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const handleSend = async (text?: string) => {
    const body = text ?? draft;
    if (!body.trim() || sending) return;
    if (!text) setDraft("");
    shouldAutoScroll.current = true;
    await sendMessage(body);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] md:h-[calc(100vh-12rem)] max-w-[920px] w-full">
      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {hasMore && (
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="sm" onClick={loadMore} className="gap-1 text-xs text-white/50 hover:text-white">
              <ChevronUp className="h-3 w-3" />
              Load older
            </Button>
          </div>
        )}

        {messages.length === 0 && (
          <p className="text-sm text-white/40 text-center py-16">
            No messages yet. Be the first to say something.
          </p>
        )}

        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showHdr = shouldShowHeader(msg, prev);
          const isRecap = isRecapPost(msg.body);

          return (
            <div
              key={msg.id}
              className={cn(
                "group flex gap-3 px-3 py-0.5 hover:bg-white/[0.02] transition-colors",
                showHdr && "mt-3 pt-1.5"
              )}
            >
              {/* Avatar column */}
              <div className="w-8 shrink-0">
                {showHdr ? (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn("text-xs font-semibold", avatarColor(msg.user_id))}>
                      {getInitials(msg.user_name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  /* Hover timestamp for grouped messages */
                  <span className="hidden group-hover:flex items-center justify-center h-5 text-[10px] text-white/30 select-none">
                    {format(new Date(msg.created_at), "HH:mm")}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {showHdr && (
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-semibold text-white">
                      {msg.user_name}
                    </span>
                    <RoleBadge role={(msg as any).user_role} />
                    <span className="text-[11px] text-white/30">
                      {format(new Date(msg.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                )}

                {isRecap ? (
                  renderRecapCard(msg.body)
                ) : (
                  <div className="inline-block max-w-[85%]">
                    <div className="bg-white/[0.04] rounded-lg rounded-tl-sm px-3 py-1.5">
                      <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line">
                        {renderPlainBody(msg.body)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingText && (
        <div className="px-3 py-1 flex items-center gap-1.5">
          <span className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
          </span>
          <span className="text-xs text-white/40">{typingText}…</span>
        </div>
      )}

      {/* Composer */}
      {canPost ? (
        <div className="pt-3 border-t border-white/[0.08] mt-2 px-3">
          {error && <p className="text-xs text-destructive mb-2">{error}</p>}
          {isTradeRecaps ? (
            <TradeRecapForm onSubmit={handleSend} sending={sending} />
          ) : (
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={handleDraftChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                className="flex-1 bg-black/25 border-white/[0.1] text-white placeholder:text-white/30 focus-visible:ring-white/20"
                maxLength={1000}
                disabled={sending}
              />
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={!draft.trim() || sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="pt-3 border-t border-white/[0.08] mt-2">
          <p className="text-xs text-white/50 text-center">
            This room is read-only for students.
          </p>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from "react";
import { useRoomMessages, type Attachment } from "@/hooks/useRoomMessages";
import { useAuth } from "@/hooks/useAuth";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMessageReactions, ALLOWED_EMOJIS, type ReactionEmoji } from "@/hooks/useMessageReactions";
import { useChatProfiles } from "@/hooks/useChatProfiles";
import { ChatAvatar } from "@/lib/chatAvatars";
import { Button } from "@/components/ui/button";
import { Loader2, Send, ChevronUp, Paperclip, Megaphone, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TradeRecapForm } from "./chat/TradeRecapForm";
import { EmojiPicker } from "./chat/EmojiPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RoomChatProps {
  roomSlug: string;
  canPost: boolean;
  isAnnouncements?: boolean;
}

/* ── helpers ── */

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  admin:        { label: "Admin",        cls: "bg-red-500/20 text-red-400 border-red-500/30" },
  coach:        { label: "Coach",        cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  advanced:     { label: "Advanced",     cls: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  professional: { label: "Advanced",     cls: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
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
  // Handle image markdown: ![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  if (imageRegex.test(body)) {
    const parts = body.split(/(!?\[[^\]]*\]\([^)]+\))/g);
    return parts.map((part, i) => {
      const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        return <img key={i} src={imgMatch[2]} alt={imgMatch[1]} className="rounded-lg max-w-[300px] max-h-[240px] mt-1 object-cover" />;
      }
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline">{linkMatch[1]}</a>;
      }
      if (!part) return null;
      return <span key={i}>{part}</span>;
    });
  }

  // Bold markdown
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

/* ── role label from profile data ── */
function getRoleBadgeKey(userRole: string, profileRoleLevel?: string): string {
  // Prefer profile role_level if available, fall back to message user_role
  return profileRoleLevel || userRole || "";
}

/* ── main component ── */

export function RoomChat({ roomSlug, canPost, isAnnouncements = false }: RoomChatProps) {
  const { messages, loading, hasMore, loadMore, sendMessage, sending, error } =
    useRoomMessages(roomSlug);
  const { user, profile } = useAuth();

  const displayName =
    (profile as any)?.display_name ||
    (profile as any)?.username ||
    user?.email?.split("@")[0] ||
    "Anonymous";

  const { typingText, broadcastTyping } = useTypingIndicator(roomSlug, user?.id, displayName);
  const { trackMessages, getReactions, toggleReaction } = useMessageReactions(roomSlug, user?.id);
  const { ensureProfiles, getProfile } = useChatProfiles();

  // Track visible message IDs for reaction fetching + fetch profiles
  useEffect(() => {
    if (messages.length > 0) {
      trackMessages(messages.map((m) => m.id));
      const uniqueUserIds = [...new Set(messages.map((m) => m.user_id))];
      ensureProfiles(uniqueUserIds);
    }
  }, [messages, trackMessages, ensureProfiles]);

  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTradeRecaps = roomSlug === "trade-recaps";

  const handleDraftChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDraft(e.target.value);
      broadcastTyping();
    },
    [broadcastTyping]
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [draft]);
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

  const handleSend = async (text?: string, attachments?: Attachment[]) => {
    const body = text ?? draft;
    if (!body.trim() && (!attachments || attachments.length === 0)) return;
    if (sending) return;
    if (!text) setDraft("");
    shouldAutoScroll.current = true;
    await sendMessage(body, attachments);
  };

  const ALLOWED_MIME = [
    "image/png", "image/jpeg", "image/jpg", "image/gif",
    "application/pdf", "video/mp4",
  ];
  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB


  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = "";
    setUploadError(null);

    if (!ALLOWED_MIME.includes(file.type)) {
      setUploadError("Unsupported file type. Allowed: PNG, JPG, GIF, PDF, MP4");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File must be under 15 MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${roomSlug}/${user.id}/${Date.now()}_${file.name}`;

    const { error: uploadErr } = await supabase.storage
      .from("academy-chat-files")
      .upload(path, file);

    if (uploadErr) {
      setUploadError("Upload failed: " + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("academy-chat-files")
      .getPublicUrl(path);

    const attachment: Attachment = {
      type: file.type.startsWith("image/") ? "image" : "file",
      url: urlData.publicUrl,
      filename: file.name,
      size: file.size,
      mime: file.type,
    };

    await handleSend(draft, [attachment]);
    setDraft("");
    setUploading(false);
  }, [user, roomSlug, draft, sending]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setDraft((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const newDraft = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(newDraft);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }, [draft]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
        {/* Announcements pinned banner */}
        {isAnnouncements && (
          <div className="mx-3 mt-2 mb-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2">
            <Megaphone className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300/80">
              Official updates only. Turn on notifications if you want alerts.
            </p>
          </div>
        )}

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
                  <ChatAvatar
                    avatarUrl={getProfile(msg.user_id)?.avatar_url}
                    userName={msg.user_name}
                  />
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
                    <RoleBadge role={getRoleBadgeKey(
                      (msg as any).user_role,
                      getProfile(msg.user_id)?.role_level
                    )} />
                    <span className="text-[11px] text-white/30">
                      {format(new Date(msg.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                )}

                {isRecap ? (
                  renderRecapCard(msg.body)
                ) : isAnnouncements ? (
                  <div className="max-w-[90%] mt-1">
                    <div className="flex items-start gap-0 rounded-lg border border-amber-500/15 bg-white/[0.03] overflow-hidden">
                      <div className="w-1 self-stretch bg-amber-500/60 shrink-0" />
                      <div className="px-3 py-2 flex-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400/80 mb-1">
                          <Megaphone className="h-3 w-3" /> Official
                        </span>
                        <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line">
                          {renderPlainBody(msg.body)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="inline-block max-w-[85%]">
                    <div className="bg-white/[0.04] rounded-lg rounded-tl-sm px-3 py-1.5">
                      {msg.body && msg.body !== "📎 Attachment" && (
                        <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line">
                          {renderPlainBody(msg.body)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {msg.attachments.map((att: Attachment, idx: number) =>
                      att.type === "image" ? (
                        <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={att.url}
                            alt={att.filename}
                            className="rounded-lg max-w-[300px] max-h-[240px] object-cover border border-white/[0.06]"
                          />
                        </a>
                      ) : (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 hover:bg-white/[0.06] transition-colors"
                        >
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-white/80 truncate max-w-[200px]">{att.filename}</p>
                            <p className="text-[10px] text-white/30">{(att.size / 1024).toFixed(0)} KB</p>
                          </div>
                        </a>
                      )
                    )}
                  </div>
                )}
                {!isAnnouncements && (() => {
                  const reactions = getReactions(msg.id);
                  return (
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {reactions.map((r) => (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={() => toggleReaction(msg.id, r.emoji as ReactionEmoji)}
                          className={cn(
                            "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition-colors",
                            r.reacted
                              ? "bg-primary/15 border-primary/30 text-primary"
                              : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]"
                          )}
                        >
                          <span>{r.emoji}</span>
                          <span className="text-[11px] font-medium">{r.count}</span>
                        </button>
                      ))}

                      {/* Hover add-reaction trigger */}
                      <span className="hidden group-hover:inline-flex items-center gap-0.5">
                        {ALLOWED_EMOJIS.filter(
                          (e) => !reactions.some((r) => r.emoji === e && r.reacted)
                        ).map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className="text-xs px-1 py-0.5 rounded hover:bg-white/[0.06] text-white/25 hover:text-white/50 transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </span>
                    </div>
                  );
                })()}
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
          {uploadError && <p className="text-xs text-destructive mb-2">{uploadError}</p>}
          {isTradeRecaps ? (
            <TradeRecapForm onSubmit={handleSend} sending={sending} />
          ) : (
            <div className="flex items-end gap-2 rounded-xl bg-black/25 border border-white/[0.1] px-3 py-2 focus-within:ring-1 focus-within:ring-white/20 transition-shadow">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,application/pdf,video/mp4"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Left icon row */}
              <div className="flex items-center gap-1 pb-0.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                  title="Attach file"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </button>
                <EmojiPicker onSelect={handleEmojiSelect} />
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={handleDraftChange}
                onKeyDown={handleKeyDown}
                placeholder="Message #Trading Chat…"
                maxLength={1000}
                disabled={sending}
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 resize-none outline-none min-h-[24px] max-h-[120px] leading-relaxed py-0.5"
              />

              {/* Send button */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={(!draft.trim() && !uploading) || sending}
                className={cn(
                  "shrink-0 p-2 rounded-lg transition-colors",
                  draft.trim() && !sending
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-white/20 cursor-not-allowed"
                )}
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
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

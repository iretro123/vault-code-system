import { useState, useRef, useEffect, useCallback } from "react";
import { useRoomMessages, type Attachment } from "@/hooks/useRoomMessages";
import { useAuth } from "@/hooks/useAuth";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMessageReactions, ALLOWED_EMOJIS, type ReactionEmoji } from "@/hooks/useMessageReactions";
import { useChatProfiles } from "@/hooks/useChatProfiles";
import { ChatAvatar } from "@/lib/chatAvatars";
import { Button } from "@/components/ui/button";
import { Loader2, Send, ChevronUp, Paperclip, Megaphone, FileText, Pencil, Trash2, X, Check, MoreHorizontal, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { formatTime, formatDateTime } from "@/lib/formatTime";
import { TradeRecapForm } from "./chat/TradeRecapForm";
import { EmojiPicker } from "./chat/EmojiPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  return profileRoleLevel || userRole || "";
}

/* ── main component ── */

export function RoomChat({ roomSlug, canPost, isAnnouncements = false }: RoomChatProps) {
  const { messages, loading, hasMore, loadMore, sendMessage, sending, error, editMessage, deleteMessage } =
    useRoomMessages(roomSlug);
  const { user, profile, userRole: authUserRole } = useAuth();

  const isOperator = authUserRole?.role === "operator";

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  // Auto-resize edit textarea
  useEffect(() => {
    const el = editInputRef.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [editDraft]);

  // Focus edit input when entering edit mode
  useEffect(() => {
    if (editingId) {
      requestAnimationFrame(() => editInputRef.current?.focus());
    }
  }, [editingId]);

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
  const MAX_FILE_SIZE = 15 * 1024 * 1024;

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = "";

    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error("Unsupported file type. Allowed: PNG, JPG, GIF, PDF, MP4");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be under 15 MB.");
      return;
    }

    setUploading(true);
    const path = `${roomSlug}/${user.id}/${Date.now()}_${file.name}`;

    const { error: uploadErr } = await supabase.storage
      .from("academy-chat-files")
      .upload(path, file);

    if (uploadErr) {
      toast.error("Upload failed. Please try again.");
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

  // Edit handlers
  const [saving, setSaving] = useState(false);

  const startEdit = (msgId: string, currentBody: string) => {
    // Re-check 15-min window at click time
    const msg = messages.find((m) => m.id === msgId);
    if (msg && !isOperator) {
      const ageMs = Date.now() - new Date(msg.created_at).getTime();
      if (ageMs >= 15 * 60 * 1000) {
        toast.error("Edit window expired — messages can only be edited within 15 minutes.");
        return;
      }
    }
    setEditingId(msgId);
    setEditDraft(currentBody);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const confirmEdit = async () => {
    if (!editingId || !editDraft.trim() || saving) return;
    setSaving(true);
    const result = await editMessage(editingId, editDraft);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Message edited");
    }
    setSaving(false);
    cancelEdit();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      confirmEdit();
    }
    if (e.key === "Escape") {
      cancelEdit();
    }
  };

  // Delete handler
  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const result = await deleteMessage(deleteConfirmId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Message deleted");
    }
    setDeleteConfirmId(null);
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
      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be removed from the chat for everyone. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          const isRecap = !msg.is_deleted && isRecapPost(msg.body);
          const isOwn = msg.user_id === user?.id;
          const ageMs = Date.now() - new Date(msg.created_at).getTime();
          const within15min = ageMs < 15 * 60 * 1000;
          const canEdit = !msg.is_deleted && (isOperator || (isOwn && within15min));
          const canDelete = !msg.is_deleted && (isOwn || isOperator);
          const isEditing = editingId === msg.id;

          const copyMessage = () => {
            navigator.clipboard.writeText(msg.body).then(
              () => toast.success("Copied to clipboard"),
              () => toast.error("Failed to copy")
            );
          };

          /* Shared menu items for both dropdown and context menu */
          const menuActions = (
            ItemComponent: typeof DropdownMenuItem | typeof ContextMenuItem
          ) => (
            <>
              {!msg.is_deleted && (
                <ItemComponent onClick={copyMessage} className="gap-2 text-xs">
                  <Copy className="h-3 w-3" /> Copy
                </ItemComponent>
              )}
              {canEdit && (
                <ItemComponent onClick={() => startEdit(msg.id, msg.body)} className="gap-2 text-xs">
                  <Pencil className="h-3 w-3" /> Edit
                </ItemComponent>
              )}
              {canDelete && (
                <ItemComponent onClick={() => setDeleteConfirmId(msg.id)} className="gap-2 text-xs text-destructive focus:text-destructive">
                  <Trash2 className="h-3 w-3" /> Delete
                </ItemComponent>
              )}
            </>
          );

          return (
            <ContextMenu key={msg.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={cn(
                    "group relative flex gap-3 px-3 py-0.5 hover:bg-white/[0.02] transition-colors",
                    showHdr && "mt-3 pt-1.5",
                    isEditing && "bg-white/[0.03]"
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
                      <span className="hidden group-hover:flex items-center justify-center h-5 text-[10px] text-white/30 select-none">
                        {formatTime(msg.created_at)}
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
                          {formatDateTime(msg.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Soft-deleted message */}
                    {msg.is_deleted ? (
                      <div className="inline-block max-w-[85%]">
                        <div className="bg-white/[0.02] rounded-lg rounded-tl-sm px-3 py-1.5 border border-white/[0.04]">
                          <p className="text-sm text-white/30 italic">This message was deleted.</p>
                        </div>
                      </div>
                    ) : isEditing ? (
                      /* Inline edit mode */
                      <div className="max-w-[85%]">
                        <textarea
                          ref={editInputRef}
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          maxLength={1000}
                          rows={1}
                          className="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-1.5 text-sm text-white/90 resize-none outline-none focus:ring-1 focus:ring-primary/40 min-h-[32px] max-h-[120px] leading-relaxed"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={confirmEdit}
                            className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
                          >
                            <Check className="h-3 w-3" /> Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/60 transition-colors"
                          >
                            <X className="h-3 w-3" /> Cancel
                          </button>
                          <span className="text-[10px] text-white/20">esc to cancel · enter to save</span>
                        </div>
                      </div>
                    ) : isRecap ? (
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
                      <>
                        {msg.body && msg.body !== "📎 Attachment" && (
                          <div className="inline-block max-w-[85%]">
                            <div className="bg-white/[0.04] rounded-lg rounded-tl-sm px-3 py-1.5">
                              <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line">
                                {renderPlainBody(msg.body)}
                              </p>
                              {msg.edited_at && (
                                <span className="text-[10px] text-white/25 mt-0.5 block">(edited)</span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Attachments (only if not deleted) */}
                    {!msg.is_deleted && msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {msg.attachments.map((att: Attachment, idx: number) =>
                          att.type === "image" ? (
                            <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                              <img
                                src={att.url}
                                alt={att.filename}
                                loading="lazy"
                                className="rounded-lg max-w-[260px] max-h-[200px] object-cover border border-white/[0.06] hover:border-white/20 transition-colors cursor-pointer"
                              />
                              <span className="text-[10px] text-white/30 mt-0.5 block truncate max-w-[260px]">{att.filename}</span>
                            </a>
                          ) : (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={att.filename}
                              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 hover:bg-white/[0.06] transition-colors"
                            >
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-white/80 truncate max-w-[200px]">{att.filename}</p>
                                <p className="text-[10px] text-white/30">
                                  {att.size >= 1024 * 1024
                                    ? `${(att.size / (1024 * 1024)).toFixed(1)} MB`
                                    : `${(att.size / 1024).toFixed(0)} KB`}
                                  {" · "}
                                  <span className="text-primary/70">Download</span>
                                </p>
                              </div>
                            </a>
                          )
                        )}
                      </div>
                    )}

                    {/* 3-dot actions menu — use opacity so Radix can always measure trigger position */}
                    {!msg.is_deleted && !isEditing && (
                      <div className="absolute -top-2 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="p-1 rounded-md bg-popover border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.08] backdrop-blur-sm transition-colors shadow-sm"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={4} className="min-w-[120px]">
                            {menuActions(DropdownMenuItem)}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    {!isAnnouncements && !msg.is_deleted && (() => {
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
              </ContextMenuTrigger>

              {/* Right-click context menu */}
              <ContextMenuContent className="min-w-[120px]">
                {menuActions(ContextMenuItem)}
              </ContextMenuContent>
            </ContextMenu>
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
          {isTradeRecaps ? (
            <TradeRecapForm onSubmit={handleSend} sending={sending} />
          ) : (
            <div data-chat-composer className="flex items-end gap-2 rounded-xl bg-black/25 border border-white/[0.1] px-3 py-2 focus-within:ring-1 focus-within:ring-white/20 transition-shadow">
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
                placeholder="Type a message…"
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
                  "shrink-0 p-2 rounded-lg transition-all duration-150",
                  draft.trim() && !sending
                    ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-95"
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

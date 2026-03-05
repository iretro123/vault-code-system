import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { ImageLightbox } from "./community/ImageLightbox";
import { DateSeparator, getDateLabel, shouldShowDateSeparator } from "./community/DateSeparator";
import { useRoomMessages, type Attachment } from "@/hooks/useRoomMessages";
import { useAuth } from "@/hooks/useAuth";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMessageReactions, ALLOWED_EMOJIS, type ReactionEmoji } from "@/hooks/useMessageReactions";
import { useChatProfiles } from "@/hooks/useChatProfiles";
import { useChatModeration } from "@/hooks/useChatModeration";
import { ChatAvatar } from "@/lib/chatAvatars";
import { Button } from "@/components/ui/button";
import { Loader2, SendHorizontal, Send, ChevronUp, ChevronDown as ChevronDownIcon, Paperclip, Megaphone, FileText, Pencil, Trash2, X, Check, MoreHorizontal, Copy, Pin, PinOff, Lock, Unlock, Clock, ShieldAlert, MessageSquare, ArrowDown } from "lucide-react";
import { AcademyRoleBadge } from "./AcademyRoleBadge";
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
import { useNavigate } from "react-router-dom";
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
  onThreadOpen?: (msg: any) => void;
  onSwitchTab?: (tab: string) => void;
}

/* ── helpers ── */

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  advanced:     { label: "Advanced",     cls: "bg-purple-100 text-purple-700 border-purple-200" },
  professional: { label: "Advanced",     cls: "bg-purple-100 text-purple-700 border-purple-200" },
  veteran:      { label: "Advanced",     cls: "bg-purple-100 text-purple-700 border-purple-200" },
  intermediate: { label: "Intermediate", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  active:       { label: "Intermediate", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  beginner:     { label: "Beginner",     cls: "bg-gray-100 text-gray-500 border-gray-200" },
  newbie:       { label: "Beginner",     cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

const ExperienceBadge = React.forwardRef<HTMLSpanElement, { role?: string }>(
  ({ role, ...props }, ref) => {
    const cfg = ROLE_CONFIG[role?.toLowerCase() ?? ""];
    if (!cfg) return null;
    return (
      <span ref={ref} {...props} className={cn("text-[10px] leading-none px-1.5 py-0.5 rounded font-medium border", cfg.cls)}>
        {cfg.label}
      </span>
    );
  }
);
ExperienceBadge.displayName = "ExperienceBadge";

/* ── message body renderers ── */

function isRecapPost(body: string) {
  return body.startsWith("**📋 Trade Post**") || body.startsWith("**📋 Trade Recap**");
}

function isTradeFormatPost(body: string) {
  const lower = body.toLowerCase();
  return (
    (lower.includes("ticker:") || lower.includes("**ticker:**")) &&
    (lower.includes("risk:") || lower.includes("**risk:**"))
  );
}

function renderTradeCard(body: string, attachments?: any[]) {
  const lines = body.split("\n").filter(Boolean);
  const fields: { label: string; value: string }[] = [];
  for (const line of lines) {
    const match = line.match(/^\*?\*?(.+?):\*?\*?\s*(.+)$/);
    if (match) fields.push({ label: match[1].replace(/\*/g, "").trim(), value: match[2].trim() });
  }

  const imageAtt = attachments?.find((a: any) => a.type === "image");

  return (
    <div className="rounded-[20px] border border-[hsl(220,10%,85%)] bg-white mt-2 overflow-hidden max-w-full sm:max-w-[560px] shadow-sm hover:border-[hsl(220,10%,75%)] transition-colors">
      <div className="flex">
        {/* Left — Fields */}
        <div className="flex-1 min-w-0 p-5 space-y-3">
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">Trade Setup</p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            {fields.map((f, i) => (
              <div key={i} className={
                ["thesis", "lesson", "lesson learned", "notes"].includes(f.label.toLowerCase()) ? "col-span-2" : ""
              }>
                <span className="text-[10px] text-[hsl(220,10%,50%)] uppercase tracking-wider font-medium">{f.label}</span>
                <p className="text-[15px] text-[hsl(220,15%,15%)] font-medium mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Chart image */}
        {imageAtt && (
          <div className="hidden sm:block w-[200px] shrink-0 bg-[hsl(220,10%,96%)] border-l border-[hsl(220,10%,88%)]">
            <img
              src={(imageAtt as any).url}
              alt="Chart"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex items-center gap-1 px-5 py-3 border-t border-[hsl(220,10%,90%)] bg-[hsl(220,10%,97%)]">
        <button className="text-xs text-[hsl(220,10%,45%)] hover:text-[hsl(220,10%,20%)] transition-colors px-3.5 py-2 rounded-xl hover:bg-[hsl(220,10%,92%)] font-medium">
          Ask Coach
        </button>
        <button className="text-xs text-[hsl(220,10%,45%)] hover:text-[hsl(220,10%,20%)] transition-colors px-3.5 py-2 rounded-xl hover:bg-[hsl(220,10%,92%)] font-medium">
          Log Trade
        </button>
        <button className="text-xs text-[hsl(220,10%,45%)] hover:text-[hsl(220,10%,20%)] transition-colors px-3.5 py-2 rounded-xl hover:bg-[hsl(220,10%,92%)] font-medium">
          Request Feedback
        </button>
      </div>
    </div>
  );
}

function renderRecapCard(body: string) {
  const lines = body.split("\n").filter(Boolean);
  const fields: { label: string; value: string }[] = [];
  for (const line of lines.slice(1)) {
    const match = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if (match) fields.push({ label: match[1], value: match[2] });
  }

  return (
    <div className="rounded-[20px] border border-[hsl(220,10%,85%)] bg-white p-5 space-y-3 mt-2 shadow-sm hover:border-[hsl(220,10%,75%)] transition-colors max-w-full sm:max-w-[560px]">
      <p className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">Trade Post</p>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
        {fields.map((f, i) => (
          <div key={i} className={f.label === "Lesson" ? "col-span-2" : ""}>
            <span className="text-[10px] text-[hsl(220,10%,50%)] uppercase tracking-wider font-medium">{f.label}</span>
            <p className="text-[15px] text-[hsl(220,15%,15%)] font-medium mt-0.5">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderPlainBody(body: string, isOwnBubble = false) {
  // Split quote block from rest of message
  const lines = body.split("\n");
  const quoteLines: string[] = [];
  const restLines: string[] = [];
  let pastQuote = false;
  for (const line of lines) {
    if (!pastQuote && line.startsWith("> ")) {
      quoteLines.push(line.slice(2));
    } else {
      pastQuote = true;
      restLines.push(line);
    }
  }

  const renderInline = (text: string) => {
    // Handle image markdown: ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    if (imageRegex.test(text)) {
      const parts = text.split(/(!?\[[^\]]*\]\([^)]+\))/g);
      return parts.map((part, i) => {
        const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgMatch) {
          return <img key={i} src={imgMatch[2]} alt={imgMatch[1]} className="rounded-lg max-w-full sm:max-w-[300px] max-h-[240px] mt-1 object-cover" />;
        }
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className={isOwnBubble ? "text-white/90 underline" : "text-primary underline"}>{linkMatch[1]}</a>;
        }
        if (!part) return null;
        return <span key={i}>{part}</span>;
      });
    }

    // Bold markdown
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <span key={i} className={cn("font-semibold", isOwnBubble ? "text-white" : "text-[hsl(220,15%,15%)]")}>{part.slice(2, -2)}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const restText = restLines.join("\n").trim();

  return (
    <>
      {quoteLines.length > 0 && (
        <div className={cn(
          "border-l-2 pl-2.5 py-1 mb-1.5 rounded-r-md text-[12px] leading-snug",
          isOwnBubble
            ? "border-white/40 bg-white/10 text-white/70"
            : "border-primary/40 bg-primary/[0.06] text-[hsl(220,10%,40%)]"
        )}>
          {renderInline(quoteLines.join(" "))}
        </div>
      )}
      {restText && <span>{renderInline(restText)}</span>}
    </>
  );
}

/* ── grouping logic ── */

const GROUP_WINDOW_MS = 5 * 60 * 1000;

function shouldGroupWithPrevious(
  msg: { user_id: string; created_at: string; is_deleted?: boolean },
  prev?: { user_id: string; created_at: string; is_deleted?: boolean }
) {
  if (!prev) return false;
  if (prev.user_id !== msg.user_id) return false;
  if (msg.is_deleted || prev.is_deleted) return false;
  if (shouldShowDateSeparator(msg.created_at, prev.created_at)) return false;

  const gapMs = new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime();
  return gapMs >= 0 && gapMs <= GROUP_WINDOW_MS;
}

function shouldShowHeader(
  msg: { user_id: string; created_at: string; is_deleted?: boolean },
  prev?: { user_id: string; created_at: string; is_deleted?: boolean }
) {
  return !shouldGroupWithPrevious(msg, prev);
}

/* ── role label from profile data ── */
function getRoleBadgeKey(userRole: string, profileRoleLevel?: string): string {
  return profileRoleLevel || userRole || "";
}

/* ── main component ── */

export function RoomChat({ roomSlug, canPost, isAnnouncements = false, onThreadOpen, onSwitchTab }: RoomChatProps) {
  const navigate = useNavigate();
  const { messages, loading, hasMore, loadMore, sendMessage, sending, error, editMessage, deleteMessage } =
    useRoomMessages(roomSlug);
  const { user, profile, userRole: authUserRole } = useAuth();
  const {
    canModerate, isRoomLocked, isMuted, muteExpiresAt,
    pinnedMessageId, timeoutUser, lockRoom, unlockRoom,
    pinMessage, unpinMessage, moderatorDelete,
  } = useChatModeration(roomSlug);

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
  const [dragOver, setDragOver] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string; filename?: string } | null>(null);
  const dragDepthRef = useRef(0);
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
  const [replyingTo, setReplyingTo] = useState<{ id: string; user_name: string; body: string } | null>(null);

  const isTradeRecaps = roomSlug === "trade-recaps";
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

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

  // Removed: [loading] scroll effect — redundant with SWR cache and causes layout jump on mount

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    shouldAutoScroll.current = atBottom;
    setShowJumpToLatest(!atBottom);
  }, []);

  const jumpToLatest = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowJumpToLatest(false);
  };

  const handleSend = async (text?: string, attachments?: Attachment[]) => {
    let body = text ?? draft;
    if (!body.trim() && (!attachments || attachments.length === 0)) return;
    if (sending) return;

    // Prepend quote block if replying
    if (replyingTo && !text) {
      const truncated = replyingTo.body.length > 60 ? replyingTo.body.slice(0, 60) + "…" : replyingTo.body;
      body = `> **@${replyingTo.user_name}:** ${truncated}\n\n${body}`;
      setReplyingTo(null);
    }

    if (!text) setDraft("");
    shouldAutoScroll.current = true;
    await sendMessage(body, attachments);
  };

  const ALLOWED_MIME = [
    "image/png", "image/jpeg", "image/jpg", "image/gif",
    "application/pdf", "video/mp4",
  ];
  const MAX_FILE_SIZE = 15 * 1024 * 1024;

  type UploadSource = "attach" | "drag-drop";
  type UploadResult = {
    ok: boolean;
    status: number;
    body: unknown;
    error?: string;
  };

  const uploadChatFile = useCallback(
    async (file: File, path: string, source: UploadSource): Promise<UploadResult> => {
      console.debug(`[ChatUpload][${source}] helper called`, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        userId: user?.id,
        path,
      });

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      console.debug(`[ChatUpload][${source}] auth state`, {
        hasSession: !!sessionData?.session,
        hasToken: !!accessToken,
        sessionUserId: sessionData?.session?.user?.id ?? null,
      });

      if (!accessToken) {
        return {
          ok: false,
          status: 401,
          body: { reason: "auth/session missing" },
          error: "auth/session missing",
        };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");

      const res = await fetch(`${supabaseUrl}/storage/v1/object/academy-chat-files/${encodedPath}`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          authorization: `Bearer ${accessToken}`,
          "content-type": file.type || "application/octet-stream",
          "x-upsert": "false",
        },
        body: file,
      });

      const responseText = await res.text();
      let responseBody: unknown = responseText;
      try {
        responseBody = responseText ? JSON.parse(responseText) : null;
      } catch {
        responseBody = responseText || null;
      }

      console.debug(`[ChatUpload][${source}] storage response`, {
        status: res.status,
        ok: res.ok,
        body: responseBody,
      });

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          body: responseBody,
          error:
            typeof responseBody === "object" && responseBody && "message" in responseBody
              ? String((responseBody as { message?: string }).message)
              : `storage ${res.status}`,
        };
      }

      return {
        ok: true,
        status: res.status,
        body: responseBody,
      };
    },
    [user?.id]
  );

  const handleUploadFile = useCallback(
    async (file: File, source: UploadSource) => {
      console.debug(`[ChatUpload][${source}] entry`, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        userId: user?.id ?? null,
      });

      if (!user) {
        toast.error("Upload failed: auth/session missing");
        return;
      }

      if (!ALLOWED_MIME.includes(file.type)) {
        toast.error("Unsupported file type. Allowed: PNG, JPG, GIF, PDF, MP4");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error("File must be under 15 MB.");
        return;
      }

      setUploading(true);

      try {
        const safeFileName = file.name
          .normalize("NFKD")
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .replace(/_+/g, "_");

        const path = `${roomSlug}/${user.id}/${Date.now()}_${safeFileName}`;

        const uploadResult = await uploadChatFile(file, path, source);
        if (!uploadResult.ok) {
          const reason =
            uploadResult.status === 401
              ? "auth/session missing"
              : uploadResult.status === 403
                ? "storage 403 policy denied"
                : uploadResult.status === 400
                  ? "storage 400 invalid request"
                  : uploadResult.error || `storage ${uploadResult.status}`;

          toast.error(`Upload failed: ${reason}`);
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

        shouldAutoScroll.current = true;
        const messageResult = await sendMessage(draft, [attachment]);
        console.debug(`[ChatUpload][${source}] message insert response`, messageResult);

        if (!messageResult?.ok) {
          toast.error(`Upload failed: attachment save failed (${messageResult?.error || "unknown"})`);
          return;
        }

        setDraft("");
      } catch (err) {
        console.error(`[ChatUpload][${source}] unexpected error`, err);
        toast.error("Upload failed: unexpected error");
      } finally {
        setUploading(false);
      }
    },
    [user, roomSlug, draft, uploadChatFile, sendMessage]
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      await handleUploadFile(file, "attach");
    },
    [handleUploadFile]
  );

  // Drag-and-drop file upload
  const processDroppedFile = useCallback(
    async (file: File) => {
      await handleUploadFile(file, "drag-drop");
    },
    [handleUploadFile]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    if (dragDepthRef.current === 1) setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processDroppedFile(files[0]);
    }
  }, [processDroppedFile]);

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

  // Delete handler (with audit logging for moderator deletes)
  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const msg = messages.find((m) => m.id === deleteConfirmId);
    const isModAction = msg && msg.user_id !== user?.id && canModerate;

    const result = isModAction
      ? await moderatorDelete(deleteConfirmId, msg.user_id, deleteMessage)
      : await deleteMessage(deleteConfirmId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Message deleted");
    }
    setDeleteConfirmId(null);
  };

  const filteredMessages = useMemo(() => messages.filter((msg) => {
    if (msg.is_deleted && msg.deleted_at) {
      const deletedAgeMs = Date.now() - new Date(msg.deleted_at).getTime();
      if (deletedAgeMs >= 15 * 60 * 1000) return false;
    }
    if ((msg as any).parent_message_id) return false;
    return true;
  }), [messages]);


  if (loading) {
    return (
      <div className="flex flex-col h-full w-full bg-[hsl(220,15%,92%)]">
      <div className="flex-1 overflow-hidden px-3 py-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-full bg-[hsl(220,12%,84%)] shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-24 rounded bg-[hsl(220,12%,84%)]" />
                <div className="h-3 rounded bg-[hsl(220,12%,86%)]" style={{ width: `${40 + (i % 3) * 20}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="h-14 border-t border-[hsl(220,12%,84%)] bg-white" />
      </div>
    );
  }

  return (
    <>
    <div className="relative flex flex-col h-full w-full bg-[hsl(220,15%,92%)]">
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
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        {/* Announcements pinned banner */}
        {isAnnouncements && (
          <div className="mx-3 mt-2 mb-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2">
            <Megaphone className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-600">
              Official updates only. Turn on notifications if you want alerts.
            </p>
          </div>
        )}

        {/* Room locked banner */}
        {isRoomLocked && (
          <div className="mx-3 mt-2 mb-1 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/[0.06] px-3 py-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive/80">This room is currently locked by a moderator.</p>
            </div>
            {canModerate && (
              <Button variant="ghost" size="sm" onClick={unlockRoom} className="h-6 gap-1 text-[11px] text-destructive hover:text-destructive">
                <Unlock className="h-3 w-3" /> Unlock
              </Button>
            )}
          </div>
        )}

        {/* Moderator room controls */}
        {canModerate && !isRoomLocked && (
          <div className="mx-3 mt-2 mb-1 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={lockRoom} className="h-6 gap-1 text-[11px] text-[hsl(220,10%,55%)] hover:text-[hsl(220,10%,30%)]">
              <Lock className="h-3 w-3" /> Lock Room
            </Button>
          </div>
        )}

        {/* Pinned message banner */}
        {pinnedMessageId && (() => {
          const pinned = messages.find((m) => m.id === pinnedMessageId);
          if (!pinned || pinned.is_deleted) return null;
          return (
            <div className="mx-3 mt-1 mb-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2">
              <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-primary/70 font-medium uppercase tracking-wider mb-0.5">Pinned</p>
                <p className="text-xs text-[hsl(220,15%,25%)] truncate">{pinned.body}</p>
              </div>
              {canModerate && (
                <button onClick={unpinMessage} className="p-1 text-[hsl(220,10%,55%)] hover:text-[hsl(220,10%,30%)]">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })()}

        {hasMore && (
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="sm" onClick={loadMore} className="gap-1 text-xs text-[hsl(220,10%,45%)] hover:text-[hsl(220,10%,20%)]">
              <ChevronUp className="h-3 w-3" />
              Load older
            </Button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center py-16 max-w-xs mx-auto space-y-2">
            {roomSlug === "options-lounge" ? (
              <>
                <p className="text-sm font-medium text-[hsl(220,10%,35%)]">No posts yet.</p>
                <p className="text-xs text-[hsl(220,10%,50%)]">Serious traders post 1 trade/week. Use Trade → Post a Trade.</p>
              </>
            ) : roomSlug === "trade-recaps" ? (
              <>
                <p className="text-sm font-medium text-[hsl(220,10%,35%)]">Proof is earned.</p>
                <p className="text-xs text-[hsl(220,10%,50%)]">Post screenshot + ticker + entry/exit + risk.</p>
              </>
            ) : (
              <p className="text-sm text-[hsl(220,10%,45%)]">No messages yet.</p>
            )}
          </div>
        )}

        {filteredMessages.map((msg, i, filteredMsgs) => {
          const prev = filteredMsgs[i - 1];
          const next = filteredMsgs[i + 1];
          const showDate = shouldShowDateSeparator(msg.created_at, prev?.created_at);
          const isGroupedWithPrev = !showDate && shouldGroupWithPrevious(msg, prev);
          const isGroupedWithNext = next ? shouldGroupWithPrevious(next, msg) : false;
          const startsNewGroup = !isGroupedWithPrev;
          const showHdr = shouldShowHeader(msg, prev);
          const isRecap = !msg.is_deleted && isRecapPost(msg.body);
          const isOwn = msg.user_id === user?.id;
          const ageMs = Date.now() - new Date(msg.created_at).getTime();
          const within15min = ageMs < 15 * 60 * 1000;
          const canEdit = !msg.is_deleted && (isOperator || canModerate || (isOwn && within15min));
          const canDelete = !msg.is_deleted && (isOwn || isOperator || canModerate);
          const isEditing = editingId === msg.id;

          const copyMessage = () => {
            navigator.clipboard.writeText(msg.body).then(
              () => toast.success("Copied to clipboard"),
              () => toast.error("Failed to copy")
            );
          };

          const isPinned = pinnedMessageId === msg.id;

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
              {!msg.is_deleted && !isAnnouncements && (
                <ItemComponent onClick={() => {
                  setReplyingTo({ id: msg.id, user_name: msg.user_name, body: msg.body });
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }} className="gap-2 text-xs">
                  <MessageSquare className="h-3 w-3" /> Reply
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
              {/* Moderator-only actions */}
              {canModerate && !msg.is_deleted && (
                <>
                  <ItemComponent
                    onClick={() => isPinned ? unpinMessage() : pinMessage(msg.id)}
                    className="gap-2 text-xs"
                  >
                    {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                    {isPinned ? "Unpin" : "Pin message"}
                  </ItemComponent>
                  {!isOwn && (
                    <ItemComponent
                      onClick={() => timeoutUser(msg.user_id, msg.user_name)}
                      className="gap-2 text-xs text-amber-400 focus:text-amber-400"
                    >
                      <Clock className="h-3 w-3" /> Timeout 24h
                    </ItemComponent>
                  )}
                </>
              )}
            </>
          );

          const msgProfile = getProfile(msg.user_id);
          const msgAcademyRole = msgProfile?.academy_role_name;
          const isCeoOrAdmin = msgAcademyRole === "CEO" || msgAcademyRole === "Admin" || msgAcademyRole === "Coach";
          const isOfficialAnnouncement = !msg.is_deleted && msg.body.startsWith("📢 ");

          const replyCount = (msg as any).reply_count || 0;

          return (
            <div key={msg.id}>
              {showDate && <DateSeparator date={getDateLabel(msg.created_at)} />}
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  className={cn(
                    "group relative flex gap-3 px-4 hover:bg-[hsl(220,12%,89%)] transition-colors duration-75",
                    startsNewGroup ? "mt-2 pt-2 pb-1" : (isGroupedWithNext ? "py-[2px]" : "pt-[2px] pb-0.5"),
                    isEditing && "bg-[hsl(220,10%,93%)]",
                    isCeoOrAdmin && "border-l-2 border-l-amber-500/40",
                    isOfficialAnnouncement && "bg-amber-50"
                  )}
                >
                  {/* Avatar column — compact on grouped follow-ups */}
                  <div className={cn("w-9 shrink-0", startsNewGroup ? "h-9" : "h-5")}>
                    {showHdr ? (
                      msgProfile ? (
                        <ChatAvatar
                          avatarUrl={msgProfile.avatar_url}
                          userName={msg.user_name}
                          size="h-9 w-9"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[hsl(220,10%,88%)] animate-pulse" />
                      )
                    ) : (
                      <span className="hidden group-hover:flex items-center justify-center h-5 text-[10px] text-[hsl(220,10%,60%)] select-none">
                        {formatTime(msg.created_at)}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {showHdr && (
                      <div className="flex items-center gap-2 mb-0.5 min-h-[22px]">
                        <span className={cn(
                          "text-[13px] font-semibold tracking-[-0.01em]",
                          isCeoOrAdmin ? "text-amber-700" : "text-[hsl(220,15%,12%)]"
                        )}>
                          {msg.user_name}
                        </span>
                         {msgProfile ? (
                           <>
                             <AcademyRoleBadge roleName={msgAcademyRole} />
                             {!isCeoOrAdmin && (
                               <ExperienceBadge role={getRoleBadgeKey(
                                 (msg as any).user_role,
                                 msgProfile?.role_level
                               )} />
                             )}
                           </>
                        ) : (
                          <div className="h-4 w-16 rounded bg-[hsl(220,10%,88%)] animate-pulse" />
                        )}
                        <span className="text-[11px] text-[hsl(220,10%,52%)]">
                          {formatDateTime(msg.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Official Announcement banner */}
                    {isOfficialAnnouncement && !isEditing && !isRecap ? (
                      <div className="max-w-[90%] mt-1">
                        <div className="flex items-start gap-0 rounded-lg border border-amber-500/15 bg-amber-500/[0.04] overflow-hidden">
                          <div className="w-1 self-stretch bg-amber-500/50 shrink-0" />
                          <div className="px-3 py-2 flex-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1">
                              <Megaphone className="h-3 w-3" /> Official Announcement
                            </span>
                            <p className="text-sm text-[hsl(220,15%,15%)] leading-relaxed whitespace-pre-line">
                              {renderPlainBody(msg.body.replace(/^📢\s*/, ""))}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Soft-deleted message */}
                    {msg.is_deleted ? (
                      <div className="inline-block max-w-[85%]">
                        <div className="bg-[hsl(220,10%,93%)] rounded-xl px-3.5 py-2 border border-[hsl(220,10%,88%)]">
                          <p className="text-[13px] text-[hsl(220,10%,55%)] italic">This message was deleted.</p>
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
                          className="w-full bg-white border border-[hsl(220,10%,82%)] rounded-lg px-3 py-1.5 text-sm text-[hsl(220,15%,15%)] resize-none outline-none focus:ring-1 focus:ring-primary/40 min-h-[32px] max-h-[120px] leading-relaxed"
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
                            className="flex items-center gap-1 text-[11px] text-[hsl(220,10%,50%)] hover:text-[hsl(220,10%,30%)] transition-colors"
                          >
                            <X className="h-3 w-3" /> Cancel
                          </button>
                          <span className="text-[10px] text-[hsl(220,10%,60%)]">esc to cancel · enter to save</span>
                        </div>
                      </div>
                    ) : isRecap ? (
                      renderRecapCard(msg.body)
                    ) : !msg.is_deleted && isTradeFormatPost(msg.body) ? (
                      renderTradeCard(msg.body, msg.attachments)
                    ) : isAnnouncements ? (
                      <div className="max-w-[90%] mt-1">
                        <div className="flex items-start gap-0 rounded-xl border border-amber-500/15 bg-white/[0.03] overflow-hidden">
                          <div className="w-1 self-stretch bg-amber-500/60 shrink-0" />
                          <div className="px-3 py-2 flex-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1">
                              <Megaphone className="h-3 w-3" /> Official
                            </span>
                            <p className="text-[15px] text-[hsl(220,15%,15%)] leading-relaxed whitespace-pre-line">
                              {renderPlainBody(msg.body)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.body && msg.body !== "📎 Attachment" && (
                          <div className="inline-block max-w-[88%]">
                            <div className={cn(
                              "rounded-xl px-3.5 py-2",
                              startsNewGroup ? "mt-0.5" : "mt-0",
                              isCeoOrAdmin
                                ? "bg-amber-50 border border-amber-200 shadow-sm"
                                : isOwn
                                  ? "bg-gradient-to-b from-[hsl(217,91%,60%)] to-[hsl(217,91%,54%)] text-white border border-primary/70 shadow-[0_1px_4px_rgba(59,130,246,0.25)]"
                                  : "bg-white border border-[hsl(220,10%,83%)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                            )}>
                              <p className={cn(
                                "text-[14px] leading-[1.6] whitespace-pre-line",
                                isOwn && !isCeoOrAdmin ? "text-white" : "text-[hsl(220,15%,15%)]"
                              )}>
                                {renderPlainBody(msg.body, isOwn && !isCeoOrAdmin)}
                              </p>
                              {msg.edited_at && (new Date(msg.edited_at).getTime() - new Date(msg.created_at).getTime() > 10000) && (
                                <span className={cn("text-[10px] mt-0.5 block", isOwn && !isCeoOrAdmin ? "text-white/60" : "text-[hsl(220,10%,55%)]")}>(edited)</span>
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
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setLightboxImage({ src: att.url, alt: att.filename, filename: att.filename })}
                              className="block text-left"
                            >
                              <img
                                src={att.url}
                                alt={att.filename}
                                loading="lazy"
                                className="rounded-xl max-w-full max-h-[400px] w-auto h-auto object-contain border border-[hsl(220,10%,85%)] hover:border-[hsl(220,10%,70%)] hover:shadow-md transition-all cursor-pointer"
                              />
                              <span className="text-[10px] text-[hsl(220,10%,50%)] mt-0.5 block truncate max-w-full">{att.filename}</span>
                            </button>
                          ) : (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={att.filename}
                              className="flex items-center gap-2 rounded-lg border border-[hsl(220,10%,85%)] bg-white px-3 py-2 hover:bg-[hsl(220,10%,96%)] transition-colors shadow-sm"
                            >
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-[hsl(220,15%,20%)] truncate max-w-[200px]">{att.filename}</p>
                                <p className="text-[10px] text-[hsl(220,10%,50%)]">
                                  {att.size >= 1024 * 1024
                                    ? `${(att.size / (1024 * 1024)).toFixed(1)} MB`
                                    : `${(att.size / 1024).toFixed(0)} KB`}
                                  {" · "}
                                  <span className="text-primary">Download</span>
                                </p>
                              </div>
                            </a>
                          )
                        )}
                      </div>
                    )}

                    {/* Hover action bar — Discord-style floating toolbar, absolutely positioned to avoid reflow */}
                    {!msg.is_deleted && !isEditing && (
                      <div className="absolute -top-4 right-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-75 z-10">
                        <div className="flex items-center gap-0.5 rounded-lg bg-white border border-[hsl(220,10%,82%)] shadow-md px-1 py-0.5">
                          {/* Quick reactions */}
                          {!isAnnouncements && ALLOWED_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className="text-sm px-1.5 py-1 rounded-md hover:bg-[hsl(220,10%,94%)] transition-colors"
                              title={`React ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                          {/* Reply */}
                          {!isAnnouncements && onThreadOpen && (
                            <button
                              type="button"
                              onClick={() => onThreadOpen({ ...msg, reply_count: replyCount })}
                              className="p-1.5 rounded-md text-[hsl(220,10%,50%)] hover:text-[hsl(220,10%,25%)] hover:bg-[hsl(220,10%,94%)] transition-colors"
                              title="Reply in thread"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {/* More menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1.5 rounded-md text-[hsl(220,10%,50%)] hover:text-[hsl(220,10%,25%)] hover:bg-[hsl(220,10%,94%)] transition-colors"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={4} className="min-w-[120px]">
                              {menuActions(DropdownMenuItem)}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )}

                    {!isAnnouncements && !msg.is_deleted && (() => {
                      const reactions = getReactions(msg.id);
                      if (reactions.length === 0) return null;

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
                                  : "bg-[hsl(220,10%,94%)] border-[hsl(220,10%,85%)] text-[hsl(220,10%,40%)] hover:bg-[hsl(220,10%,90%)]"
                              )}
                            >
                              <span>{r.emoji}</span>
                              <span className="text-[11px] font-medium">{r.count}</span>
                            </button>
                          ))}

                          {/* Hover add-reaction trigger — only when reactions row is visible */}
                          <span className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-75">
                            {ALLOWED_EMOJIS.filter(
                              (e) => !reactions.some((r) => r.emoji === e && r.reacted)
                            ).map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => toggleReaction(msg.id, emoji)}
                                className="text-xs px-1 py-0.5 rounded hover:bg-[hsl(220,10%,92%)] text-[hsl(220,10%,55%)] hover:text-[hsl(220,10%,30%)] transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Thread reply trigger */}
                    {!msg.is_deleted && !isEditing && !isAnnouncements && onThreadOpen && replyCount > 0 && (
                      <button
                        onClick={() => onThreadOpen({ ...msg, reply_count: replyCount })}
                        className="flex items-center gap-1.5 mt-1 text-[11px] transition-all duration-75 text-primary hover:text-primary/80"
                      >
                        <MessageSquare className="h-3 w-3" />
                        {replyCount} {replyCount === 1 ? "reply" : "replies"}
                      </button>
                    )}
                  </div>
                </div>
              </ContextMenuTrigger>

              {/* Right-click context menu */}
              <ContextMenuContent className="min-w-[120px]">
                {menuActions(ContextMenuItem)}
              </ContextMenuContent>
            </ContextMenu>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-4 shrink-0" />
      </div>

      {/* Jump to latest */}
      {showJumpToLatest && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={jumpToLatest}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-[hsl(220,10%,80%)] text-[hsl(220,15%,18%)] text-xs font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.1),0_0_0_1px_rgba(59,130,246,0.08)] hover:bg-[hsl(220,10%,97%)] active:scale-95 transition-all"
          >
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
            New messages
          </button>
        </div>
      )}

      {/* Typing indicator */}
      {typingText && (
        <div className="px-5 py-1 flex items-center gap-1.5">
          <span className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-primary/50 animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 rounded-full bg-primary/50 animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 rounded-full bg-primary/50 animate-bounce [animation-delay:300ms]" />
          </span>
          <span className="text-[11px] text-[hsl(220,10%,45%)]">{typingText}…</span>
        </div>
      )}

      {/* Composer */}
      {isMuted ? (
        <div className="pt-3 border-t border-[hsl(220,10%,85%)] mt-2 px-4">
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-[13px] text-amber-700">
              You are timed out until {muteExpiresAt ? new Date(muteExpiresAt).toLocaleString() : "later"}.
            </p>
          </div>
        </div>
      ) : isRoomLocked && !canModerate ? (
        <div className="pt-3 border-t border-[hsl(220,10%,85%)] mt-2">
          <p className="text-[13px] text-[hsl(220,10%,45%)] text-center py-2">
            This room is locked by a moderator.
          </p>
        </div>
      ) : canPost ? (
        <div className="px-5 pb-4 pt-2 bg-[hsl(220,14%,94%)] border-t border-[hsl(220,12%,88%)]">
          {isTradeRecaps ? (
            <TradeRecapForm onSubmit={handleSend} sending={sending} />
          ) : (
            <div className="space-y-2">
              {/* Template chips */}
              <div className="flex items-center gap-1 px-1">
              {[
                  { label: "Log Trade", emoji: "📋", action: () => navigate("/academy/trade") },
                  { label: "Ask Question", emoji: "❓", action: () => window.dispatchEvent(new CustomEvent("toggle-coach-drawer")) },
                  { label: "Share Win", emoji: "🏆", action: () => onSwitchTab?.("wins") },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={chip.action}
                    className="text-[11px] text-[hsl(220,10%,50%)] hover:text-[hsl(220,10%,25%)] px-2 py-0.5 rounded-md hover:bg-[hsl(220,10%,92%)] transition-colors font-medium"
                  >
                    {chip.emoji} {chip.label}
                  </button>
                ))}
              </div>

              {/* Reply preview bar */}
              {replyingTo && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[hsl(220,12%,90%)] border-l-2 border-l-primary">
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-primary">Replying to {replyingTo.user_name}</span>
                    <p className="text-[11px] text-[hsl(220,10%,45%)] truncate">{replyingTo.body.slice(0, 80)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="shrink-0 p-1 rounded-md text-[hsl(220,10%,50%)] hover:text-[hsl(220,10%,20%)] hover:bg-[hsl(220,10%,85%)] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Composer bar — with drag-and-drop support */}
              <div
                data-chat-composer
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={cn(
                  "relative rounded-xl bg-white border shadow-[0_1px_4px_rgba(0,0,0,0.06)] focus-within:border-primary focus-within:shadow-[0_0_0_2px_hsl(217_91%_60%/0.15),0_1px_4px_rgba(0,0,0,0.06)] transition-all duration-100",
                  dragOver
                    ? "border-primary shadow-[0_0_0_2px_hsl(217_91%_60%/0.2),0_1px_4px_rgba(0,0,0,0.06)]"
                    : "border-[hsl(220,10%,80%)]"
                )}
              >
                {/* Drop overlay */}
                {dragOver && (
                  <div className="absolute inset-0 rounded-xl bg-primary/[0.06] flex items-center justify-center z-10 pointer-events-none">
                    <span className="text-[13px] font-semibold text-primary">Drop files to attach</span>
                  </div>
                )}
                <div className="flex items-end gap-2 px-3 py-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,application/pdf,video/mp4"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  {/* Left icon row */}
                  <div className="flex items-center gap-0.5 pb-0.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="p-1.5 rounded-lg text-[hsl(220,10%,55%)] hover:text-[hsl(220,10%,30%)] hover:bg-[hsl(220,10%,94%)] transition-colors"
                      title="Attach file"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                    </button>
                    <EmojiPicker onSelect={handleEmojiSelect} />
                  </div>

                  {/* Textarea — light input surface */}
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={handleDraftChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message…"
                    maxLength={1000}
                    disabled={sending}
                    rows={1}
                    className="flex-1 bg-transparent text-[14px] text-[hsl(220,15%,15%)] placeholder:text-[hsl(220,10%,60%)] resize-none outline-none min-h-[26px] max-h-[120px] leading-relaxed py-1 caret-primary"
                  />

                  {/* Send button — premium Vault blue */}
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={(!draft.trim() && !uploading) || sending}
                    className={cn(
                      "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-100",
                      draft.trim() && !sending
                        ? "bg-gradient-to-b from-[hsl(217,91%,60%)] to-[hsl(217,91%,50%)] text-white shadow-[0_2px_10px_hsl(217_91%_60%/0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110 active:scale-95"
                        : "text-[hsl(220,10%,78%)] cursor-not-allowed"
                    )}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <SendHorizontal className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="pt-3 border-t border-[hsl(220,10%,85%)] mt-2">
          <p className="text-[13px] text-[hsl(220,10%,45%)] text-center py-2">
            This room is read-only for students.
          </p>
        </div>
      )}
    </div>
    {lightboxImage && (
      <ImageLightbox
        src={lightboxImage.src}
        alt={lightboxImage.alt}
        filename={lightboxImage.filename}
        onClose={() => setLightboxImage(null)}
      />
    )}
    </>
  );
}

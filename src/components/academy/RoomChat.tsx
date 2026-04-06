import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { ImageLightbox } from "./community/ImageLightbox";
import { DateSeparator, getDateLabel, shouldShowDateSeparator } from "./community/DateSeparator";
import { useRoomMessages, type Attachment } from "@/hooks/useRoomMessages";
import { useAuth } from "@/hooks/useAuth";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMessageReactions, QUICK_EMOJIS, type ReactionEmoji } from "@/hooks/useMessageReactions";
import { useChatProfiles } from "@/hooks/useChatProfiles";
import { useChatModeration } from "@/hooks/useChatModeration";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { useMentionAutocomplete, parseMentions, getMentionLabel, getMentionInsertText, type MentionUser } from "@/hooks/useMentionAutocomplete";
import { ChatAvatar } from "@/lib/chatAvatars";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { UserProfileCard } from "./community/UserProfileCard";
import { Button } from "@/components/ui/button";
import { Loader2, SendHorizontal, Send, ChevronUp, ChevronDown as ChevronDownIcon, Paperclip, Megaphone, Pencil, Trash2, X, Check, MoreHorizontal, Copy, Pin, PinOff, Lock, Unlock, Clock, ShieldAlert, MessageSquare, ArrowDown, AtSign, FileText } from "lucide-react";
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
import { SignalPostForm } from "./chat/SignalPostForm";
import { SignalCard, type SignalAttachment } from "./chat/SignalCard";
import { EmojiPicker } from "./chat/EmojiPicker";
import { EmojiReactionPicker } from "./chat/EmojiReactionPicker";
import { GifPicker } from "./chat/GifPicker";
import { ChatEffects } from "./chat/ChatEffects";
import { LinkPreviewCard } from "./chat/LinkPreviewCard";
import { detectChatEffect, type ChatEffectType } from "@/lib/chatEffects";
import { supabase } from "@/integrations/supabase/client";
import logTradeEmoji from "@/assets/emoji/log-trade.svg";
import askQuestionEmoji from "@/assets/emoji/ask-question.svg";
import shareWinEmoji from "@/assets/emoji/share-win.svg";
import reactionThumbsUpEmoji from "@/assets/emoji/reaction-thumbs-up.svg";
import reactionFireEmoji from "@/assets/emoji/reaction-fire.svg";
import reactionSkullEmoji from "@/assets/emoji/reaction-skull.svg";
import { hapticNotification, playMessageSound } from "@/lib/nativeFeedback";
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
  /** When false, defers data fetch and realtime subscriptions until first activated. Default true. */
  active?: boolean;
  /** When true, constrains uploaded image height for full-width layouts (non-Chat tabs). */
  compact?: boolean;
}

/* ── helpers ── */

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;
function extractFirstUrl(text: string): string | null {
  const m = text.match(URL_REGEX);
  return m?.[0] || null;
}

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  advanced:     { label: "Advanced",     cls: "bg-purple-500/15 text-purple-300 border-purple-500/20" },
  professional: { label: "Advanced",     cls: "bg-purple-500/15 text-purple-300 border-purple-500/20" },
  veteran:      { label: "Advanced",     cls: "bg-purple-500/15 text-purple-300 border-purple-500/20" },
  intermediate: { label: "Intermediate", cls: "bg-blue-500/15 text-blue-300 border-blue-500/20" },
  active:       { label: "Intermediate", cls: "bg-blue-500/15 text-blue-300 border-blue-500/20" },
  beginner:     { label: "Beginner",     cls: "bg-white/[0.06] text-muted-foreground border-white/[0.08]" },
  newbie:       { label: "Beginner",     cls: "bg-white/[0.06] text-muted-foreground border-white/[0.08]" },
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

const REACTION_EMOJI_ICON: Record<ReactionEmoji, string> = {
  "👍": reactionThumbsUpEmoji,
  "🔥": reactionFireEmoji,
  "💀": reactionSkullEmoji,
};

function renderReactionEmoji(emoji: string, className = "h-3.5 w-3.5") {
  const src = REACTION_EMOJI_ICON[emoji as ReactionEmoji];
  if (!src) return <span className="leading-none">{emoji}</span>;
  return <img src={src} alt="" className={cn("shrink-0", className)} />;
}

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
    <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] mt-2 overflow-hidden max-w-full sm:max-w-[560px] hover:border-white/[0.12] transition-colors">
      <div className="flex">
        {/* Left — Fields */}
        <div className="flex-1 min-w-0 p-5 space-y-3">
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">Trade Setup</p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            {fields.map((f, i) => (
              <div key={i} className={
                ["thesis", "lesson", "lesson learned", "notes"].includes(f.label.toLowerCase()) ? "col-span-2" : ""
              }>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{f.label}</span>
                <p className="text-[15px] text-foreground font-medium mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Chart image */}
        {imageAtt && (
          <div className="shrink-0 bg-white/[0.03] border-t sm:border-t-0 sm:border-l border-white/[0.06] w-full sm:max-w-[280px]">
            <img
              src={(imageAtt as any).url}
              alt="Chart"
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex items-center gap-1 px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3.5 py-2 rounded-xl hover:bg-white/[0.06] font-medium">
          Ask Coach
        </button>
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3.5 py-2 rounded-xl hover:bg-white/[0.06] font-medium">
          Log Trade
        </button>
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3.5 py-2 rounded-xl hover:bg-white/[0.06] font-medium">
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
    <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-5 space-y-3 mt-2 hover:border-white/[0.12] transition-colors max-w-full sm:max-w-[560px]">
      <p className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">Trade Post</p>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
        {fields.map((f, i) => (
          <div key={i} className={f.label === "Lesson" ? "col-span-2" : ""}>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{f.label}</span>
            <p className="text-[15px] text-foreground font-medium mt-0.5">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderMentions(text: string): React.ReactNode {
  // Split on @word patterns and highlight them
  const parts = text.split(/(@\w+)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (/^@\w+/.test(part)) {
      return (
        <span key={i} className="text-primary font-semibold">
          {part}
        </span>
      );
    }
    return part;
  });
}

function renderPlainBody(body: string) {
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
          return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline">{linkMatch[1]}</a>;
        }
        if (!part) return null;
        return <span key={i}>{renderMentions(part)}</span>;
      });
    }

    // Bold markdown + raw URLs
    const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s<>"')\]]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <span key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</span>;
      }
      if (/^https?:\/\//.test(part)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline">{part}</a>;
      }
      return <span key={i}>{renderMentions(part)}</span>;
    });
  };

  const restText = restLines.join("\n").trim();

  // Detect Discord-style reply: quote starts with **@username:**
  const quoteText = quoteLines.join(" ");
  const replyMatch = quoteText.match(/^\*\*@([^:]+):\*\*\s*(.*)$/);
  const isReplyQuote = quoteLines.length > 0 && replyMatch;

  return (
    <>
      {isReplyQuote && (
        <div className="flex items-center gap-1.5 ml-0 mb-0.5 relative pl-6">
          {/* Connector arm */}
          <div className="absolute left-[7px] top-[3px] w-[14px] h-[12px] border-l-2 border-t-2 border-muted-foreground/30 rounded-tl-md" />
          <div className="flex items-center gap-1 text-[12px] text-muted-foreground truncate max-w-[85%] cursor-pointer hover:text-foreground/70 transition-colors">
            <div className="w-4 h-4 rounded-full bg-primary/20 shrink-0 flex items-center justify-center">
              <span className="text-[8px] font-bold text-primary">@</span>
            </div>
            <span className="font-semibold text-primary/80 shrink-0">{replyMatch[1]}</span>
            <span className="truncate">{replyMatch[2] || "Click to see message"}</span>
          </div>
        </div>
      )}
      {!isReplyQuote && quoteLines.length > 0 && (
        <div className="border-l-2 pl-2.5 py-1 mb-1.5 rounded-r-md text-[12px] leading-snug border-muted-foreground/30 bg-white/[0.02] text-muted-foreground">
          {renderInline(quoteText)}
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

export function RoomChat({ roomSlug, canPost, isAnnouncements = false, onThreadOpen, onSwitchTab, active = true, compact = false }: RoomChatProps) {
  const navigate = useNavigate();
  // Track if this tab has ever been activated — once true, stays true to keep subscriptions alive
  const hasBeenActive = useRef(false);
  const prevActiveRef = useRef(active);
  if (active) hasBeenActive.current = true;
  const shouldLoad = hasBeenActive.current;

  // Bump a counter to force useRoomMessages to re-fetch when tab is re-activated
  const [activationCount, setActivationCount] = useState(0);
  useEffect(() => {
    // Detect transition from inactive → active (not the initial mount)
    if (active && !prevActiveRef.current && hasBeenActive.current) {
      setActivationCount((c) => c + 1);
    }
    prevActiveRef.current = active;
  }, [active]);

  const { messages, loading, hasMore, loadMore, sendMessage, sending, error, editMessage, deleteMessage } =
    useRoomMessages(shouldLoad ? roomSlug : "__deferred__", activationCount);
  const { user, profile, userRole: authUserRole } = useAuth();
  const {
    canModerate, isRoomLocked, isMuted, muteExpiresAt,
    pinnedMessageId, timeoutUser, lockRoom, unlockRoom,
    pinMessage, unpinMessage, moderatorDelete,
  } = useChatModeration(roomSlug);

  const isOperator = authUserRole?.role === "operator";

  const { isCEO, isAdmin, isOperator: isAcademyOperator } = useAcademyPermissions();
  const canMention = !!user;
  const canPingEveryone = isCEO || isAdmin || isAcademyOperator || isOperator;
  const {
    suggestions, mentionStart, selectedIndex, setSelectedIndex,
    updateMentionState, clearSuggestions,
  } = useMentionAutocomplete({ enabled: canMention, canPingEveryone });

  const displayName =
    (profile as any)?.display_name ||
    (profile as any)?.username ||
    user?.email?.split("@")[0] ||
    "Anonymous";

  const mentionTargets = useMemo(() => {
    const targets: string[] = [];
    const username = (profile as any)?.username;
    const display = (profile as any)?.display_name;
    if (username) targets.push(username);
    if (display) targets.push(display.replace(/\s+/g, ""));
    if (user?.email) targets.push(user.email.split("@")[0]);
    return [...new Set(targets.filter(Boolean))];
  }, [profile, user]);

  const { typingText, broadcastTyping } = useTypingIndicator(roomSlug, user?.id, displayName);
  const { trackMessages, getReactions, toggleReaction } = useMessageReactions(roomSlug, user?.id);
  const { ensureProfiles, getProfile } = useChatProfiles();
  const lastNotifiedRef = useRef<string | null>(null);
  const hasInitializedNotify = useRef(false);

  // Track visible message IDs for reaction fetching + fetch profiles
  useEffect(() => {
    if (messages.length > 0) {
      trackMessages(messages.map((m) => m.id));
      const uniqueUserIds = [...new Set(messages.map((m) => m.user_id))];
      ensureProfiles(uniqueUserIds);
    }
  }, [messages, trackMessages, ensureProfiles]);

  useEffect(() => {
    if (!active || messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (!latest || latest.id.startsWith("optimistic-")) return;
    if (!hasInitializedNotify.current) {
      lastNotifiedRef.current = latest.id;
      hasInitializedNotify.current = true;
      return;
    }
    if (latest.id === lastNotifiedRef.current) return;
    lastNotifiedRef.current = latest.id;
    if (latest.user_id === user?.id) return;

    const isRz = /^rz\b/i.test(latest.user_name || "");
    const isMentioned =
      /@everyone\b/i.test(latest.body || "") ||
      (mentionTargets.length > 0 &&
        new RegExp(`@(${mentionTargets.map(escapeRegex).join("|")})\\b`, "i").test(latest.body || ""));
    const shouldBuzz = isRz || isMentioned;

    void playMessageSound();
    if (shouldBuzz) {
      void hapticNotification();
    }
  }, [active, messages, mentionTargets, user?.id]);

  const [draft, setDraft] = useState("");
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string; filename?: string } | null>(null);
  const dragDepthRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const seenMessageCount = useRef(0);
  const initialScrollDone = useRef(false);
  const userScrolledRef = useRef(false);
  const autoScrollingRef = useRef(false);
  const savedScrollRef = useRef<number | null>(null);
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
  const [chatEffect, setChatEffect] = useState<ChatEffectType>(null);
  const isComposing = isComposerFocused || draft.trim().length > 0;
  const scrollToBottomInstant = useCallback(() => {
    const el = containerRef.current;
    autoScrollingRef.current = true;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    bottomRef.current?.scrollIntoView({ block: "end" });
    setShowJumpToLatest(false);
    seenMessageCount.current = messages.length;
    requestAnimationFrame(() => {
      autoScrollingRef.current = false;
    });
  }, [messages.length]);

  const handleDraftChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setDraft(val);
      broadcastTyping();
      // Update mention autocomplete
      const cursor = e.target.selectionStart ?? val.length;
      updateMentionState(val, cursor);
    },
    [broadcastTyping, updateMentionState]
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

  // ── Save scroll position when tab/page hides ──
  useEffect(() => {
    const savePosition = () => {
      const el = containerRef.current;
      if (el) savedScrollRef.current = el.scrollTop;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") savePosition();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Save scroll when active prop goes false (switching community tabs)
  useEffect(() => {
    if (!active) {
      const el = containerRef.current;
      if (el) savedScrollRef.current = el.scrollTop;
    }
  }, [active]);

  // ── New messages arrived ──
  useEffect(() => {
    if (shouldAutoScroll.current && messages.length > 0) {
      scrollToBottomInstant();
      return;
    }
    if (messages.length > seenMessageCount.current && seenMessageCount.current > 0) {
      setShowJumpToLatest(true);
    }
  }, [messages.length, scrollToBottomInstant]);

  // ── Initial scroll on first activation ──
  useEffect(() => {
    if (!active || messages.length === 0) return;
    if (initialScrollDone.current) return;
    initialScrollDone.current = true;
    shouldAutoScroll.current = true;
    scrollToBottomInstant();
    requestAnimationFrame(() => scrollToBottomInstant());
    setTimeout(scrollToBottomInstant, 50);
  }, [active, messages.length, scrollToBottomInstant]);

  // ── Re-activation: restore saved position instead of forcing bottom ──
  useEffect(() => {
    if (!active || loading || !initialScrollDone.current) return;
    if (userScrolledRef.current && savedScrollRef.current !== null) {
      const el = containerRef.current;
      if (el) {
        autoScrollingRef.current = true;
        el.scrollTop = savedScrollRef.current;
        requestAnimationFrame(() => { autoScrollingRef.current = false; });
      }
      return;
    }
    if (!userScrolledRef.current) {
      shouldAutoScroll.current = true;
      scrollToBottomInstant();
    }
  }, [active, loading, scrollToBottomInstant]);

  useEffect(() => {
    initialScrollDone.current = false;
    userScrolledRef.current = false;
    savedScrollRef.current = null;
  }, [roomSlug]);

  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (shouldAutoScroll.current && !userScrolledRef.current) {
        scrollToBottomInstant();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [active, scrollToBottomInstant]);

  // Removed: [loading] scroll effect — redundant with SWR cache and causes layout jump on mount

  const handleScroll = useCallback(() => {
    if (autoScrollingRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    savedScrollRef.current = el.scrollTop;
    if (!atBottom) userScrolledRef.current = true;
    shouldAutoScroll.current = atBottom;
    if (atBottom) {
      userScrolledRef.current = false;
      seenMessageCount.current = messages.length;
      setShowJumpToLatest(false);
    }
  }, [messages.length]);

  const jumpToLatest = () => {
    userScrolledRef.current = false;
    shouldAutoScroll.current = true;
    scrollToBottomInstant();
  };

  const selectMention = useCallback(
    (item: (typeof suggestions)[0]) => {
      const insertText = 'type' in item && item.type === "everyone"
        ? "everyone"
        : getMentionInsertText(item as MentionUser);
      const before = draft.slice(0, mentionStart);
      const after = draft.slice(textareaRef.current?.selectionStart ?? draft.length);
      const newDraft = `${before}@${insertText} ${after}`;
      setDraft(newDraft);
      clearSuggestions();
      requestAnimationFrame(() => {
        const pos = before.length + insertText.length + 2; // +2 for @ and space
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(pos, pos);
      });
    },
    [draft, mentionStart, clearSuggestions, suggestions]
  );

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
    clearSuggestions();
    shouldAutoScroll.current = true;
    const result = await sendMessage(body, attachments);

    // Trigger local chat effect Easter egg
    const effect = detectChatEffect(body);
    if (effect) setChatEffect(effect);

    // Create mention notifications for all users who can mention
    if (result?.ok && canMention && user) {
      try {
        const allUsers = (await import("@/hooks/useMentionAutocomplete")).parseMentions
          ? undefined : undefined;
        // Fetch users via secure RPC for parsing
        const { data: profilesData } = await supabase.rpc("get_mention_users");
        const userList: MentionUser[] = (profilesData ?? []).map((r: any) => ({
          user_id: r.user_id,
          display_name: r.display_name,
          username: r.username,
          avatar_url: null,
        }));
        const { mentionedUserIds, hasEveryone } = parseMentions(body, userList);
        const senderName = displayName;
        const preview = body.length > 80 ? body.slice(0, 80) + "…" : body;

        if (hasEveryone && canPingEveryone) {
          // Broadcast notification (user_id: null)
          await supabase.from("academy_notifications").insert({
            user_id: null,
            type: "mention",
            title: `${senderName} mentioned @everyone in #${roomSlug}`,
            body: preview,
            link_path: "/academy/community",
          } as any);
        }

        // Individual mention notifications
        for (const uid of mentionedUserIds) {
          if (uid === user.id) continue; // Don't notify yourself
          await supabase.from("academy_notifications").insert({
            user_id: uid,
            type: "mention",
            title: `${senderName} mentioned you in #${roomSlug}`,
            body: preview,
            link_path: "/academy/community",
          } as any);
        }
      } catch (err) {
        console.error("Failed to create mention notifications:", err);
      }
    }
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
    // Mention autocomplete navigation
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((selectedIndex + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((selectedIndex - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        selectMention(suggestions[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        clearSuggestions();
        return;
      }
    }

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
    if (msg.is_deleted) return false;
    if ((msg as any).parent_message_id) return false;
    return true;
  }), [messages]);


  if (loading) {
    return (
      <div className="flex flex-col h-full w-full bg-background">
      <div className="flex-1 overflow-hidden px-3 py-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-full bg-white/[0.06] shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-24 rounded bg-white/[0.06]" />
                <div className="h-3 rounded bg-white/[0.08]" style={{ width: `${40 + (i % 3) * 20}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="h-14 border-t border-white/[0.06] bg-card" />
      </div>
    );
  }

  return (
    <>
    <div className={cn("relative flex flex-col h-full w-full bg-background", chatEffect === "shake" && "animate-chat-shake")}>
      {/* Chat effects overlay */}
      <ChatEffects activeEffect={chatEffect} onComplete={() => setChatEffect(null)} />
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
        className="flex-1 overflow-y-auto overflow-x-hidden vault-chat-scroll"
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
            <Button variant="ghost" size="sm" onClick={lockRoom} className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-foreground">
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
                <p className="text-xs text-foreground/70 truncate">{pinned.body}</p>
              </div>
               {canModerate && (
                <button onClick={unpinMessage} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })()}

        {hasMore && (
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="sm" onClick={loadMore} className="gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronUp className="h-3 w-3" />
              Load older
            </Button>
          </div>
        )}

        {messages.length === 0 && (
           <div className="text-center py-16 max-w-xs mx-auto space-y-2">
            {roomSlug === "options-lounge" ? (
              <>
                <p className="text-sm font-medium text-foreground/70">No posts yet.</p>
                <p className="text-xs text-muted-foreground">Serious traders post 1 trade/week. Use Trade → Post a Trade.</p>
              </>
            ) : roomSlug === "trade-recaps" ? (
              <>
                <p className="text-sm font-medium text-foreground/70">Proof is earned.</p>
                <p className="text-xs text-muted-foreground">Post screenshot + ticker + entry/exit + risk.</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
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

          const copyMessage = async () => {
            const { copyToClipboard } = await import("@/lib/copyToClipboard");
            const ok = await copyToClipboard(msg.body);
            ok ? toast.success("Copied to clipboard") : toast.error("Failed to copy");
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
                    "group relative flex gap-3 px-4 hover:bg-white/[0.04] transition-colors duration-75",
                    startsNewGroup ? "pt-3 pb-1" : (isGroupedWithNext ? "py-0.5" : "pt-0.5 pb-1"),
                    startsNewGroup && "mt-1",
                    isEditing && "bg-white/[0.04]",
                    isCeoOrAdmin && "border-l-2 border-l-amber-500/40",
                    isOfficialAnnouncement && "bg-amber-500/[0.04]"
                  )}
                >
                  {/* Avatar column — compact on grouped follow-ups */}
                  <div className={cn("w-9 shrink-0", startsNewGroup ? "h-9" : "h-5")}>
                    {showHdr ? (
                      msgProfile ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                              <ChatAvatar
                                avatarUrl={msgProfile.avatar_url}
                                userName={msg.user_name}
                                size="h-9 w-9"
                              />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="right" align="start" sideOffset={8} className="p-0 border-0 bg-transparent shadow-none w-auto">
                            <UserProfileCard userId={msg.user_id} onClose={() => {}} />
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-white/[0.06] animate-pulse" />
                      )
                    ) : (
                      <span className="hidden group-hover:flex items-center justify-center h-5 text-[10px] text-muted-foreground select-none">
                        {formatTime(msg.created_at)}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {showHdr && (
                      <div className="flex items-center gap-2 mb-0.5 min-h-[22px]">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className={cn(
                              "text-[13px] font-semibold tracking-[-0.01em] hover:underline cursor-pointer focus:outline-none",
                              isCeoOrAdmin ? "text-amber-400" : "text-foreground"
                            )}>
                              {msg.user_name}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="right" align="start" sideOffset={8} className="p-0 border-0 bg-transparent shadow-none w-auto">
                            <UserProfileCard userId={msg.user_id} onClose={() => {}} />
                          </PopoverContent>
                        </Popover>
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
                          <div className="h-4 w-16 rounded bg-white/[0.06] animate-pulse" />
                         )}
                         <span className="text-[11px] text-muted-foreground">
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
                             <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                               {renderPlainBody(msg.body.replace(/^📢\s*/, ""))}
                             </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Soft-deleted message */}
                     {msg.is_deleted ? (
                      <div className="inline-block max-w-[85%]">
                        <div className="bg-white/[0.04] rounded-xl px-3.5 py-2 border border-white/[0.06]">
                          <p className="text-[13px] text-muted-foreground italic">This message was deleted.</p>
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
                          className="w-full bg-card border border-white/[0.08] rounded-lg px-3 py-1.5 text-[16px] md:text-sm text-foreground resize-none outline-none focus:ring-1 focus:ring-primary/40 min-h-[32px] max-h-[120px] leading-relaxed"
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
                            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="h-3 w-3" /> Cancel
                          </button>
                          <span className="text-[10px] text-muted-foreground">esc to cancel · enter to save</span>
                        </div>
                      </div>
                    ) : (() => {
                      const signalAtt = msg.attachments?.find((a: any) => a.type === "signal-watchlist" || a.type === "signal-live") as unknown as SignalAttachment | undefined;
                      if (signalAtt) {
                        const chartAtt = msg.attachments?.find((a: any) => a.type === "image");
                        return (
                          <SignalCard
                            signal={signalAtt}
                            chartImageUrl={chartAtt?.url}
                            userName={msg.user_name}
                            userRole={msg.user_role}
                            createdAt={msg.created_at}
                            onImageClick={(src) => setLightboxImage({ src, alt: "Chart", filename: "chart" })}
                          />
                        );
                      }
                      return null;
                    })() || (isRecap ? (
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
                             <p className="text-[15px] text-foreground/90 leading-relaxed whitespace-pre-line">
                               {renderPlainBody(msg.body)}
                             </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.body && msg.body !== "📎 Attachment" && (
                          <div className={startsNewGroup ? "mt-0.5" : "mt-0"}>
                            <p className="text-[14px] md:text-[13px] leading-[1.55] whitespace-pre-line text-foreground">
                              {renderPlainBody(msg.body)}
                            </p>
                            {msg.edited_at && (new Date(msg.edited_at).getTime() - new Date(msg.created_at).getTime() > 10000) && (
                              <span className="text-[10px] mt-0.5 block text-muted-foreground">(edited)</span>
                            )}
                          </div>
                        )}
                        {/* Link preview */}
                        {(() => {
                          const firstUrl = extractFirstUrl(msg.body);
                          return firstUrl ? <LinkPreviewCard url={firstUrl} /> : null;
                        })()}
                      </>
                    ))}


                    {!msg.is_deleted && msg.attachments && msg.attachments.length > 0 && (() => {
                      const hasSignal = msg.attachments.some((a: any) => a.type === "signal-watchlist" || a.type === "signal-live");
                      const displayAtts = hasSignal
                        ? msg.attachments.filter((a: any) => a.type !== "signal-watchlist" && a.type !== "signal-live" && a.type !== "image")
                        : msg.attachments;
                      if (displayAtts.length === 0) return null;
                      return (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {displayAtts.map((att: Attachment, idx: number) =>
                          att.type === "image" ? (() => {
                            const isGif = att.mime === "image/gif" || att.filename === "gif";
                            return (
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
                                  className={cn(
                                    "rounded-xl w-auto h-auto object-contain cursor-pointer transition-all",
                                    isGif
                                      ? "max-w-[240px] max-h-[200px]"
                                      : cn("max-w-full sm:max-w-[360px] border border-white/[0.08] hover:border-white/[0.15] hover:shadow-md", compact && "max-h-[300px]")
                                  )}
                                />
                                {!isGif && (
                                  <span className="text-[10px] text-muted-foreground mt-0.5 block truncate max-w-full">{att.filename}</span>
                                )}
                              </button>
                            );
                          })() : (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={att.filename}
                              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 hover:bg-white/[0.08] transition-colors"
                            >
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-foreground truncate max-w-[200px]">{att.filename}</p>
                                <p className="text-[10px] text-muted-foreground">
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
                      );
                    })()}

                    {/* Hover action bar — Discord-style floating toolbar, absolutely positioned to avoid reflow */}
                    {!msg.is_deleted && !isEditing && (
                      <div className="absolute -top-4 right-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-75 z-10">
                        <div className="flex items-center gap-0.5 rounded-lg bg-card border border-white/[0.08] shadow-md px-1 py-0.5">
                          {/* Quick reactions */}
                          {!isAnnouncements && QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className="px-1.5 py-1 rounded-md hover:bg-white/[0.08] transition-colors"
                              title={`React ${emoji}`}
                            >
                              {renderReactionEmoji(emoji)}
                            </button>
                          ))}
                          {/* Full emoji picker */}
                          {!isAnnouncements && (
                            <EmojiReactionPicker onSelect={(e) => toggleReaction(msg.id, e)} />
                          )}
                          {/* Reply */}
                          {!isAnnouncements && onThreadOpen && (
                            <button
                              type="button"
                              onClick={() => onThreadOpen({ ...msg, reply_count: replyCount })}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors"
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
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors"
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
                              onClick={() => toggleReaction(msg.id, r.emoji)}
                              className={cn(
                                "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition-colors",
                                r.reacted
                                  ? "bg-primary/15 border-primary/30 text-primary"
                                  : "bg-white/[0.06] border-white/[0.08] text-muted-foreground hover:bg-white/[0.1]"
                              )}
                            >
                              {renderReactionEmoji(r.emoji)}
                              <span className="text-[11px] font-medium">{r.count}</span>
                            </button>
                          ))}

                          {/* Hover add-reaction trigger */}
                          <span className="inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-75">
                            <EmojiReactionPicker
                              onSelect={(e) => toggleReaction(msg.id, e)}
                              triggerClassName="px-1 py-0.5 rounded text-muted-foreground hover:text-foreground"
                            />
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
        <div ref={bottomRef} className="h-8 shrink-0" />
      </div>

      {/* Jump to latest */}
      {showJumpToLatest && !isComposing && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={jumpToLatest}
            className="group flex items-center gap-1.5 rounded-full border border-primary/35 bg-card/95 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-[0_6px_18px_rgba(0,0,0,0.35)] backdrop-blur transition-all hover:border-primary/55 hover:bg-white/[0.08] active:scale-95"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary/90" />
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
          <span className="text-[11px] text-muted-foreground">{typingText}…</span>
        </div>
      )}

      {/* Composer */}
      {isMuted ? (
         <div className="pt-3 border-t border-white/[0.06] mt-2 px-4">
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-[13px] text-amber-400">
              You are timed out until {muteExpiresAt ? new Date(muteExpiresAt).toLocaleString() : "later"}.
            </p>
          </div>
        </div>
      ) : isRoomLocked && !canModerate ? (
        <div className="pt-3 border-t border-white/[0.06] mt-2">
          <p className="text-[13px] text-muted-foreground text-center py-2">
            This room is locked by a moderator.
          </p>
        </div>
      ) : canPost ? (
        <div className="px-5 pt-2 bg-card border-t border-white/[0.06] pb-[calc(3.5rem+env(safe-area-inset-bottom,8px))] md:pb-4">
          {isTradeRecaps ? (
            <TradeRecapForm onSubmit={handleSend} sending={sending} />
          ) : roomSlug === "daily-setups" ? (
            <SignalPostForm onSubmit={handleSend} sending={sending} roomSlug={roomSlug} />
          ) : (
            <div className="relative space-y-2">
              {/* Template chips */}
              <div className="flex items-center justify-between gap-1 px-1">
                {[
                  { label: "Log Trade", emojiSrc: logTradeEmoji, action: () => navigate("/academy/trade") },
                  { label: "Ask Question", emojiSrc: askQuestionEmoji, action: () => window.dispatchEvent(new CustomEvent("toggle-coach-drawer")) },
                  { label: "Share Win", emojiSrc: shareWinEmoji, action: () => onSwitchTab?.("wins") },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={chip.action}
                    className="chat-quick-action inline-flex min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                  >
                    <img src={chip.emojiSrc} alt="" className="h-[14px] w-[14px] shrink-0" />
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>

              {/* Reply preview bar */}
              {replyingTo && (
                 <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border-l-2 border-l-primary">
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-primary">Replying to {replyingTo.user_name}</span>
                    <p className="text-[11px] text-muted-foreground truncate">{replyingTo.body.slice(0, 80)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Mention autocomplete dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-1 z-20">
                  <div className="mx-0 rounded-xl border border-white/[0.08] bg-card shadow-xl overflow-hidden max-h-[200px] overflow-y-auto">
                    {suggestions.map((item, idx) => {
                      const isEveryone = 'type' in item && item.type === "everyone";
                      const mentionUser = !isEveryone ? item as MentionUser : null;
                      return (
                        <button
                          key={isEveryone ? "everyone" : mentionUser!.user_id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); selectMention(item); }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                            idx === selectedIndex
                              ? "bg-primary/10 text-foreground"
                              : "text-foreground/80 hover:bg-white/[0.04]"
                          )}
                        >
                          {isEveryone ? (
                            <>
                              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <AtSign className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-primary">@everyone</span>
                                <span className="text-[11px] text-muted-foreground ml-2">Notify all members</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <ChatAvatar
                                avatarUrl={mentionUser!.avatar_url}
                                userName={getMentionLabel(mentionUser!)}
                                size="h-7 w-7"
                              />
                              <div className="min-w-0">
                                <span className="text-sm font-medium truncate block">{getMentionLabel(mentionUser!)}</span>
                                {mentionUser!.username && (
                                  <span className="text-[11px] text-muted-foreground">@{mentionUser!.username}</span>
                                )}
                              </div>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
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
                  "relative rounded-xl bg-card border shadow-[0_1px_4px_rgba(0,0,0,0.15)] focus-within:border-primary focus-within:shadow-[0_0_0_2px_hsl(217_91%_60%/0.15),0_1px_4px_rgba(0,0,0,0.15)] transition-all duration-100 max-w-full overflow-x-hidden",
                  dragOver
                    ? "border-primary shadow-[0_0_0_2px_hsl(217_91%_60%/0.2),0_1px_4px_rgba(0,0,0,0.15)]"
                    : "border-white/[0.08]"
                )}
              >
                {/* Drop overlay */}
                {dragOver && (
                  <div className="absolute inset-0 rounded-xl bg-primary/[0.06] flex items-center justify-center z-10 pointer-events-none">
                    <span className="text-[13px] font-semibold text-primary">Drop files to attach</span>
                  </div>
                )}
                <div className="flex items-end gap-2 px-3 py-2 min-w-0">
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
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
                      title="Attach file"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                    </button>
                    <EmojiPicker onSelect={handleEmojiSelect} />
                    <GifPicker onSelect={(gifUrl) => handleSend("", [{ type: "image", url: gifUrl, filename: "gif", size: 0, mime: "image/gif" }])} />
                  </div>

                  {/* Textarea — light input surface */}
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={handleDraftChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsComposerFocused(true)}
                    onBlur={() => setIsComposerFocused(false)}
                    placeholder="Type a message…"
                    maxLength={1000}
                    disabled={sending}
                    rows={1}
                    className="flex-1 min-w-0 w-full bg-transparent text-[16px] md:text-[14px] text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[26px] max-h-[120px] leading-relaxed py-1 caret-primary"
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
                        : "text-muted-foreground/50 cursor-not-allowed"
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
         <div className="pt-3 border-t border-white/[0.06] mt-2">
          <p className="text-[13px] text-muted-foreground text-center py-2">
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

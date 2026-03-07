import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, MessageSquare, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { ChatAvatar } from "@/lib/chatAvatars";
import { AcademyRoleBadge } from "@/components/academy/AcademyRoleBadge";
import { DmAttachmentRenderer } from "@/components/academy/dm/DmAttachmentRenderer";
import { DmFileUpload } from "@/components/academy/dm/DmFileUpload";
import rzAvatar from "@/assets/rz-avatar.png";
import {
  useDirectMessages,
  useThreadMessages,
  sendDmMessage,
  markThreadRead,
  DmThread,
  type DmAttachmentData,
} from "@/hooks/useDirectMessages";

/* ── Last message preview hook ── */
function useLastMessages(threadIds: string[]) {
  const [lastMsgs, setLastMsgs] = useState<Record<string, { body: string; sender_id: string; read_at: string | null }>>({});

  const fetchLast = useCallback(async () => {
    if (threadIds.length === 0) return;
    // Fetch the latest message per thread
    const results: Record<string, { body: string; sender_id: string; read_at: string | null }> = {};
    // Batch: get last 1 message per thread (use individual queries since we can't do DISTINCT ON via JS client)
    const promises = threadIds.map(async (tid) => {
      const { data } = await supabase
        .from("dm_messages")
        .select("body, sender_id, read_at")
        .eq("thread_id", tid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) results[tid] = data;
    });
    await Promise.all(promises);
    setLastMsgs(results);
  }, [threadIds.join(",")]);

  useEffect(() => { fetchLast(); }, [fetchLast]);

  return lastMsgs;
}

/* ── Unread count per thread hook ── */
function useUnreadCounts(threadIds: string[], adminId: string | undefined) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchCounts = useCallback(async () => {
    if (!adminId || threadIds.length === 0) return;
    const results: Record<string, number> = {};
    const promises = threadIds.map(async (tid) => {
      const { count } = await supabase
        .from("dm_messages")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", tid)
        .neq("sender_id", adminId)
        .is("read_at", null);
      results[tid] = count || 0;
    });
    await Promise.all(promises);
    setCounts(results);
  }, [threadIds.join(","), adminId]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  return counts;
}

/* ── Thread List ── */
function ThreadList({
  threads,
  loading,
  onSelect,
  lastMsgs,
  unreadCounts,
}: {
  threads: DmThread[];
  loading: boolean;
  onSelect: (t: DmThread) => void;
  lastMsgs: Record<string, { body: string; sender_id: string; read_at: string | null }>;
  unreadCounts: Record<string, number>;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 border border-primary/10">
          <MessageSquare className="h-6 w-6 text-primary/60" />
        </div>
        <p className="text-sm font-semibold text-foreground/80">No conversations yet</p>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-[220px]">
          When members reply to their welcome DM, conversations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {threads.map((t) => {
        const name = t.user_display_name || t.user_email || "Member";
        const last = lastMsgs[t.id];
        const unread = unreadCounts[t.id] || 0;
        const preview = last?.body
          ? last.body.length > 60 ? last.body.slice(0, 60) + "…" : last.body
          : null;

        return (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all"
          >
            <div className="relative shrink-0">
              <ChatAvatar
                avatarUrl={t.user_avatar_url}
                userName={name}
                size="h-9 w-9"
              />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-medium truncate ${unread > 0 ? "text-foreground" : "text-foreground/80"}`}>{name}</p>
                <p className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                </p>
              </div>
              {preview && (
                <p className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-foreground/70 font-medium" : "text-muted-foreground"}`}>
                  {preview}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── iOS-Style Thread Conversation ── */
function ThreadConversation({
  thread,
  onBack,
}: {
  thread: DmThread;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { messages, loading } = useThreadMessages(thread.id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const memberName = thread.user_display_name || thread.user_email || "Member";

  // Mark messages as read when viewing
  useEffect(() => {
    if (user?.id && thread.id) {
      markThreadRead(thread.id, user.id);
    }
  }, [user?.id, thread.id, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (extraAttachments?: DmAttachmentData[]) => {
    if ((!draft.trim() && !extraAttachments?.length) || !user?.id) return;
    setSending(true);
    const ok = await sendDmMessage(thread.id, user.id, draft.trim(), extraAttachments);
    if (ok) setDraft("");
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-1 pb-3 border-b border-white/[0.06]">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <ChatAvatar
          avatarUrl={thread.user_avatar_url}
          userName={memberName}
          size="h-8 w-8"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{memberName}</p>
          <p className="text-[10px] text-muted-foreground">Member</p>
        </div>
      </div>

      {/* ── Messages ── */}
      <ScrollArea className="flex-1 py-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No messages yet.</p>
        ) : (
          <div className="space-y-0.5 px-1">
            {messages.map((m, i) => {
              const isAdmin = m.sender_id !== thread.user_id;
              const prev = i > 0 ? messages[i - 1] : null;
              const next = i < messages.length - 1 ? messages[i + 1] : null;
              const sameSenderAsPrev = prev && prev.sender_id === m.sender_id;
              const sameSenderAsNext = next && next.sender_id === m.sender_id;
              const isLastInGroup = !sameSenderAsNext;
              const isFirstInGroup = !sameSenderAsPrev;

              // Admin = left (blue bubble), Member = right (neutral bubble)
              const bubbleColor = isAdmin
                ? "bg-[hsl(213,45%,22%)]"
                : "bg-white/[0.10]";

              // Asymmetric rounding for iOS tail effect
              let rounding = "rounded-2xl";
              if (isLastInGroup) {
                rounding = isAdmin
                  ? "rounded-2xl rounded-bl-md"
                  : "rounded-2xl rounded-br-md";
              }

              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2 ${isAdmin ? "justify-start" : "justify-end"} ${isFirstInGroup ? "mt-3" : "mt-0.5"}`}
                >
                  {/* Admin avatar (left side) */}
                  {isAdmin && (
                    <div className="w-7 shrink-0">
                      {isLastInGroup ? (
                        <img
                          src={rzAvatar}
                          alt="RZ"
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : null}
                    </div>
                  )}

                  {/* Bubble */}
                  <div className="max-w-[75%]">
                    <div className={`${bubbleColor} ${rounding} px-3.5 py-2 text-sm leading-relaxed shadow-[0_1px_3px_rgba(0,0,0,0.2)]`}>
                      <p className="whitespace-pre-wrap break-words text-foreground">{m.body}</p>
                      <DmAttachmentRenderer attachments={(m as any).attachments || []} />
                      {isLastInGroup && (
                        <p className="text-[10px] text-muted-foreground/50 mt-1">
                          {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    {/* Read receipt */}
                    {isAdmin && isLastInGroup && (() => {
                      const isLastAdminMsg = !next || next.sender_id === thread.user_id;
                      if (!isLastAdminMsg) return null;
                      if (m.read_at) {
                        return <p className="text-[10px] text-primary/60 mt-0.5 ml-1">Read</p>;
                      }
                      return <p className="text-[10px] text-muted-foreground/40 mt-0.5 ml-1">Delivered</p>;
                    })()}
                  </div>

                  {/* Member avatar (right side) */}
                  {!isAdmin && (
                    <div className="w-7 shrink-0">
                      {isLastInGroup ? (
                        <ChatAvatar
                          avatarUrl={thread.user_avatar_url}
                          userName={memberName}
                          size="h-7 w-7"
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* ── Pill Input ── */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a reply…"
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
          ) : (
            <Send className="h-4 w-4 text-primary-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Main Tab ── */
export function AdminDMsTab() {
  const { user } = useAuth();
  const { threads, loading, refetchThreads } = useDirectMessages();
  const [selected, setSelected] = useState<DmThread | null>(null);

  const threadIds = threads.map((t) => t.id);
  const lastMsgs = useLastMessages(threadIds);
  const unreadCounts = useUnreadCounts(threadIds, user?.id);

  // Realtime: auto-refresh thread list
  useEffect(() => {
    const channel = supabase
      .channel("admin-dm-threads-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_threads" },
        () => { refetchThreads(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refetchThreads]);

  return (
    <Card className="bg-white/[0.02] border-white/[0.06] p-4 min-h-[400px]">
      {selected ? (
        <ThreadConversation
          thread={selected}
          onBack={() => {
            setSelected(null);
            refetchThreads();
          }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Direct Messages</h3>
            <p className="text-xs text-muted-foreground">{threads.length} conversation{threads.length !== 1 ? "s" : ""}</p>
          </div>
          <ThreadList
            threads={threads}
            loading={loading}
            onSelect={setSelected}
            lastMsgs={lastMsgs}
            unreadCounts={unreadCounts}
          />
        </>
      )}
    </Card>
  );
}

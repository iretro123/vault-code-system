import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, MessageSquare, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import {
  useDirectMessages,
  useThreadMessages,
  sendDmMessage,
  markThreadRead,
  DmThread,
} from "@/hooks/useDirectMessages";

function ThreadList({
  threads,
  loading,
  onSelect,
}: {
  threads: DmThread[];
  loading: boolean;
  onSelect: (t: DmThread) => void;
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
        <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-foreground/80">No conversations yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          When members reply to their welcome DM, conversations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {threads.map((t) => {
        const name = t.user_display_name || t.user_email || "Member";
        const initials = name.slice(0, 2).toUpperCase();
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/[0.05] transition-colors"
          >
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

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
  const bottomRef = useRef<HTMLDivElement>(null);

  const name = thread.user_display_name || thread.user_email || "Member";

  // Mark messages as read when viewing
  useEffect(() => {
    if (user?.id && thread.id) {
      markThreadRead(thread.id, user.id);
    }
  }, [user?.id, thread.id, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!draft.trim() || !user?.id) return;
    setSending(true);
    const ok = await sendDmMessage(thread.id, user.id, draft.trim());
    if (ok) setDraft("");
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-1 pb-3 border-b border-white/[0.06]">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No messages yet.</p>
        ) : (
          <div className="space-y-3 px-1">
            {messages.map((m) => {
              const isAdmin = m.sender_id !== thread.user_id;
              return (
                <div
                  key={m.id}
                  className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isAdmin
                        ? "bg-primary/20 text-foreground"
                        : "bg-white/[0.06] text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a reply…"
          className="flex-1 bg-white/[0.04] border-white/[0.08] text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="h-9 w-9 shrink-0"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export function AdminDMsTab() {
  const { threads, loading, refetchThreads } = useDirectMessages();
  const [selected, setSelected] = useState<DmThread | null>(null);

  // Realtime: auto-refresh thread list when threads are updated
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
          <ThreadList threads={threads} loading={loading} onSelect={setSelected} />
        </>
      )}
    </Card>
  );
}

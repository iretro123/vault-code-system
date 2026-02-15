import { useState, useRef, useEffect } from "react";
import { useRoomMessages } from "@/hooks/useRoomMessages";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface RoomChatProps {
  roomSlug: string;
  canPost: boolean;
}

function TradeRecapForm({
  onSubmit,
  sending,
}: {
  onSubmit: (body: string) => Promise<void>;
  sending: boolean;
}) {
  const [ticker, setTicker] = useState("");
  const [whatIDid, setWhatIDid] = useState("");
  const [whatILearned, setWhatILearned] = useState("");

  const canSend = whatIDid.trim() && whatILearned.trim();

  const handleSubmit = async () => {
    if (!canSend || sending) return;
    const parts = [
      ticker.trim() ? `**Ticker:** ${ticker.trim()}` : null,
      `**What I did:** ${whatIDid.trim()}`,
      `**What I learned:** ${whatILearned.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");
    await onSubmit(parts);
    setTicker("");
    setWhatIDid("");
    setWhatILearned("");
  };

  return (
    <div className="space-y-2">
      <Input
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder="Ticker (optional)"
        maxLength={20}
        disabled={sending}
        className="text-sm"
      />
      <Textarea
        value={whatIDid}
        onChange={(e) => setWhatIDid(e.target.value)}
        placeholder="What I did *"
        maxLength={500}
        disabled={sending}
        rows={2}
        className="text-sm resize-none"
      />
      <Textarea
        value={whatILearned}
        onChange={(e) => setWhatILearned(e.target.value)}
        placeholder="What I learned *"
        maxLength={500}
        disabled={sending}
        rows={2}
        className="text-sm resize-none"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSend || sending}
          className="gap-1.5"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Post Recap
        </Button>
      </div>
    </div>
  );
}

function renderBody(body: string) {
  // Render **bold** segments
  const parts = body.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function RoomChat({ roomSlug, canPost }: RoomChatProps) {
  const { messages, loading, hasMore, loadMore, sendMessage, sending, error } =
    useRoomMessages(roomSlug);
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const isTradeRecaps = roomSlug === "trade-recaps";

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
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    shouldAutoScroll.current = atBottom;
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
    <div className="flex flex-col h-[calc(100vh-14rem)] md:h-[calc(100vh-12rem)] max-w-2xl">
      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-1 pr-1"
      >
        {hasMore && (
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="sm" onClick={loadMore} className="gap-1 text-xs">
              <ChevronUp className="h-3 w-3" />
              Load older
            </Button>
          </div>
        )}

        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages yet. Be the first to say something.
          </p>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.user_id === user?.id;
          const showName =
            i === 0 || messages[i - 1].user_id !== msg.user_id;

          return (
            <div key={msg.id} className={cn("group px-1", showName && "mt-3")}>
              {showName && (
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className={cn(
                    "text-xs font-semibold",
                    isOwn ? "text-primary" : "text-foreground"
                  )}>
                    {msg.user_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {format(new Date(msg.created_at), "HH:mm")}
                  </span>
                </div>
              )}
              <p className="text-sm text-foreground/90 leading-relaxed pl-0 whitespace-pre-line">
                {renderBody(msg.body)}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canPost ? (
        <div className="pt-3 border-t border-border/40 mt-2">
          {error && (
            <p className="text-xs text-destructive mb-2">{error}</p>
          )}
          {isTradeRecaps ? (
            <TradeRecapForm onSubmit={handleSend} sending={sending} />
          ) : (
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                className="flex-1"
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
        <div className="pt-3 border-t border-border/40 mt-2">
          <p className="text-xs text-muted-foreground text-center">
            This room is read-only for students.
          </p>
        </div>
      )}
    </div>
  );
}

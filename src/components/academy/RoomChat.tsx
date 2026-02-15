import { useState, useRef, useEffect } from "react";
import { useRoomMessages } from "@/hooks/useRoomMessages";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, ChevronUp, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface RoomChatProps {
  roomSlug: string;
  canPost: boolean;
}

const SETUPS = [
  { value: "momentum", label: "Momentum" },
  { value: "pullback", label: "Pullback" },
  { value: "breakout", label: "Breakout" },
  { value: "other", label: "Other" },
];

function TradeRecapForm({
  onSubmit,
  sending,
}: {
  onSubmit: (body: string) => Promise<void>;
  sending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [ticker, setTicker] = useState("");
  const [setup, setSetup] = useState("momentum");
  const [risk, setRisk] = useState("");
  const [result, setResult] = useState("");
  const [lesson, setLesson] = useState("");

  const canSend = lesson.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSend || sending) return;
    const lines = [
      `**📋 Trade Post**`,
      ticker.trim() ? `**Ticker:** ${ticker.trim().toUpperCase()}` : null,
      `**Setup:** ${SETUPS.find((s) => s.value === setup)?.label ?? setup}`,
      risk.trim() ? `**Risk:** $${risk.trim()}` : null,
      result.trim() ? `**Result:** ${result.trim()}` : null,
      `**Lesson:** ${lesson.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");
    await onSubmit(lines);
    setTicker("");
    setSetup("momentum");
    setRisk("");
    setResult("");
    setLesson("");
    setOpen(false);
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <PenLine className="h-3.5 w-3.5" />
        New Trade
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-4 bg-card">
      <p className="text-xs font-semibold text-foreground">Post a Trade</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Ticker <span className="text-muted-foreground/50">(optional)</span></Label>
          <Input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="SPY"
            maxLength={20}
            disabled={sending}
            className="text-sm uppercase h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Setup</Label>
          <Select value={setup} onValueChange={setSetup} disabled={sending}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SETUPS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Risk taken ($)</Label>
          <Input
            value={risk}
            onChange={(e) => setRisk(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="50"
            maxLength={10}
            disabled={sending}
            className="text-sm h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Result (R or $)</Label>
          <Input
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="+1.5R or +$75"
            maxLength={20}
            disabled={sending}
            className="text-sm h-8"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Lesson <span className="text-destructive">*</span></Label>
        <Textarea
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          placeholder="What did you learn from this trade?"
          maxLength={500}
          disabled={sending}
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSend || sending}
          className="gap-1.5"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Post Trade
        </Button>
      </div>
    </div>
  );
}

function isRecapPost(body: string) {
  return body.startsWith("**📋 Trade Post**") || body.startsWith("**📋 Trade Recap**");
}

function renderRecapCard(body: string) {
  const lines = body.split("\n").filter(Boolean);
  // Parse key-value pairs from **Key:** Value format
  const fields: { label: string; value: string }[] = [];
  for (const line of lines.slice(1)) {
    const match = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if (match) fields.push({ label: match[1], value: match[2] });
  }

  return (
    <div className="rounded-lg border border-border/40 bg-card/50 p-3 space-y-1.5 mt-1">
      <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">📋 Trade Post</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {fields.map((f, i) => (
          <div key={i} className={f.label === "Lesson" ? "col-span-2" : ""}>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</span>
            <p className="text-sm text-foreground">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderBody(body: string) {
  if (isRecapPost(body)) return renderRecapCard(body);
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

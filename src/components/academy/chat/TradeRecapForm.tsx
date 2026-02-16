import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, PenLine } from "lucide-react";

const SETUPS = [
  { value: "momentum", label: "Momentum" },
  { value: "pullback", label: "Pullback" },
  { value: "breakout", label: "Breakout" },
  { value: "other", label: "Other" },
];

interface TradeRecapFormProps {
  onSubmit: (body: string) => Promise<void>;
  sending: boolean;
}

export function TradeRecapForm({ onSubmit, sending }: TradeRecapFormProps) {
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
    <div className="space-y-3 rounded-lg border border-white/[0.08] p-4 bg-white/[0.04]">
      <p className="text-xs font-semibold text-white">Post a Trade</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-white/50">Ticker <span className="text-white/30">(optional)</span></Label>
          <Input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="SPY"
            maxLength={20}
            disabled={sending}
            className="text-sm uppercase h-8 bg-black/25 border-white/[0.1] text-white placeholder:text-white/30"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-white/50">Setup</Label>
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
          <Label className="text-[11px] text-white/50">Risk taken ($)</Label>
          <Input
            value={risk}
            onChange={(e) => setRisk(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="50"
            maxLength={10}
            disabled={sending}
            className="text-sm h-8 bg-black/25 border-white/[0.1] text-white placeholder:text-white/30"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-white/50">Result (R or $)</Label>
          <Input
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="+1.5R or +$75"
            maxLength={20}
            disabled={sending}
            className="text-sm h-8 bg-black/25 border-white/[0.1] text-white placeholder:text-white/30"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-white/50">Lesson <span className="text-destructive">*</span></Label>
        <Textarea
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          placeholder="What did you learn from this trade?"
          maxLength={500}
          disabled={sending}
          rows={2}
          className="text-sm resize-none bg-black/25 border-white/[0.1] text-white placeholder:text-white/30"
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

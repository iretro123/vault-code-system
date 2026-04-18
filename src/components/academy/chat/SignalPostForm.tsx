import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Radar, Crosshair, ImagePlus, X, ChevronDown, ChevronUp, Link2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Attachment } from "@/hooks/useRoomMessages";

type SignalMode = "watchlist" | "live";
type Bias = "bullish" | "bearish" | "neutral";
type Direction = "calls" | "puts";

interface DraftState {
  open: boolean;
  mode: SignalMode;
  ticker: string;
  bias: Bias;
  levels: string;
  notes: string;
  tvLink: string;
  direction: Direction;
  strike: string;
  exp: string;
  fill: string;
}

function loadDraft(key: string): Partial<DraftState> {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function hasDraftContent(d: Partial<DraftState>): boolean {
  return !!(d.ticker || d.levels || d.notes || d.tvLink || d.strike || d.exp || d.fill);
}

interface SignalPostFormProps {
  onSubmit: (body: string, attachments?: Attachment[]) => Promise<void>;
  sending: boolean;
  roomSlug: string;
}

export function SignalPostForm({ onSubmit, sending, roomSlug }: SignalPostFormProps) {
  const { user } = useAuth();
  const DRAFT_KEY = `vault_signal_draft_${roomSlug}`;
  const draft = useMemo(() => loadDraft(DRAFT_KEY), [DRAFT_KEY]);

  const [open, setOpen] = useState(() => draft.open === true || hasDraftContent(draft));
  const [mode, setMode] = useState<SignalMode>(() => draft.mode || "watchlist");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ticker, setTicker] = useState(() => draft.ticker || "");
  const [notes, setNotes] = useState(() => draft.notes || "");
  const [tvLink, setTvLink] = useState(() => draft.tvLink || "");
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [chartPreview, setChartPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [bias, setBias] = useState<Bias>(() => draft.bias || "bullish");
  const [levels, setLevels] = useState(() => draft.levels || "");

  const [direction, setDirection] = useState<Direction>(() => draft.direction || "calls");
  const [strike, setStrike] = useState(() => draft.strike || "");
  const [exp, setExp] = useState(() => draft.exp || "");
  const [fill, setFill] = useState(() => draft.fill || "");

  // Quick watchlist state
  const [quickTicker, setQuickTicker] = useState("");
  const [quickBias, setQuickBias] = useState<Bias>("bullish");

  // Persist draft
  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      open, mode, ticker, bias, levels, notes, tvLink, direction, strike, exp, fill,
    }));
  }, [open, mode, ticker, bias, levels, notes, tvLink, direction, strike, exp, fill, DRAFT_KEY]);

  const clearDraft = () => sessionStorage.removeItem(DRAFT_KEY);

  const reset = () => {
    setTicker(""); setNotes(""); setTvLink("");
    setChartFile(null); setChartPreview(null);
    setBias("bullish"); setLevels("");
    setDirection("calls"); setStrike(""); setExp(""); setFill("");
    clearDraft();
  };

  const handleChartSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Only image files allowed for chart."); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("File must be under 15 MB."); return; }
    setChartFile(file);
    setChartPreview(URL.createObjectURL(file));
  }, []);

  const removeChart = () => {
    setChartFile(null);
    if (chartPreview) URL.revokeObjectURL(chartPreview);
    setChartPreview(null);
  };

  const canSend = ticker.trim().length > 0 && (mode === "live" ? strike.trim().length > 0 : true);

  const uploadChart = async (file: File): Promise<{ url: string; att: Attachment } | null> => {
    if (!user) return null;
    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
    const path = `${roomSlug}/${user.id}/${Date.now()}_${safeName}`;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) { toast.error("Upload failed: not authenticated"); return null; }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const res = await fetch(`${supabaseUrl}/storage/v1/object/academy-chat-files/${encodedPath}`, {
      method: "POST",
      headers: { apikey: supabaseKey, authorization: `Bearer ${accessToken}`, "content-type": file.type || "application/octet-stream", "x-upsert": "false" },
      body: file,
    });
    if (!res.ok) { toast.error("Chart upload failed."); return null; }
    const { data: urlData } = supabase.storage.from("academy-chat-files").getPublicUrl(path);
    return { url: urlData.publicUrl, att: { type: "image", url: urlData.publicUrl, filename: file.name, size: file.size, mime: file.type } };
  };

  const buildSignalPayload = (t: string, b: Bias, m: SignalMode, opts: { levels?: string; notes?: string; tvLink?: string; direction?: Direction; strike?: string; exp?: string; fill?: string; chartAtt?: Attachment }) => {
    const attachments: Attachment[] = [];
    if (opts.chartAtt) attachments.push(opts.chartAtt);
    const trimmedTv = opts.tvLink?.trim() || undefined;

    if (m === "watchlist") {
      attachments.push({ type: "signal-watchlist", ticker: t, bias: b, levels: opts.levels?.trim() || undefined, notes: opts.notes?.trim() || undefined, tvLink: trimmedTv } as Attachment);
    } else {
      attachments.push({ type: "signal-live", direction: opts.direction, ticker: t, strike: opts.strike?.trim(), exp: opts.exp?.trim() || undefined, fill: opts.fill?.trim() || undefined, notes: opts.notes?.trim() || undefined, tvLink: trimmedTv } as Attachment);
    }

    const bodyLines: string[] = [];
    if (m === "watchlist") {
      bodyLines.push(`**👁 Watchlist Signal**`, `**Ticker:** ${t}`, `**Bias:** ${b.charAt(0).toUpperCase() + b.slice(1)}`);
      if (opts.levels?.trim()) bodyLines.push(`**Key Levels:** ${opts.levels.trim()}`);
      if (trimmedTv) bodyLines.push(`**Chart:** ${trimmedTv}`);
      if (opts.notes?.trim()) bodyLines.push(`**Notes:** ${opts.notes.trim()}`);
    } else {
      bodyLines.push(`**🎯 Live Signal**`, `**Direction:** ${opts.direction === "calls" ? "Calls" : "Puts"}`, `**Ticker:** ${t}`, `**Strike:** $${opts.strike?.trim()}`);
      if (opts.exp?.trim()) bodyLines.push(`**Exp:** ${opts.exp.trim()}`);
      if (opts.fill?.trim()) bodyLines.push(`**Fill:** $${opts.fill.trim()}`);
      if (trimmedTv) bodyLines.push(`**Chart:** ${trimmedTv}`);
      if (opts.notes?.trim()) bodyLines.push(`**Notes:** ${opts.notes.trim()}`);
    }
    return { body: bodyLines.join("\n"), attachments };
  };

  // Quick watchlist submit
  const handleQuickSubmit = async () => {
    const t = quickTicker.trim().toUpperCase();
    if (!t || sending || !user) return;
    const { body, attachments } = buildSignalPayload(t, quickBias, "watchlist", {});
    await onSubmit(body, attachments);
    setQuickTicker("");
    setQuickBias("bullish");
  };

  const handleSubmit = async () => {
    if (!canSend || sending || uploading || !user) return;

    let chartAtt: Attachment | undefined;
    if (chartFile) {
      setUploading(true);
      try {
        const result = await uploadChart(chartFile);
        if (!result) { setUploading(false); return; }
        chartAtt = result.att;
      } catch { toast.error("Chart upload failed."); setUploading(false); return; }
      setUploading(false);
    }

    const { body, attachments } = buildSignalPayload(
      ticker.trim().toUpperCase(), bias, mode,
      { levels, notes, tvLink, direction, strike, exp, fill, chartAtt }
    );

    await onSubmit(body, attachments);
    reset();
    setOpen(false);
  };

  const draftExists = hasDraftContent({ ticker, levels, notes, tvLink, strike, exp, fill });

  if (!open) {
    return (
      <div className="space-y-2">
        {/* Quick Watchlist Row */}
        <div className="flex items-center gap-1.5">
          <Input
            value={quickTicker}
            onChange={(e) => setQuickTicker(e.target.value.toUpperCase())}
            placeholder="Quick watchlist — type ticker"
            className="flex-1 h-8 bg-white/[0.04] border-white/[0.08] text-[12px] font-semibold uppercase placeholder:normal-case placeholder:font-normal"
            onKeyDown={(e) => { if (e.key === "Enter") handleQuickSubmit(); }}
          />
          <div className="flex rounded-md border border-white/[0.08] overflow-hidden shrink-0">
            {(["bullish", "bearish", "neutral"] as Bias[]).map((b) => (
              <button key={b} type="button" onClick={() => setQuickBias(b)}
                className={cn("px-1.5 py-1 text-[9px] font-semibold uppercase transition-colors",
                  quickBias === b
                    ? b === "bullish" ? "bg-emerald-500/20 text-emerald-400" : b === "bearish" ? "bg-red-500/20 text-red-400" : "bg-zinc-500/20 text-zinc-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >{b.slice(0, 4)}</button>
            ))}
          </div>
          <Button size="sm" onClick={handleQuickSubmit} disabled={!quickTicker.trim() || sending}
            className="h-8 px-2.5 bg-sky-600 hover:bg-sky-500 text-white text-[11px]">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Expand full form */}
        <button type="button" onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-[13px] font-medium text-foreground/80 relative"
        >
          <Crosshair className="h-4 w-4 text-primary" />
          Post Signal
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          {draftExists && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-sky-400" />}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-card overflow-hidden">
      {/* Mode toggle header */}
      <div className="flex items-center border-b border-white/[0.06]">
        <button type="button" onClick={() => setMode("watchlist")}
          className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors",
            mode === "watchlist" ? "text-sky-400 bg-sky-500/[0.08] border-b-2 border-sky-400" : "text-muted-foreground hover:text-foreground"
          )}>
          <Radar className="h-3.5 w-3.5" /> Watchlist
        </button>
        <button type="button" onClick={() => setMode("live")}
          className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors",
            mode === "live" ? "text-emerald-400 bg-emerald-500/[0.08] border-b-2 border-emerald-400" : "text-muted-foreground hover:text-foreground"
          )}>
          <Crosshair className="h-3.5 w-3.5" /> Live Signal
        </button>
        <button type="button" onClick={() => { setOpen(false); }}
          className="px-3 py-2.5 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Form body */}
      <div className="p-3 space-y-2.5">
        {mode === "watchlist" ? (
          <>
            <div className="flex gap-2">
              <Input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Ticker (e.g. SPY)" className="flex-1 h-9 bg-white/[0.04] border-white/[0.08] text-sm font-semibold uppercase" />
              <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
                {(["bullish", "bearish", "neutral"] as Bias[]).map((b) => (
                  <button key={b} type="button" onClick={() => setBias(b)}
                    className={cn("px-2.5 py-1.5 text-[10px] font-semibold uppercase transition-colors",
                      bias === b ? b === "bullish" ? "bg-emerald-500/20 text-emerald-400" : b === "bearish" ? "bg-red-500/20 text-red-400" : "bg-zinc-500/20 text-zinc-400"
                        : "text-muted-foreground hover:text-foreground"
                    )}>{b.slice(0, 4)}</button>
                ))}
              </div>
            </div>
            <Input value={levels} onChange={(e) => setLevels(e.target.value)}
              placeholder="Key levels (e.g. 540 / 545)" className="h-9 bg-white/[0.04] border-white/[0.08] text-sm" />
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-white/[0.08] overflow-hidden shrink-0">
                <button type="button" onClick={() => setDirection("calls")}
                  className={cn("px-3 py-1.5 text-[11px] font-bold uppercase transition-colors",
                    direction === "calls" ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground hover:text-foreground"
                  )}>Calls</button>
                <button type="button" onClick={() => setDirection("puts")}
                  className={cn("px-3 py-1.5 text-[11px] font-bold uppercase transition-colors",
                    direction === "puts" ? "bg-red-500/20 text-red-400" : "text-muted-foreground hover:text-foreground"
                  )}>Puts</button>
              </div>
              <Input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Ticker" className="flex-1 h-9 bg-white/[0.04] border-white/[0.08] text-sm font-semibold uppercase" />
            </div>
            <div className="flex gap-2">
              <Input value={strike} onChange={(e) => setStrike(e.target.value)}
                placeholder="Strike" className="flex-1 h-9 bg-white/[0.04] border-white/[0.08] text-sm" />
              <Input value={exp} onChange={(e) => setExp(e.target.value)}
                placeholder="Exp (e.g. 4/4)" className="flex-1 h-9 bg-white/[0.04] border-white/[0.08] text-sm" />
              <Input value={fill} onChange={(e) => setFill(e.target.value)}
                placeholder="Fill $" className="w-20 h-9 bg-white/[0.04] border-white/[0.08] text-sm" />
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input value={tvLink} onChange={(e) => setTvLink(e.target.value)}
            placeholder="TradingView link (optional)" className="h-9 bg-white/[0.04] border-white/[0.08] text-sm" />
        </div>

        <Textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 280))}
          placeholder="Quick thesis or notes (optional)" maxLength={280} rows={2}
          className="bg-white/[0.04] border-white/[0.08] text-sm resize-none min-h-[56px]" />

        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif" className="hidden" onChange={handleChartSelect} />

        {chartPreview ? (
          <div className="relative rounded-lg overflow-hidden border border-white/[0.08]">
            <img src={chartPreview} alt="Chart preview" className="w-full max-h-[160px] object-contain bg-black/20" />
            <button type="button" onClick={removeChart}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/[0.1] text-[11px] text-muted-foreground hover:text-foreground hover:border-white/[0.2] transition-colors">
            <ImagePlus className="h-3.5 w-3.5" /> Add chart image
          </button>
        )}

        <Button onClick={handleSubmit} disabled={!canSend || sending || uploading}
          className={cn("w-full h-9 text-[12px] font-semibold",
            mode === "watchlist" ? "bg-sky-600 hover:bg-sky-500 text-white"
              : direction === "calls" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-red-600 hover:bg-red-500 text-white"
          )}>
          {(sending || uploading) ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            : mode === "watchlist" ? <Radar className="h-3.5 w-3.5 mr-1.5" /> : <Crosshair className="h-3.5 w-3.5 mr-1.5" />}
          {mode === "watchlist" ? "Post Watchlist" : "Post Signal"}
        </Button>
      </div>
    </div>
  );
}

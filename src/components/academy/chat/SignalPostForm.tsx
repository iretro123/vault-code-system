import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Radar, Crosshair, ImagePlus, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Attachment } from "@/hooks/useRoomMessages";

type SignalMode = "watchlist" | "live";
type Bias = "bullish" | "bearish" | "neutral";
type Direction = "calls" | "puts";

interface SignalPostFormProps {
  onSubmit: (body: string, attachments?: Attachment[]) => Promise<void>;
  sending: boolean;
  roomSlug: string;
}

export function SignalPostForm({ onSubmit, sending, roomSlug }: SignalPostFormProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SignalMode>("watchlist");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared
  const [ticker, setTicker] = useState("");
  const [notes, setNotes] = useState("");
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [chartPreview, setChartPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Watchlist
  const [bias, setBias] = useState<Bias>("bullish");
  const [levels, setLevels] = useState("");

  // Live
  const [direction, setDirection] = useState<Direction>("calls");
  const [strike, setStrike] = useState("");
  const [exp, setExp] = useState("");
  const [fill, setFill] = useState("");

  const reset = () => {
    setTicker("");
    setNotes("");
    setChartFile(null);
    setChartPreview(null);
    setBias("bullish");
    setLevels("");
    setDirection("calls");
    setStrike("");
    setExp("");
    setFill("");
  };

  const handleChartSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files allowed for chart.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File must be under 15 MB.");
      return;
    }
    setChartFile(file);
    setChartPreview(URL.createObjectURL(file));
  }, []);

  const removeChart = () => {
    setChartFile(null);
    if (chartPreview) URL.revokeObjectURL(chartPreview);
    setChartPreview(null);
  };

  const canSend = ticker.trim().length > 0 && (mode === "live" ? strike.trim().length > 0 : true);

  const handleSubmit = async () => {
    if (!canSend || sending || uploading || !user) return;

    const attachments: Attachment[] = [];
    let chartUrl: string | undefined;

    // Upload chart image if present
    if (chartFile) {
      setUploading(true);
      try {
        const safeName = chartFile.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
        const path = `${roomSlug}/${user.id}/${Date.now()}_${safeName}`;

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) { toast.error("Upload failed: not authenticated"); setUploading(false); return; }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const encodedPath = path.split("/").map(encodeURIComponent).join("/");

        const res = await fetch(`${supabaseUrl}/storage/v1/object/academy-chat-files/${encodedPath}`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            authorization: `Bearer ${accessToken}`,
            "content-type": chartFile.type || "application/octet-stream",
            "x-upsert": "false",
          },
          body: chartFile,
        });

        if (!res.ok) {
          toast.error("Chart upload failed.");
          setUploading(false);
          return;
        }

        const { data: urlData } = supabase.storage.from("academy-chat-files").getPublicUrl(path);
        chartUrl = urlData.publicUrl;

        attachments.push({
          type: "image",
          url: chartUrl,
          filename: chartFile.name,
          size: chartFile.size,
          mime: chartFile.type,
        });
      } catch {
        toast.error("Chart upload failed.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // Build signal attachment
    if (mode === "watchlist") {
      attachments.push({
        type: "signal-watchlist" as any,
        ticker: ticker.trim().toUpperCase(),
        bias,
        levels: levels.trim() || undefined,
        notes: notes.trim() || undefined,
      } as any);
    } else {
      attachments.push({
        type: "signal-live" as any,
        direction,
        ticker: ticker.trim().toUpperCase(),
        strike: strike.trim(),
        exp: exp.trim() || undefined,
        fill: fill.trim() || undefined,
        notes: notes.trim() || undefined,
      } as any);
    }

    // Build readable body text as fallback
    const bodyLines: string[] = [];
    if (mode === "watchlist") {
      bodyLines.push(`**👁 Watchlist Signal**`);
      bodyLines.push(`**Ticker:** ${ticker.trim().toUpperCase()}`);
      bodyLines.push(`**Bias:** ${bias.charAt(0).toUpperCase() + bias.slice(1)}`);
      if (levels.trim()) bodyLines.push(`**Key Levels:** ${levels.trim()}`);
      if (notes.trim()) bodyLines.push(`**Notes:** ${notes.trim()}`);
    } else {
      bodyLines.push(`**🎯 Live Signal**`);
      bodyLines.push(`**Direction:** ${direction === "calls" ? "Calls" : "Puts"}`);
      bodyLines.push(`**Ticker:** ${ticker.trim().toUpperCase()}`);
      bodyLines.push(`**Strike:** $${strike.trim()}`);
      if (exp.trim()) bodyLines.push(`**Exp:** ${exp.trim()}`);
      if (fill.trim()) bodyLines.push(`**Fill:** $${fill.trim()}`);
      if (notes.trim()) bodyLines.push(`**Notes:** ${notes.trim()}`);
    }

    await onSubmit(bodyLines.join("\n"), attachments);
    reset();
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-[13px] font-medium text-foreground/80"
      >
        <Crosshair className="h-4 w-4 text-primary" />
        Post Signal
        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-card overflow-hidden">
      {/* Mode toggle header */}
      <div className="flex items-center border-b border-white/[0.06]">
        <button
          type="button"
          onClick={() => setMode("watchlist")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors",
            mode === "watchlist"
              ? "text-sky-400 bg-sky-500/[0.08] border-b-2 border-sky-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Radar className="h-3.5 w-3.5" />
          Watchlist
        </button>
        <button
          type="button"
          onClick={() => setMode("live")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors",
            mode === "live"
              ? "text-emerald-400 bg-emerald-500/[0.08] border-b-2 border-emerald-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Crosshair className="h-3.5 w-3.5" />
          Live Signal
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); reset(); }}
          className="px-3 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Form body */}
      <div className="p-3 space-y-2.5">
        {mode === "watchlist" ? (
          <>
            {/* Ticker + Bias */}
            <div className="flex gap-2">
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Ticker (e.g. SPY)"
                className="flex-1 h-9 bg-white/[0.04] border-white/[0.08] text-sm font-semibold uppercase"
              />
              <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
                {(["bullish", "bearish", "neutral"] as Bias[]).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBias(b)}
                    className={cn(
                      "px-2.5 py-1.5 text-[10px] font-semibold uppercase transition-colors",
                      bias === b
                        ? b === "bullish" ? "bg-emerald-500/20 text-emerald-400"
                          : b === "bearish" ? "bg-red-500/20 text-red-400"
                          : "bg-zinc-500/20 text-zinc-400"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {b.slice(0, 4)}
                  </button>
                ))}
              </div>
            </div>
            <Input
              value={levels}
              onChange={(e) => setLevels(e.target.value)}
              placeholder="Key levels (e.g. 540 / 545)"
              className="h-9 bg-white/[0.04] border-white/[0.08] text-sm"
            />
          </>
        ) : (
          <>
            {/* Direction + Ticker */}
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-white/[0.08] overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setDirection("calls")}
                  className={cn(
                    "px-3 py-1.5 text-[11px] font-bold uppercase transition-colors",
                    direction === "calls"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Calls
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("puts")}
                  className={cn(
                    "px-3 py-1.5 text-[11px] font-bold uppercase transition-colors",
                    direction === "puts"
                      ? "bg-red-500/20 text-red-400"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Puts
                </button>
              </div>
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Ticker"
                className="flex-1 h-9 bg-white/[0.04] border-white/[0.08] text-sm font-semibold uppercase"
              />
            </div>
            {/* Strike + Exp + Fill */}
            <div className="flex gap-2">
              <Input
                value={strike}
                onChange={(e) => setStrike(e.target.value)}
                placeholder="Strike"
                className="flex-1 h-9 bg-white/[0.04] border-white/[0.08] text-sm"
              />
              <Input
                value={exp}
                onChange={(e) => setExp(e.target.value)}
                placeholder="Exp (e.g. 4/4)"
                className="flex-1 h-9 bg-white/[0.04] border-white/[0.08] text-sm"
              />
              <Input
                value={fill}
                onChange={(e) => setFill(e.target.value)}
                placeholder="Fill $"
                className="w-20 h-9 bg-white/[0.04] border-white/[0.08] text-sm"
              />
            </div>
          </>
        )}

        {/* Notes */}
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 280))}
          placeholder="Quick thesis or notes (optional)"
          maxLength={280}
          rows={2}
          className="bg-white/[0.04] border-white/[0.08] text-sm resize-none min-h-[56px]"
        />

        {/* Chart upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif"
          className="hidden"
          onChange={handleChartSelect}
        />

        {chartPreview ? (
          <div className="relative rounded-lg overflow-hidden border border-white/[0.08]">
            <img src={chartPreview} alt="Chart preview" className="w-full max-h-[160px] object-contain bg-black/20" />
            <button
              type="button"
              onClick={removeChart}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/[0.1] text-[11px] text-muted-foreground hover:text-foreground hover:border-white/[0.2] transition-colors"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Add chart image
          </button>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!canSend || sending || uploading}
          className={cn(
            "w-full h-9 text-[12px] font-semibold",
            mode === "watchlist"
              ? "bg-sky-600 hover:bg-sky-500 text-white"
              : direction === "calls"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-red-600 hover:bg-red-500 text-white"
          )}
        >
          {(sending || uploading) ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : mode === "watchlist" ? (
            <Radar className="h-3.5 w-3.5 mr-1.5" />
          ) : (
            <Crosshair className="h-3.5 w-3.5 mr-1.5" />
          )}
          {mode === "watchlist" ? "Post Watchlist" : "Post Signal"}
        </Button>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Share2, Loader2 } from "lucide-react";
import { parseAvatarUrl } from "@/lib/chatAvatars";
import { AVATAR_ICONS_MAP } from "@/lib/avatarIcons";
import { cardTradeDetails, loadShareImage, winHighlights, shareWinFile, type WinFields } from "@/lib/winShare";
import mountain from "@/assets/vault-share-mountain.jpg";
import "@fontsource-variable/manrope";
import "./win-share.css";

export function ShareWinModal({ open, onOpenChange, win }: {
  open: boolean; onOpenChange: (open: boolean) => void; win: WinFields;
}) {
  const [style, setStyle] = useState("dark");
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [ticker, setTicker] = useState(() => winHighlights(win.body).ticker);
  const [tradeReturn, setTradeReturn] = useState(() => winHighlights(win.body).result.replace(/%$/, ""));
  const details = cardTradeDetails(ticker, tradeReturn);
  const { userName, avatarUrl, body, isExample } = win;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    setPreview(null); setError("");
    if (details.error) return;
    const draw = async () => {
      await document.fonts.load('800 48px "Manrope Variable"');
      const canvas = document.createElement("canvas");
      canvas.width = 1080; canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your device couldn't create the card.");
      const h = canvas.height;
      const light = style === "light";
      const ink = light ? "#101820" : "#f3f6ff";
      const muted = light ? "#536174" : "#acbad0";
      const gradient = ctx.createLinearGradient(1080, 0, 100, h);
      gradient.addColorStop(0, light ? "#ffffff" : "#101722");
      gradient.addColorStop(0.6, light ? "#ffffff" : "#090d14"); gradient.addColorStop(1, light ? "#edf2f7" : "#040609");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, h);
      const backdrop = await loadShareImage(mountain);
      if (light) {
        // Lower the full-bleed scene so the summit clears the result typography.
        ctx.save();
        ctx.globalAlpha = 0.68;
        ctx.drawImage(backdrop, 0, 500, 1080, h);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "color";
        ctx.fillStyle = "#367bdb"; ctx.fillRect(0, 500, 1080, h);
        ctx.restore();
        const snow = ctx.createLinearGradient(0, 0, 0, h);
        snow.addColorStop(0, "#ffffff");
        snow.addColorStop(0.47, "#ffffff");
        snow.addColorStop(0.53, "rgba(247,251,255,0.92)");
        snow.addColorStop(0.60, "rgba(240,247,255,0.25)");
        snow.addColorStop(0.69, "rgba(240,247,255,0.04)");
        snow.addColorStop(0.79, "rgba(243,248,255,0.25)");
        snow.addColorStop(0.88, "rgba(255,255,255,0.96)");
        snow.addColorStop(1, "#ffffff");
        ctx.fillStyle = snow; ctx.fillRect(0, 0, 1080, h);
      } else {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(backdrop, 0, 0, 1080, h); ctx.globalAlpha = 1;
      }
      // Architectural ribbons, not a decorative trading chart.
      for (let i = 0; i < (light ? 0 : 3); i++) {
        ctx.strokeStyle = `rgba(104,167,255,${0.18 - i * 0.04})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(720 + i * 90, 0); ctx.lineTo(1080, 360 + i * 170); ctx.stroke();
      }
      const text = (value: string, x: number, y: number, size: number, color = ink, weight = 600) => {
        ctx.fillStyle = color; ctx.font = `${weight} ${size}px "Manrope Variable", sans-serif`; ctx.fillText(value, x, y);
      };
      text(isExample ? "TRADING RECAP / EXAMPLE" : "VAULT OS / TRADING COMMUNITY", 76, 116, 34, light ? "#3261a1" : "#94bdff");
      const highlights = cardTradeDetails(ticker, tradeReturn);
      text("My trading", 70, 300, 105, ink, 800);
      text("recap.", 70, 420, 105, ink, 800);
      ctx.fillStyle = "#78afff"; ctx.fillRect(76, 515, 70, 4);
      if (highlights.result) {
        text("TICKER", 76, 590, 34, muted);
        text("TRADE RETURN", 76, 750, 34, muted);
        const value = Number.parseFloat(highlights.result);
        const resultColor = value < 0 ? (light ? "#bd273d" : "#ff7588") : value > 0 ? (light ? "#00864a" : "#39ff88") : muted;
        const resultText = highlights.ticker || "MY SESSION";
        ctx.save();
        if (value > 0 && !light) {
          ctx.shadowColor = "rgba(57,255,136,0.42)";
          ctx.shadowBlur = 18;
        }
        text(resultText, 76, 665, 60, resultColor, 700);
        ctx.font = '800 185px "Manrope Variable", sans-serif';
        const returnSize = Math.min(185, 185 * 928 / Math.max(1, ctx.measureText(highlights.result).width));
        text(highlights.result, 65, 930, returnSize, resultColor, 800);
        ctx.restore();
        text(isExample ? "Illustrative trade example" : "Member-reported return", 76, 1000, 34, muted, 400);
      } else {
        text("Study the market.", 76, 685, 54, light ? "#3261a1" : "#aacfff", 600);
        text("Build your process.", 76, 765, 54, light ? "#3261a1" : "#aacfff", 600);
      }
      {
        const avatar = parseAvatarUrl(avatarUrl);
        let avatarImageUrl = avatar.imageUrl;
        if (avatar.mode === "icon" && avatar.iconId && AVATAR_ICONS_MAP[avatar.iconId]) {
          const svg = renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" color={avatar.color}>{AVATAR_ICONS_MAP[avatar.iconId]}</svg>);
          avatarImageUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        }
        ctx.save(); ctx.beginPath(); ctx.arc(146, h - 382, 70, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = "#19365c"; ctx.fillRect(76, h - 452, 140, 140);
        if (avatarImageUrl) {
          const avatarImage = await loadShareImage(avatarImageUrl);
          ctx.drawImage(avatarImage, 76, h - 452, 140, 140);
        } else text(avatar.mode === "vault" ? "V" : userName.slice(0, 1).toUpperCase(), 123, h - 362, 60, "#ffffff");
        ctx.restore();
        const name = userName.slice(0, 32);
        ctx.font = '600 42px "Manrope Variable", sans-serif';
        const nameSize = Math.min(42, 42 * 759 / Math.max(1, ctx.measureText(name).width));
        text(name, 245, h - 366, nameSize);
      }
      ctx.fillStyle = light ? "#c5cdd7" : "#24334b"; ctx.fillRect(76, h - 267, 928, 1);
      text("VAULT ", 76, h - 170, 72, ink, 800);
      const wordmarkWidth = ctx.measureText("VAULT ").width;
      text("OS", 76 + wordmarkWidth, h - 170, 72, light ? "#2167e8" : "#5c9dff", 800);
      text("Day trading community", 76, h - 112, 36, muted, 600);
      text(isExample ? "Example / For illustration only" : "Self-reported / Not independently verified", 76, h - 50, 30, muted, 400);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Couldn't export this card.")), "image/png"));
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setPreview({ url: objectUrl, file: new File([blob], "vault-moment.png", { type: "image/png" }) });
    };
    void draw().catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't create your card."); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, style, userName, avatarUrl, body, isExample, ticker, tradeReturn, details.error]);

  const share = async () => {
    if (!preview || busy || details.error) return;
    setBusy(true); setNotice("");
    try {
      const result = await shareWinFile(preview.file);
      if (result === "download") setNotice("Card downloaded. You choose where to post it.");
    } catch { setNotice("Sharing wasn't completed. Please try again."); }
    finally { setBusy(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="win-studio">
      <header><DialogTitle>Your share card.</DialogTitle>
        <DialogDescription>Made for you. Ready for your story.</DialogDescription></header>
      <div className="win-studio-layout">
        <div className="win-studio-stage" aria-busy={!preview && !error}>
          {details.error ? <p>Finish your trade details below to see your card.</p> : preview ? <img src={preview.url} alt="Exact preview of your exported Vault share card" /> : error ? <p role="alert">{error}</p> : <Loader2 className="animate-spin" aria-label="Creating your card" />}
        </div>
        <div className="win-studio-controls">
          <div className="win-trade-fields">
            <label>Ticker<input aria-describedby="win-trade-help" value={ticker} onChange={e => setTicker(e.target.value)} placeholder="SPY" maxLength={12} autoCapitalize="characters" spellCheck={false} /></label>
            <label>Return %<input aria-describedby="win-trade-help" value={tradeReturn} onChange={e => setTradeReturn(e.target.value)} placeholder="+15" type="text" maxLength={16} spellCheck={false} /></label>
          </div>
          <p id="win-trade-help" className="win-studio-note" aria-live="polite">{details.error || "Your trade return, not your account balance."}</p>
          <div className="win-studio-segments" aria-label="Card appearance">{["dark", "light"].map(value => <button key={value} data-theme={value} aria-pressed={style === value} onClick={() => setStyle(value)}><span className="win-theme-dot" />{value}</button>)}</div>
          <button className="win-studio-share" disabled={!preview || busy || !!details.error} onClick={share}>{busy ? <Loader2 className="animate-spin" size={19} /> : <Share2 size={19} />} Share card</button>
          {notice && <p className="win-studio-note" role="status">{notice}</p>}
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}

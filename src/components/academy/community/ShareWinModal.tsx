import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface WinFields {
  userName: string;
  roleName?: string;
  body: string;
  imageUrl?: string;
  createdAt: string;
}

interface ShareWinModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  win: WinFields;
}

const CANVAS_W = 1080;
const CANVAS_H = 1920;

function parseFields(body: string): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if (m) fields.push({ label: m[1], value: m[2] });
  }
  return fields;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function ShareWinModal({ open, onOpenChange, win }: ShareWinModalProps) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);

    const ctx = canvas.getContext("2d")!;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    grad.addColorStop(0, "#0a0e1a");
    grad.addColorStop(0.5, "#0f1629");
    grad.addColorStop(1, "#060a14");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Subtle accent glow
    const glow = ctx.createRadialGradient(CANVAS_W / 2, 400, 50, CANVAS_W / 2, 400, 500);
    glow.addColorStop(0, "rgba(59,130,246,0.08)");
    glow.addColorStop(1, "rgba(59,130,246,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const px = 80;
    let y = 120;

    // Top branding
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "600 28px -apple-system, Inter, sans-serif";
    ctx.fillText("VAULT ACADEMY", px, y);
    y += 20;

    // Divider line
    y += 40;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(CANVAS_W - px, y);
    ctx.stroke();
    y += 60;

    // Trophy icon placeholder
    ctx.fillStyle = "#f59e0b";
    ctx.font = "80px serif";
    ctx.fillText("🏆", CANVAS_W / 2 - 40, y + 70);
    y += 130;

    // "TRADE WIN" header
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 64px -apple-system, Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TRADE WIN", CANVAS_W / 2, y);
    ctx.textAlign = "left";
    y += 30;

    // Divider
    y += 30;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(CANVAS_W - px, y);
    ctx.stroke();
    y += 50;

    // User name
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "600 40px -apple-system, Inter, sans-serif";
    ctx.fillText(win.userName, px, y);
    if (win.roleName) {
      const nameW = ctx.measureText(win.userName).width;
      ctx.fillStyle = "rgba(59,130,246,0.8)";
      ctx.font = "500 28px -apple-system, Inter, sans-serif";
      ctx.fillText(win.roleName, px + nameW + 20, y);
    }
    y += 20;

    // Date
    y += 35;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "400 28px -apple-system, Inter, sans-serif";
    const dateStr = new Date(win.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    ctx.fillText(dateStr, px, y);
    y += 50;

    // Trade screenshot if exists
    if (win.imageUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = win.imageUrl!;
        });
        const imgW = CANVAS_W - px * 2;
        const imgH = Math.min(400, (img.height / img.width) * imgW);
        // Rounded rect clip
        const r = 24;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(px, y, imgW, imgH, r);
        ctx.clip();
        ctx.drawImage(img, px, y, imgW, imgH);
        ctx.restore();
        // Border
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px, y, imgW, imgH, r);
        ctx.stroke();
        y += imgH + 40;
      } catch {
        // skip image if it fails to load
      }
    }

    // Fields or body
    const fields = parseFields(win.body);
    if (fields.length > 0) {
      for (const f of fields) {
        // Label
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "500 24px -apple-system, Inter, sans-serif";
        ctx.fillText(f.label.toUpperCase(), px, y);
        y += 36;
        // Value
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "500 34px -apple-system, Inter, sans-serif";
        const valLines = wrapText(ctx, f.value, CANVAS_W - px * 2);
        for (const vl of valLines) {
          ctx.fillText(vl, px, y);
          y += 44;
        }
        y += 16;
      }
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "400 34px -apple-system, Inter, sans-serif";
      const bodyLines = wrapText(ctx, win.body, CANVAS_W - px * 2);
      for (const bl of bodyLines.slice(0, 8)) {
        ctx.fillText(bl, px, y);
        y += 44;
      }
      y += 16;
    }

    // Bottom branding area
    const bottomY = CANVAS_H - 200;

    // Divider
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, bottomY);
    ctx.lineTo(CANVAS_W - px, bottomY);
    ctx.stroke();

    // Vault branding
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 30px -apple-system, Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("VAULT ACADEMY", CANVAS_W / 2, bottomY + 55);

    // Referral link
    if (user?.id) {
      ctx.fillStyle = "rgba(59,130,246,0.7)";
      ctx.font = "400 24px -apple-system, Inter, sans-serif";
      ctx.fillText(`vault-code-system.lovable.app/ref/${user.id}`, CANVAS_W / 2, bottomY + 100);
    }

    // URL
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "400 22px -apple-system, Inter, sans-serif";
    ctx.fillText("vault-code-system.lovable.app", CANVAS_W / 2, bottomY + 145);
    ctx.textAlign = "left";

    setDataUrl(canvas.toDataURL("image/png"));
    setRendering(false);
  }, [win, user?.id]);

  useEffect(() => {
    if (open) {
      setDataUrl(null);
      // Small delay to ensure canvas is mounted
      const t = setTimeout(render, 100);
      return () => clearTimeout(t);
    }
  }, [open, render]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `vault-win-${Date.now()}.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "vault-win.png", { type: "image/png" });
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: "My Vault Academy Win",
          text: "Check out my latest trade win on Vault Academy! 🏆",
        });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-[hsl(220,15%,8%)] border-[hsl(220,10%,20%)]">
        <DialogTitle className="sr-only">Share Win Card</DialogTitle>
        <div className="p-4">
          {/* Preview */}
          <div className="rounded-xl overflow-hidden border border-[hsl(220,10%,18%)] bg-black">
            <canvas
              ref={canvasRef}
              className="w-full h-auto"
              style={{ aspectRatio: "9/16" }}
            />
          </div>

          {rendering && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
            </div>
          )}

          {/* Actions */}
          {dataUrl && !rendering && (
            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="flex-1 border-[hsl(220,10%,25%)] text-white bg-[hsl(220,15%,12%)] hover:bg-[hsl(220,15%,16%)]"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleShare}
                className="flex-1"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

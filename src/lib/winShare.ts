import { Capacitor } from "@capacitor/core";

export interface WinFields {
  userName: string;
  avatarUrl?: string | null;
  roleName?: string;
  body: string;
  imageUrl?: string;
  createdAt: string;
  isExample?: boolean;
}
export function canShareWin(roomSlug: string, message: { id: string; user_id: string; is_deleted?: boolean | null }, viewerId?: string) {
  return roomSlug === "wins-proof" && !!viewerId && message.user_id === viewerId &&
    !message.is_deleted && !message.id.startsWith("optimistic-");
}
export function shareCaption(body: string) {
  return body.replace(/<@[^>]+>/g, "[member]").replace(/\*\*/g, "").slice(0, 220);
}
export function cardTradeDetails(tickerInput: string, returnInput: string) {
  const ticker = tickerInput.trim().toUpperCase().replace(/^\$/, "");
  const raw = returnInput.trim().replace(/%$/, "").trim();
  if (!ticker && !raw) return { ticker: "", result: "", error: "" };
  if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker)) return { ticker: "", result: "", error: "Enter a ticker, like SPY." };
  if (!/^[+-]?\d+(?:\.\d{1,4})?$/.test(raw) || !Number.isFinite(Number(raw))) {
    return { ticker, result: "", error: "Enter your trade return, like 15 or -2.5." };
  }
  const value = Number(raw);
  return { ticker, result: `${value > 0 ? "+" : ""}${value}%`, error: "" };
}
// Only promote explicitly labelled fields; never infer a profit from a random
// percentage, screenshot, account balance, or AI-generated claim.
export function winHighlights(body: string) {
  const fields = new Map(body.split("\n").flatMap(line => {
    const match = line.replace(/\*\*/g, "").match(/^\s*([\w /&]+):\s*(.+)$/);
    return match ? [[match[1].trim().toLowerCase(), match[2].trim()]] : [];
  }));
  const ticker = fields.get("ticker") || fields.get("symbol") || "";
  const result = fields.get("return") || fields.get("trade return") || "";
  return {
    ticker: /^\$?[A-Z]{1,8}$/.test(ticker) ? ticker : "",
    result: /^[+-]?\d+(?:\.\d+)?%$/.test(result) ? result : "",
  };
}
export async function shareWinFile(file: File): Promise<"shared" | "download" | "cancelled"> {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"), import("@capacitor/share"),
    ]);
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Couldn't prepare this card."));
      reader.readAsDataURL(file);
    });
    const path = `vault-share-${crypto.randomUUID()}.png`;
    const { uri } = await Filesystem.writeFile({ path, data, directory: Directory.Cache });
    try {
      await Share.share({ files: [uri], title: "My progress in Vault OS", dialogTitle: "Share your card" });
      return "shared";
    } finally {
      await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
    }
  }
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: "My progress in Vault OS" });
      return "shared";
    } catch (error) {
      if (error && typeof error === "object" && "name" in error && error.name === "AbortError") return "cancelled";
      throw error;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url; a.download = file.name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return "download";
}
export function loadShareImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ""; reject(new Error("Image loading timed out. Try without the screenshot.")); }, 10000);
    img.crossOrigin = "anonymous";
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error("This image can't be exported. Try without the screenshot.")); };
    img.src = url;
  });
}

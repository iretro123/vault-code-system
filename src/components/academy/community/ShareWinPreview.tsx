import { useState } from "react";
import { ShareWinModal } from "./ShareWinModal";
const sample = { userName: "Preview Trader", avatarUrl: "character:market-owl", body: "Ticker: SPY\nReturn: +15%\nWaited for my setup. Followed my exit.", isExample: true, createdAt: "2026-09-28T12:00:00Z" };
export function ShareWinPreview() {
  const [open, setOpen] = useState(true);
  return <main style={{ minHeight: "100dvh", background: "#080d16", padding: 32, color: "white" }}>
    <p>Local design preview · Sample post, not a member result</p>
    <button className="win-share-entry" onClick={() => setOpen(true)}>Preview share card</button>
    {open && <ShareWinModal open onOpenChange={setOpen} win={sample} />}
  </main>;
}

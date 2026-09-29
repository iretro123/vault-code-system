import React from "react";
import { ShieldCheck, Sword, Crown, Zap, Gamepad2 } from "lucide-react";

export interface AvatarIconDef {
  id: string;
  svg: React.ReactNode;
}

/** Shared avatar icon library — used in Settings, ProfileForm, and chat rendering */
const BASE_AVATAR_ICONS: AvatarIconDef[] = [
  { id: "fox-mask", svg: <svg viewBox="0 0 40 40" className="h-full w-full" fill="currentColor"><path d="M4 3 17 12h6L36 3l-3 23-13 12L7 26Z"/><path d="m8 9 7 7-6 3Zm24 0-7 7 6 3Z" fill="white" fillOpacity=".55"/><path d="m9 21 9 3-4 4Zm22 0-9 3 4 4Zm-14 9h6l-3 4Z" fill="#101923"/><path d="m20 15 3 7-3 5-3-5Z" fill="white" fillOpacity=".7"/></svg> },
  { id: "pixel-ghost", svg: <svg viewBox="0 0 40 40" className="h-full w-full" fill="currentColor"><path d="M12 5h16v4h4v5h4v22h-6v-5h-5v5H15v-5h-5v5H4V14h4V9h4Z"/><path d="M10 15h8v10h-8Zm13 0h8v10h-8Z" fill="white"/><path d="M14 19h4v6h-4Zm13 0h4v6h-4Z" fill="#101923"/></svg> },
  { id: "battle-axe", svg: <svg viewBox="0 0 40 40" className="h-full w-full" fill="currentColor"><path d="m9 35 4 3L30 8l-4-3Z"/><path d="M8 8c6 4 11 2 15-4l10 7c-5 7-5 12-1 18-11-1-17-7-18-14Z"/><path d="m9 9 6 6c1 6 5 10 12 12-4-4-5-8-4-12Z" fill="white" fillOpacity=".45"/><path d="m10 30 6 4m-3-9 6 4" fill="none" stroke="#101923" strokeWidth="2"/></svg> },
  { id: "winged-blade", svg: <svg viewBox="0 0 40 40" className="h-full w-full" fill="currentColor"><path d="m20 2 4 7-2 17h-4L16 9ZM13 27h14v4H13Zm5 5h4v6h-4Z"/><path d="m3 10 12 7v6L6 19Zm34 0-12 7v6l9-4ZM7 23l8 3v4l-6-3Zm26 0-8 3v4l6-3Z"/><path d="m20 7 1 4-1 12-1-12Z" fill="white" fillOpacity=".75"/></svg> },
  { id: "ronin-mask", svg: <svg viewBox="0 0 40 40" className="h-full w-full" fill="currentColor"><path d="m5 3 9 8h12l9-8-3 14 3 7-7 10-8 4-8-4-7-10 3-7Z"/><path d="m10 18 8 3-3 4-5-3Zm20 0-8 3 3 4 5-3ZM14 29l6-3 6 3-6 5Z" fill="#101923"/><path d="m20 12 4 5-4 4-4-4Z" fill="white" fillOpacity=".65"/><path d="m9 8 5 6H9Zm22 0-5 6h5Z" fill="white" fillOpacity=".4"/></svg> },
  { id: "winged-rank", svg: <svg viewBox="0 0 40 40" className="h-full w-full" fill="currentColor"><path d="M2 9 15 14v6L5 16Zm2 10 11 4v5l-8-4Zm5 10 6 2 5 6-8-3ZM38 9 25 14v6l10-4Zm-2 10-11 4v5l8-4Zm-5 10-6 2-5 6 8-3Z"/><path d="m20 5 6 13-6 13-6-13Z"/><path d="m20 11 3 7-3 6-3-6Z" fill="white" fillOpacity=".7"/></svg> },
  { id: "vault-mark", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><path d="M4 9h9l7 14L30 7h8L21 35h-3Z" fill="currentColor"/><path d="m20 23 5-8h7l-11 20h-3Z" fill="currentColor" opacity=".4"/></svg> },
  { id: "crossed-swords", svg: <svg viewBox="0 0 40 40" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"><path d="m7 5 7 3 17 21-4 4L9 12Z"/><path d="m33 5-7 3L9 29l4 4 18-21Z"/><path d="m4 26 10 10m12 0 10-10M6 34l3-3m22 0 3 3" strokeLinecap="round"/></svg> },
  { id: "nova-spark", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><path d="m20 3 5 12 12 5-12 5-5 12-5-12L3 20l12-5Z" fill="currentColor"/><path d="m32 3 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="currentColor" opacity=".5"/></svg> },
  // ─── Original geometric ───
  { id: "diamond", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><rect x="8" y="8" width="24" height="24" rx="4" transform="rotate(45 20 20)" fill="currentColor" opacity="0.9" /><rect x="14" y="14" width="12" height="12" rx="2" transform="rotate(45 20 20)" fill="currentColor" opacity="0.4" /></svg> },
  { id: "circles", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><circle cx="20" cy="16" r="8" fill="currentColor" opacity="0.8" /><circle cx="14" cy="26" r="5" fill="currentColor" opacity="0.5" /><circle cx="26" cy="26" r="5" fill="currentColor" opacity="0.5" /></svg> },
  { id: "hexagon", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill="currentColor" opacity="0.8" /><polygon points="20,12 27,16 27,24 20,28 13,24 13,16" fill="currentColor" opacity="0.3" /></svg> },
  { id: "triangle", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><polygon points="20,6 36,34 4,34" fill="currentColor" opacity="0.8" /><polygon points="20,16 28,30 12,30" fill="currentColor" opacity="0.3" /></svg> },
  { id: "bars", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><rect x="6" y="8" width="8" height="24" rx="3" fill="currentColor" opacity="0.9" /><rect x="16" y="14" width="8" height="18" rx="3" fill="currentColor" opacity="0.6" /><rect x="26" y="10" width="8" height="22" rx="3" fill="currentColor" opacity="0.75" /></svg> },
  { id: "cross", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><rect x="15" y="6" width="10" height="28" rx="3" fill="currentColor" opacity="0.8" /><rect x="6" y="15" width="28" height="10" rx="3" fill="currentColor" opacity="0.8" /></svg> },

  // ─── Gaming ───
  { id: "shield", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><path d="M20 4 L34 10 L34 22 C34 30 20 38 20 38 C20 38 6 30 6 22 L6 10 Z" fill="currentColor" opacity="0.8" /><path d="M20 12 L28 16 L28 22 C28 27 20 32 20 32 C20 32 12 27 12 22 L12 16 Z" fill="currentColor" opacity="0.3" /></svg> },
  { id: "sword", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><rect x="18" y="4" width="4" height="22" rx="1" fill="currentColor" opacity="0.85" /><rect x="12" y="24" width="16" height="4" rx="2" fill="currentColor" opacity="0.7" /><rect x="17" y="28" width="6" height="8" rx="2" fill="currentColor" opacity="0.5" /></svg> },
  { id: "crown", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><polygon points="6,30 10,14 16,22 20,8 24,22 30,14 34,30" fill="currentColor" opacity="0.85" /><rect x="6" y="30" width="28" height="4" rx="2" fill="currentColor" opacity="0.6" /></svg> },
  { id: "lightning", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><polygon points="22,4 12,22 18,22 16,36 28,16 22,16" fill="currentColor" opacity="0.85" /></svg> },
  { id: "controller", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><rect x="6" y="14" width="28" height="14" rx="7" fill="currentColor" opacity="0.8" /><circle cx="14" cy="21" r="3" fill="currentColor" opacity="0.3" /><circle cx="26" cy="21" r="3" fill="currentColor" opacity="0.3" /><rect x="18" y="10" width="4" height="6" rx="2" fill="currentColor" opacity="0.6" /></svg> },

  // ─── Trading ───
  { id: "candle", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><rect x="18" y="4" width="4" height="32" rx="1" fill="currentColor" opacity="0.4" /><rect x="14" y="12" width="12" height="16" rx="2" fill="currentColor" opacity="0.85" /></svg> },
  { id: "target", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><circle cx="20" cy="20" r="16" fill="currentColor" opacity="0.3" /><circle cx="20" cy="20" r="10" fill="currentColor" opacity="0.5" /><circle cx="20" cy="20" r="4" fill="currentColor" opacity="0.9" /></svg> },
  { id: "rocket", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><ellipse cx="20" cy="18" rx="6" ry="14" fill="currentColor" opacity="0.85" /><polygon points="14,26 10,34 16,30" fill="currentColor" opacity="0.5" /><polygon points="26,26 30,34 24,30" fill="currentColor" opacity="0.5" /><circle cx="20" cy="14" r="3" fill="currentColor" opacity="0.3" /></svg> },
  { id: "bull", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><circle cx="20" cy="22" r="10" fill="currentColor" opacity="0.8" /><path d="M10 22 Q6 12 8 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" /><path d="M30 22 Q34 12 32 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" /><circle cx="16" cy="20" r="1.5" fill="currentColor" opacity="0.3" /><circle cx="24" cy="20" r="1.5" fill="currentColor" opacity="0.3" /></svg> },

  // ─── Abstract / Modern ───
  { id: "star", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><polygon points="20,4 24,15 36,15 27,22 30,34 20,27 10,34 13,22 4,15 16,15" fill="currentColor" opacity="0.85" /><polygon points="20,12 22,17 28,17 23,21 25,27 20,23 15,27 17,21 12,17 18,17" fill="currentColor" opacity="0.3" /></svg> },
  { id: "wave", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><path d="M4 20 Q10 8 16 20 Q22 32 28 20 Q34 8 36 16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.85" /><path d="M4 26 Q10 18 16 26 Q22 34 28 26 Q34 18 36 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4" /></svg> },
  { id: "grid", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" opacity="0.85" /><rect x="22" y="6" width="12" height="12" rx="3" fill="currentColor" opacity="0.5" /><rect x="6" y="22" width="12" height="12" rx="3" fill="currentColor" opacity="0.5" /><rect x="22" y="22" width="12" height="12" rx="3" fill="currentColor" opacity="0.85" /></svg> },
  { id: "ring", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="5" fill="none" opacity="0.8" /><circle cx="20" cy="20" r="7" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.4" /></svg> },
  { id: "eye", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><ellipse cx="20" cy="20" rx="16" ry="10" fill="currentColor" opacity="0.5" /><circle cx="20" cy="20" r="6" fill="currentColor" opacity="0.85" /><circle cx="20" cy="20" r="2.5" fill="currentColor" opacity="0.3" /></svg> },
  { id: "flame", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><path d="M20 4 C20 4 30 14 30 24 C30 30 25 36 20 36 C15 36 10 30 10 24 C10 14 20 4 20 4Z" fill="currentColor" opacity="0.85" /><path d="M20 18 C20 18 25 22 25 27 C25 30 23 33 20 33 C17 33 15 30 15 27 C15 22 20 18 20 18Z" fill="currentColor" opacity="0.35" /></svg> },
];

const refinedIcons: Record<string, React.ReactNode> = {
  shield: <ShieldCheck className="h-full w-full" strokeWidth={1.8} />,
  sword: <Sword className="h-full w-full" strokeWidth={1.8} />,
  crown: <Crown className="h-full w-full" strokeWidth={1.8} />,
  lightning: <Zap className="h-full w-full" strokeWidth={1.8} fill="currentColor" fillOpacity={0.15} />,
  controller: <Gamepad2 className="h-full w-full" strokeWidth={1.8} />,
};

export const AVATAR_ICONS = BASE_AVATAR_ICONS.map((icon) => ({ ...icon, svg: refinedIcons[icon.id] || icon.svg }));

/** Record lookup for chat avatar rendering */
export const AVATAR_ICONS_MAP: Record<string, React.ReactNode> = Object.fromEntries(
  AVATAR_ICONS.map((i) => [i.id, i.svg])
);

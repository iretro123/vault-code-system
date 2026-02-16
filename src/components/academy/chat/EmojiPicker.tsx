import { useState, useMemo, useCallback, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile, Clock, Search } from "lucide-react";

/* ── Categorised emoji sets ── */

const CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    icon: "😀",
    emojis: [
      "😀","😂","🤣","😅","😊","😎","🤔","😤",
      "🥳","🤯","😢","😱","🥲","🫠","😏","🤩",
    ],
  },
  {
    label: "Gestures",
    icon: "👍",
    emojis: [
      "👍","👎","👀","💪","🙏","🫡","👏","🤝",
      "✌️","🤞","🫶","☝️","👋","🤙",
    ],
  },
  {
    label: "Trading",
    icon: "📈",
    emojis: [
      "📈","📉","💰","💸","🏆","🎯","💎","🐻",
      "🐂","📊","🪙","🏦","📋","🧾",
    ],
  },
  {
    label: "Symbols",
    icon: "🔥",
    emojis: [
      "🔥","💯","🚀","⚡","❤️","💀","✅","❌",
      "⚠️","🎉","⭐","💥","🔑","🛡️","🧊","🌙",
    ],
  },
];

const ALL_EMOJIS = CATEGORIES.flatMap((c) => c.emojis);
const RECENTS_KEY = "emoji_recents";
const MAX_RECENTS = 16;

function getRecents(): string[] {
  try {
    const stored = localStorage.getItem(RECENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecent(emoji: string) {
  const recents = getRecents().filter((e) => e !== emoji);
  recents.unshift(emoji);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<number | "recents">("recents");
  const [recents, setRecents] = useState<string[]>([]);

  // Refresh recents when popover opens
  useEffect(() => {
    if (open) {
      const r = getRecents();
      setRecents(r);
      setActiveTab(r.length > 0 ? "recents" : 0);
      setSearch("");
    }
  }, [open]);

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    // Simple label-based search using category names
    const results: string[] = [];
    for (const cat of CATEGORIES) {
      if (cat.label.toLowerCase().includes(q)) {
        results.push(...cat.emojis);
      }
    }
    // Also include any emoji that matches directly
    for (const e of ALL_EMOJIS) {
      if (!results.includes(e)) results.push(e);
    }
    return results;
  }, [search]);

  const handleSelect = useCallback(
    (emoji: string) => {
      addRecent(emoji);
      onSelect(emoji);
      setOpen(false);
    },
    [onSelect]
  );

  const displayEmojis = filteredEmojis
    ?? (activeTab === "recents" ? recents : CATEGORIES[activeTab as number]?.emojis ?? []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
          title="Emoji"
        >
          <Smile className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-[280px] p-0 bg-[#1a1a2e] border-white/10"
      >
        {/* Search */}
        <div className="flex items-center gap-2 px-2.5 py-2 border-b border-white/[0.06]">
          <Search className="h-3.5 w-3.5 text-white/30 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="flex-1 bg-transparent text-xs text-white placeholder:text-white/30 outline-none"
            autoFocus
          />
        </div>

        {/* Category tabs */}
        {!search.trim() && (
          <div className="flex items-center gap-0.5 px-2 py-1 border-b border-white/[0.06]">
            {recents.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("recents")}
                className={`p-1 rounded text-xs transition-colors ${
                  activeTab === "recents"
                    ? "bg-white/10 text-white"
                    : "text-white/30 hover:text-white/60 hover:bg-white/[0.06]"
                }`}
                title="Recent"
              >
                <Clock className="h-3.5 w-3.5" />
              </button>
            )}
            {CATEGORIES.map((cat, idx) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`p-1 rounded text-sm transition-colors leading-none ${
                  activeTab === idx
                    ? "bg-white/10"
                    : "hover:bg-white/[0.06]"
                }`}
                title={cat.label}
              >
                {cat.icon}
              </button>
            ))}
          </div>
        )}

        {/* Emoji grid */}
        <div className="p-2 max-h-[200px] overflow-y-auto">
          {displayEmojis.length === 0 ? (
            <p className="text-[11px] text-white/30 text-center py-4">
              {search ? "No results" : "No recent emojis yet"}
            </p>
          ) : (
            <div className="grid grid-cols-8 gap-0.5">
              {displayEmojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  type="button"
                  onClick={() => handleSelect(emoji)}
                  className="p-1.5 text-base rounded hover:bg-white/10 transition-colors text-center leading-none"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

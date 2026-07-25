import { useEffect, useMemo, useState } from "react";
import data from "@emoji-mart/data";
import { Clock, Search } from "lucide-react";
import { EmojiGlyph } from "./EmojiGlyph";

const RECENTS_KEY = "emoji_recents";
const MAX_RECENTS = 24;
const MAX_SEARCH_RESULTS = 96;

const CATEGORY_LABELS: Record<string, string> = {
  people: "Smileys & People",
  nature: "Animals & Nature",
  foods: "Food & Drink",
  activity: "Activity",
  places: "Travel & Places",
  objects: "Objects",
  symbols: "Symbols",
  flags: "Flags",
};

const CATEGORY_ICONS: Record<string, string> = {
  people: "🙂",
  nature: "🐶",
  foods: "🍔",
  activity: "🏈",
  places: "🚗",
  objects: "💡",
  symbols: "💠",
  flags: "🚩",
};

type EmojiSkin = {
  native?: string;
  unified?: string;
};

type EmojiRecord = {
  id: string;
  name?: string;
  keywords?: string[];
  skins?: EmojiSkin[];
};

type EmojiEntry = {
  id: string;
  native: string;
  unified?: string;
  name: string;
  keywords: string[];
};

type EmojiCategory = {
  id: string;
  label: string;
  icon: string;
  entries: EmojiEntry[];
};

interface NativeEmojiPickerProps {
  onSelect: (emoji: string) => void;
}

function readRecents(): string[] {
  try {
    const stored = localStorage.getItem(RECENTS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeRecent(emoji: string) {
  const next = [emoji, ...readRecents().filter((item) => item !== emoji)].slice(0, MAX_RECENTS);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]/g, " ");
}

const emojiDataset = (() => {
  const emojiMap = (data as any).emojis as Record<string, EmojiRecord>;
  const categories = ((data as any).categories as Array<{ id: string; emojis: string[] }>).map((category) => {
    const entries = category.emojis
      .map((id) => {
        const emoji = emojiMap[id];
        const native = emoji?.skins?.[0]?.native;
        if (!emoji || !native) return null;

        return {
          id,
          native,
          unified: emoji.skins?.[0]?.unified,
          name: emoji.name ?? id,
          keywords: emoji.keywords ?? [],
        };
      })
      .filter(Boolean) as EmojiEntry[];

    return {
      id: category.id,
      label: CATEGORY_LABELS[category.id] ?? category.id,
      icon: CATEGORY_ICONS[category.id] ?? "✨",
      entries,
    };
  }) as EmojiCategory[];

  const searchableEntries = Object.values(emojiMap).flatMap((emoji) => {
    const skins = emoji.skins ?? [];
    return skins
      .map((skin) => skin.native)
      .filter(Boolean)
      .map((native) => ({
        id: emoji.id,
        native,
        unified: skins.find((skin) => skin.native === native)?.unified,
        name: emoji.name ?? emoji.id,
        keywords: emoji.keywords ?? [],
      }));
  }) as EmojiEntry[];

  return { categories, searchableEntries };
})();

export function NativeEmojiPicker({ onSelect }: NativeEmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(() => (readRecents().length > 0 ? "recents" : "people"));
  const [recents, setRecents] = useState<string[]>(() => readRecents());

  useEffect(() => {
    setRecents(readRecents());
  }, []);

  const searchResults = useMemo(() => {
    const query = normalize(search.trim());
    if (!query) return [];

    const seen = new Set<string>();
    return emojiDataset.searchableEntries
      .filter((entry) => {
        const haystack = [
          entry.id,
          entry.name,
          ...entry.keywords,
        ]
          .map(normalize)
          .join(" ");
        return haystack.includes(query);
      })
      .filter((entry) => {
        if (seen.has(entry.native)) return false;
        seen.add(entry.native);
        return true;
      })
      .slice(0, MAX_SEARCH_RESULTS);
  }, [search]);

  const activeEntries = useMemo(() => {
    if (search.trim()) return searchResults;
    if (activeCategory === "recents") {
      return recents.map((native) => ({
        id: native,
        native,
        unified: undefined,
        name: native,
        keywords: [],
      }));
    }
    return emojiDataset.categories.find((category) => category.id === activeCategory)?.entries ?? [];
  }, [activeCategory, recents, search, searchResults]);

  const activeLabel = search.trim()
    ? "Search Results"
    : activeCategory === "recents"
      ? "Frequently used"
      : emojiDataset.categories.find((category) => category.id === activeCategory)?.label;

  const handleSelect = (emoji: string) => {
    writeRecent(emoji);
    setRecents(readRecents());
    onSelect(emoji);
  };

  return (
    <div className="chat-native-emoji-picker w-[352px] max-w-[calc(100vw-32px)] rounded-2xl bg-[#141414] shadow-[0_16px_40px_rgba(0,0,0,0.45)] overflow-hidden border border-white/[0.06]">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.06] overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveCategory("recents")}
          className={`chat-native-emoji-tab ${activeCategory === "recents" && !search ? "is-active" : ""}`}
          title="Frequently used"
        >
          <Clock className="h-5 w-5" />
        </button>
        {emojiDataset.categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => {
              setActiveCategory(category.id);
              setSearch("");
            }}
            className={`chat-native-emoji-tab chat-emoji ${activeCategory === category.id && !search ? "is-active" : ""}`}
            title={category.label}
          >
            <EmojiGlyph emoji={category.icon} className="h-5 w-5" />
          </button>
        ))}
      </div>

      <div className="p-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 rounded-xl border border-blue-500 bg-black px-3 h-11 focus-within:ring-1 focus-within:ring-blue-400">
          <Search className="h-5 w-5 text-white/55 shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent outline-none text-[17px] text-white placeholder:text-white/45"
            autoFocus
          />
        </div>
      </div>

      <div className="max-h-[330px] overflow-y-auto px-3 py-2">
        <p className="text-[17px] font-semibold text-white/80 mb-2">{activeLabel}</p>
        {activeEntries.length === 0 ? (
          <p className="text-sm text-white/45 py-8 text-center">
            {search.trim() ? "No emojis found" : "Select emojis to build your frequently used list"}
          </p>
        ) : (
          <div className="grid grid-cols-9 gap-1">
            {activeEntries.map((entry, index) => (
              <button
                key={`${entry.native}-${entry.id}-${index}`}
                type="button"
                title={entry.name}
                onClick={() => handleSelect(entry.native)}
                className="chat-native-emoji-button chat-emoji"
              >
                <EmojiGlyph emoji={entry.native} unified={entry.unified} label={entry.name} className="h-6 w-6" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Megaphone, Search, ArrowRight, Layers } from "lucide-react";

interface SearchResult {
  id: string;
  type: "module" | "lesson" | "announcement";
  title: string;
  subtitle?: string;
  path: string;
}

interface VaultSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const iconMap = {
  module: Layers,
  lesson: BookOpen,
  announcement: Megaphone,
};

const labelMap = {
  module: "Modules",
  lesson: "Lessons",
  announcement: "Announcements",
};

export function VaultSearchModal({ open, onOpenChange }: VaultSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // ⌘K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const searchTerm = `%${trimmed}%`;

      const [modulesRes, lessonsRes, announcementsRes] = await Promise.all([
        supabase
          .from("academy_modules")
          .select("id, title, subtitle, slug")
          .eq("visible", true)
          .or(`title.ilike.${searchTerm},subtitle.ilike.${searchTerm}`)
          .limit(5),
        supabase
          .from("academy_lessons")
          .select("id, lesson_title, module_title, module_slug")
          .eq("visible", true)
          .ilike("lesson_title", searchTerm)
          .limit(5),
        supabase
          .from("academy_announcements")
          .select("id, title, body")
          .ilike("title", searchTerm)
          .limit(5),
      ]);

      const mapped: SearchResult[] = [];

      modulesRes.data?.forEach((m) =>
        mapped.push({
          id: m.id,
          type: "module",
          title: m.title,
          subtitle: m.subtitle,
          path: `/academy/learn`,
        })
      );

      lessonsRes.data?.forEach((l) =>
        mapped.push({
          id: l.id,
          type: "lesson",
          title: l.lesson_title,
          subtitle: l.module_title,
          path: `/academy/learn`,
        })
      );

      announcementsRes.data?.forEach((a) =>
        mapped.push({
          id: a.id,
          type: "announcement",
          title: a.title,
          subtitle: a.body?.slice(0, 60),
          path: `/academy/room/announcements`,
        })
      );

      setResults(mapped);
      setSelectedIndex(0);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, open]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onOpenChange(false);
      navigate(result.path);
    },
    [navigate, onOpenChange]
  );

  // Keyboard nav
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    },
    [results, selectedIndex, handleSelect, onOpenChange]
  );

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  // Flat index for keyboard nav
  let flatIndex = 0;

  if (!open) return null;

  return (
    <div className="vault-spotlight-backdrop" onClick={() => onOpenChange(false)}>
      <div
        className="vault-spotlight-container"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="vault-spotlight-input-wrap">
          <Search className="h-5 w-5 text-muted-foreground/60 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules, lessons, announcements…"
            className="vault-spotlight-input"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="vault-spotlight-kbd">ESC</kbd>
        </div>

        {/* Results */}
        {query.trim().length < 2 ? (
          <div className="vault-spotlight-empty">
            <Search className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground/70">Search across Vault Academy</p>
            <p className="text-xs text-muted-foreground/40 mt-1.5">
              <kbd className="vault-spotlight-kbd-inline">⌘K</kbd> to toggle ·{" "}
              <kbd className="vault-spotlight-kbd-inline">ESC</kbd> to close
            </p>
          </div>
        ) : loading ? (
          <div className="vault-spotlight-results">
            {[1, 2, 3].map((i) => (
              <div key={i} className="vault-spotlight-shimmer" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="vault-spotlight-empty">
            <p className="text-sm text-muted-foreground/60">No results found</p>
            <p className="text-xs text-muted-foreground/40 mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="vault-spotlight-results">
            {(["module", "lesson", "announcement"] as const).map((type) => {
              const items = grouped[type];
              if (!items) return null;
              const Icon = iconMap[type];
              return (
                <div key={type}>
                  <p className="vault-spotlight-group-label">{labelMap[type]}</p>
                  {items.map((item) => {
                    const thisIndex = flatIndex++;
                    const isSelected = thisIndex === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(thisIndex)}
                        className={`vault-spotlight-item ${isSelected ? "vault-spotlight-item-active" : ""}`}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-sm text-foreground truncate">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground/60 truncate">{item.subtitle}</p>
                          )}
                        </div>
                        <ArrowRight className={`h-3.5 w-3.5 text-muted-foreground/30 shrink-0 transition-opacity duration-100 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

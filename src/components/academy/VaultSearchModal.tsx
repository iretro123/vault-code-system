import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Megaphone, MessageSquare, Search } from "lucide-react";

interface SearchResult {
  id: string;
  type: "lesson" | "announcement" | "message";
  title: string;
  subtitle?: string;
  path: string;
}

interface VaultSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VaultSearchModal({ open, onOpenChange }: VaultSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Keyboard shortcut
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

  // Debounced search
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const searchTerm = `%${trimmed}%`;

      const [lessonsRes, announcementsRes, messagesRes] = await Promise.all([
        supabase
          .from("academy_lessons")
          .select("id, lesson_title, module_title, module_slug")
          .ilike("lesson_title", searchTerm)
          .limit(5),
        supabase
          .from("academy_announcements")
          .select("id, title, body")
          .ilike("title", searchTerm)
          .limit(5),
        supabase
          .from("academy_messages")
          .select("id, body, room_slug, user_name")
          .ilike("body", searchTerm)
          .eq("is_deleted", false)
          .limit(5),
      ]);

      const mapped: SearchResult[] = [];

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

      messagesRes.data?.forEach((m) =>
        mapped.push({
          id: m.id,
          type: "message",
          title: m.body.length > 80 ? m.body.slice(0, 80) + "…" : m.body,
          subtitle: `${m.user_name} in #${m.room_slug}`,
          path: `/academy/room/${m.room_slug}`,
        })
      );

      setResults(mapped);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, open]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onOpenChange(false);
      navigate(result.path);
    },
    [navigate, onOpenChange]
  );

  const iconMap = {
    lesson: BookOpen,
    announcement: Megaphone,
    message: MessageSquare,
  };

  const labelMap = {
    lesson: "Lessons",
    announcement: "Announcements",
    message: "Messages",
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search lessons, announcements, messages…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim().length < 2 ? (
          <div className="py-8 text-center">
            <Search className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Type to search across Vault Academy</p>
            <p className="text-xs text-muted-foreground/60 mt-1">⌘K to toggle · ESC to close</p>
          </div>
        ) : loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Searching…</div>
        ) : (
          <>
            <CommandEmpty>No results found.</CommandEmpty>
            {Object.entries(grouped).map(([type, items]) => {
              const Icon = iconMap[type as keyof typeof iconMap];
              return (
                <CommandGroup key={type} heading={labelMap[type as keyof typeof labelMap]}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.title}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

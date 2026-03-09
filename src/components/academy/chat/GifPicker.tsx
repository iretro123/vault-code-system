import { useState, useCallback, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface GifResult {
  id: string;
  title: string;
  url: string;
  preview_url: string;
  width: number;
  height: number;
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
}

export function GifPicker({ onSelect }: GifPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchGifs = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("giphy-search", {
        body: query ? { q: query, type: "search" } : { type: "trending" },
      });
      if (error) throw error;
      setGifs(data?.gifs ?? []);
    } catch (e) {
      console.error("[GifPicker] fetch error:", e);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch trending on open
  useEffect(() => {
    if (open) {
      setSearch("");
      fetchGifs();
    }
  }, [open, fetchGifs]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) {
      fetchGifs();
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchGifs(search.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open, fetchGifs]);

  const handleSelect = useCallback(
    (gif: GifResult) => {
      onSelect(gif.url);
      setOpen(false);
    },
    [onSelect]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="px-1.5 py-1 rounded-lg text-[10px] font-bold tracking-wide text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors leading-none"
          title="GIF"
        >
          GIF
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-[320px] p-0 bg-[hsl(215,25%,10%)] border-[hsl(217,30%,18%)] shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
      >
        {/* Search */}
        <div className="flex items-center gap-2 px-2.5 py-2 border-b border-white/[0.06]">
          <Search className="h-3.5 w-3.5 text-white/30 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search GIFs…"
            className="flex-1 bg-transparent text-xs text-white placeholder:text-white/30 outline-none"
            autoFocus
          />
        </div>

        {/* Grid */}
        <div className="p-1.5 max-h-[280px] overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-2 gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-[100px] rounded-md bg-white/[0.06]" />
              ))}
            </div>
          ) : gifs.length === 0 ? (
            <p className="text-[11px] text-white/30 text-center py-6">
              {search ? "No GIFs found" : "No trending GIFs"}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => handleSelect(gif)}
                  className="rounded-md overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
                  title={gif.title}
                >
                  <img
                    src={gif.preview_url}
                    alt={gif.title}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                    style={{ minHeight: 60 }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GIPHY attribution */}
        <div className="px-2.5 py-1.5 border-t border-white/[0.06] flex justify-end">
          <span className="text-[9px] text-white/20">Powered by GIPHY</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";

const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    emojis: ["😂", "🤣", "😭", "😤", "🤔", "😎", "🥶", "😈"],
  },
  {
    label: "Hands & People",
    emojis: ["👍", "👎", "👏", "💪", "🙏", "🤝", "🫡", "👀"],
  },
  {
    label: "Symbols",
    emojis: ["❤️", "🔥", "💀", "💯", "🎯", "💎", "✅", "❌"],
  },
  {
    label: "Objects",
    emojis: ["💰", "📈", "📉", "🚀", "⚡", "🧠", "🎉", "🏆"],
  },
];

interface EmojiReactionPickerProps {
  onSelect: (emoji: string) => void;
  triggerClassName?: string;
}

export function EmojiReactionPicker({ onSelect, triggerClassName }: EmojiReactionPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors",
            triggerClassName
          )}
          title="Add reaction"
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={6}
        className="w-[280px] p-0 bg-card border-white/[0.1] shadow-xl rounded-xl overflow-hidden"
      >
        <div className="p-2 space-y-2">
          {EMOJI_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                {cat.label}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {cat.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onSelect(emoji);
                      setOpen(false);
                    }}
                    className="flex items-center justify-center h-8 w-8 rounded-lg text-lg hover:bg-white/[0.1] active:scale-90 transition-all duration-100"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

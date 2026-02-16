import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

const EMOJI_LIST = [
  "😀", "😂", "🤣", "😎", "🤔", "😤", "🥳", "🤯",
  "🔥", "💯", "🚀", "💪", "👍", "👎", "👀", "🎯",
  "📈", "📉", "💰", "💸", "🏆", "⚡", "❤️", "💀",
  "✅", "❌", "⚠️", "🙏", "😅", "🫡", "💎", "🐻",
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

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
        className="w-[240px] p-2 bg-[#1a1a2e] border-white/10"
      >
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              className="p-1.5 text-base rounded hover:bg-white/10 transition-colors text-center leading-none"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

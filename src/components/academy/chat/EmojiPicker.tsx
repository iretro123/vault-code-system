import { useState, lazy, Suspense } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import data from "@emoji-mart/data";

const Picker = lazy(() => import("@emoji-mart/react"));

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
        sideOffset={8}
        className="p-0 border-0 bg-transparent shadow-none w-auto"
      >
        <Suspense fallback={<div className="w-[352px] h-[435px] rounded-lg bg-[hsl(215,25%,10%)] animate-pulse" />}>
          <Picker
            data={data}
            theme="dark"
            set="native"
            navPosition="top"
            previewPosition="none"
            skinTonePosition="search"
            maxFrequentRows={2}
            perLine={9}
            emojiSize={22}
            emojiButtonSize={32}
            autoFocus
            onEmojiSelect={(e: { native: string }) => {
              if (e?.native) onSelect(e.native);
              setOpen(false);
            }}
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}

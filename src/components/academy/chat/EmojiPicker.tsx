import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { NativeEmojiPicker } from "./NativeEmojiPicker";

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
          className="p-2 min-w-10 min-h-10 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
          title="Emoji"
          aria-label="Emoji"
        >
          <Smile className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        onOpenAutoFocus={event=>event.preventDefault()}
        className="p-0 border-0 bg-transparent shadow-none w-auto"
      >
        <NativeEmojiPicker
          onClose={()=>setOpen(false)}
          onSelect={(emoji) => {
            onSelect(emoji);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

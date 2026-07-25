import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NativeEmojiPicker } from "./NativeEmojiPicker";

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
          aria-label="Add reaction"
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={6}
        className="p-0 border-0 bg-transparent shadow-none w-auto"
      >
        <NativeEmojiPicker
          onSelect={(emoji) => {
            onSelect(emoji);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

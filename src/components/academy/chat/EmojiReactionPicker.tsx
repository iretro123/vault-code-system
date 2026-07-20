import { useState, lazy, Suspense } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import data from "@emoji-mart/data";

const Picker = lazy(() => import("@emoji-mart/react"));

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

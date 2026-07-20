import { Sheet, SheetContent } from "@/components/ui/sheet";
import { EmojiReactionPicker } from "./EmojiReactionPicker";
import { QUICK_EMOJIS } from "@/hooks/useMessageReactions";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MessageActionSheetProps {
  open: boolean;
  onClose: () => void;
  onReact?: (emoji: string) => void;
  showReactions?: boolean;
  renderEmoji: (emoji: string, className?: string) => ReactNode;
  children: ReactNode;
}

/** Discord-style mobile bottom sheet: quick reactions row + action list. */
export function MessageActionSheet({
  open,
  onClose,
  onReact,
  showReactions = true,
  renderEmoji,
  children,
}: MessageActionSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className={cn(
          "p-0 rounded-t-2xl border-t border-white/[0.08] bg-[hsl(215,25%,9%)]",
          "max-h-[85vh] flex flex-col gap-0 shadow-[0_-8px_40px_rgba(0,0,0,0.5)]"
        )}
      >
        {/* Grabber */}
        <div className="mx-auto w-10 h-1 rounded-full bg-white/20 mt-2 mb-1 shrink-0" />

        {/* Quick reactions row */}
        {showReactions && onReact && (
          <div className="flex items-center justify-around gap-1 px-3 py-3 border-b border-white/[0.06] shrink-0">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji);
                  onClose();
                }}
                className="h-11 w-11 rounded-full bg-white/[0.05] flex items-center justify-center active:scale-90 active:bg-white/[0.12] transition-all"
              >
                {renderEmoji(emoji, "h-6 w-6")}
              </button>
            ))}
            <div className="h-11 w-11 rounded-full bg-white/[0.05] flex items-center justify-center overflow-hidden">
              <EmojiReactionPicker
                onSelect={(e) => {
                  onReact(e);
                  onClose();
                }}
                triggerClassName="!h-11 !w-11 !p-0 flex items-center justify-center !rounded-full !text-foreground/70 hover:!bg-transparent"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="overflow-y-auto py-2 pb-6" onClick={onClose}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Button styled to match sheet action row (used in place of DropdownMenuItem). */
export function SheetActionItem({
  onClick,
  className,
  children,
}: {
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-5 py-3.5 text-[15px] font-medium text-foreground",
        "active:bg-white/[0.08] transition-colors [&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:text-foreground/70",
        className
      )}
    >
      {children}
    </button>
  );
}

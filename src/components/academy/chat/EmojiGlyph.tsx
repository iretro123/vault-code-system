import { cn } from "@/lib/utils";
import { getAppleEmojiSprite } from "@/lib/appleEmojiSprite";

interface EmojiGlyphProps {
  emoji: string;
  unified?: string;
  label?: string;
  className?: string;
}

export function EmojiGlyph({ emoji, unified, label, className }: EmojiGlyphProps) {
  const sprite = getAppleEmojiSprite(emoji, unified);

  if (!sprite) {
    return <span className={cn("chat-emoji leading-none", className)}>{emoji}</span>;
  }

  return (
    <span
      role="img"
      aria-label={label ?? emoji}
      className={cn("chat-emoji-sprite", className)}
      style={sprite}
    />
  );
}


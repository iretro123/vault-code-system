const APPLE_EMOJI_ASSETS = import.meta.glob("/src/assets/apple-emoji/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function emojiFileName(emoji: string) {
  return Array.from(emoji)
    .map((char) => char.codePointAt(0)?.toString(16).toLowerCase().padStart(4, "0") ?? "")
    .join("-");
}

export function getAppleEmojiAsset(emoji: string): string | null {
  const fileName = emojiFileName(emoji);
  return APPLE_EMOJI_ASSETS[`/src/assets/apple-emoji/${fileName}.png`] ?? null;
}


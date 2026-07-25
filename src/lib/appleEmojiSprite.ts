import appleEmojiData from "emoji-datasource-apple";
import appleEmojiSheetUrl from "emoji-datasource-apple/img/apple/sheets-clean/64.png";

type AppleEmojiRecord = {
  unified: string;
  non_qualified?: string | null;
  image?: string;
  sheet_x: number;
  sheet_y: number;
  has_img_apple?: boolean;
};

export type AppleEmojiSprite = {
  backgroundImage: string;
  backgroundPosition: string;
  backgroundSize: string;
};

const SHEET_COLUMNS = 62;
const SHEET_ROWS = 62;

function normalizeUnified(value?: string | null) {
  return value?.toLowerCase() ?? "";
}

function emojiToUnified(emoji: string) {
  return Array.from(emoji)
    .map((char) => char.codePointAt(0)?.toString(16).toLowerCase().padStart(4, "0") ?? "")
    .filter(Boolean)
    .join("-");
}

const appleEmojiSpriteMap = (() => {
  const map = new Map<string, AppleEmojiRecord>();

  for (const record of appleEmojiData as AppleEmojiRecord[]) {
    if (!record.has_img_apple) continue;

    const keys = [
      normalizeUnified(record.unified),
      normalizeUnified(record.non_qualified),
      record.image?.replace(/\.png$/i, "").toLowerCase(),
    ].filter(Boolean) as string[];

    for (const key of keys) {
      if (!map.has(key)) map.set(key, record);
    }
  }

  return map;
})();

export function getAppleEmojiSprite(emoji: string, unified?: string): AppleEmojiSprite | null {
  const record = appleEmojiSpriteMap.get(normalizeUnified(unified)) ?? appleEmojiSpriteMap.get(emojiToUnified(emoji));
  if (!record) return null;

  const x = (record.sheet_x / (SHEET_COLUMNS - 1)) * 100;
  const y = (record.sheet_y / (SHEET_ROWS - 1)) * 100;

  return {
    backgroundImage: `url("${appleEmojiSheetUrl}")`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundSize: `${SHEET_COLUMNS * 100}% ${SHEET_ROWS * 100}%`,
  };
}

export function hasAppleEmojiSprite(emoji: string, unified?: string) {
  return Boolean(appleEmojiSpriteMap.get(normalizeUnified(unified)) ?? appleEmojiSpriteMap.get(emojiToUnified(emoji)));
}

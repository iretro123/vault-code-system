export type ChatEffectType = "shake" | "snow" | "confetti" | "rocket" | "gg" | null;

export function detectChatEffect(message: string): ChatEffectType {
  const text = message.trim();
  const lower = text.toLowerCase();

  // "67" anywhere in text
  if (/67/.test(text)) return "shake";

  // GG / gg (exact or within short message)
  if (/^g{2,}$/i.test(text) || /\bgg\b/i.test(lower)) return "gg";

  // Exact "W" or common hype phrases
  if (/^w+$/i.test(text) || /\blfg\b/i.test(lower) || /let'?s\s*go/i.test(lower)) return "confetti";

  // Moon / rocket
  if (/\bmoon\b/i.test(lower) || /🚀/.test(text)) return "rocket";

  // Snow
  if (/\bsnow\b/i.test(lower)) return "snow";

  return null;
}

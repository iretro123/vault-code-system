import { expect, it } from 'vitest';
import { sanitizeText, truncateText } from '@/lib/safeText';

it('preserves emoji, multi-codepoint sequences and international chat text', () => {
  const text = 'Hello 👩🏽‍💻 🚀 🇺🇸 café 日本語';
  expect(sanitizeText(text)).toBe(text);
});

it('removes NUL and malformed surrogates without removing adjacent text', () => {
  expect(sanitizeText('A\u0000B\ud800C\udc00D\ud83d\ude80')).toBe('ABCD🚀');
  expect(sanitizeText('\ud800\ud83d\ude80\udc00')).toBe('🚀');
});

it('does not cut a surrogate pair when truncating', () => {
  expect(truncateText('A🚀B', 2)).toBe('A…');
  expect(truncateText('A🚀B', 3)).toBe('A🚀…');
  expect(truncateText('A🚀B', 4)).toBe('A🚀B');
});

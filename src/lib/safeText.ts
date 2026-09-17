/**
 * Text safety helpers for chat payloads.
 *
 * Two real-world failure modes this prevents:
 * 1. Slicing a string with `.slice(0, n)` can cut an emoji in half (emoji are
 *    two UTF-16 units). The resulting lone surrogate makes JSON.stringify emit
 *    an unpaired \uD83D escape, which the API rejects with "Empty or invalid
 *    json" — the user just sees "Message failed to send".
 * 2. NUL characters (\u0000) cannot be stored in Postgres text columns.
 */

/** Remove characters that cannot be serialized or stored safely. */
export function sanitizeText(input: string): string {
  // Iterate code points instead of regex lookbehind, which older iOS WebViews
  // cannot parse. Valid emoji pairs stay intact; lone UTF-16 surrogates do not.
  let clean = "";
  for (const character of input) {
    const code = character.codePointAt(0)!;
    if (code !== 0 && (code < 0xd800 || code > 0xdfff)) clean += character;
  }
  return clean;
}

/**
 * Truncate without splitting emoji / surrogate pairs.
 * `max` is measured in UTF-16 units to stay compatible with previous limits.
 */
export function truncateText(input: string, max: number, ellipsis = "…"): string {
  if (input.length <= max) return sanitizeText(input);
  let end = max;
  const code = input.charCodeAt(end - 1);
  // If we landed in the middle of a surrogate pair, step back one unit.
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  return sanitizeText(input.slice(0, end)) + ellipsis;
}

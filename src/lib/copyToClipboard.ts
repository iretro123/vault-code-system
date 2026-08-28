/**
 * Cross-browser clipboard copy that works on iOS 13+, Android 10+,
 * and non-secure contexts where navigator.clipboard is unavailable.
 *
 * IMPORTANT: import this statically (never `await import(...)` inside a click
 * handler). Any await before the copy attempt can end the browser's
 * user-gesture window, which makes the first copy fail with NotAllowedError.
 */

/** Synchronous legacy copy — safe to run inside a gesture with no awaits. */
function legacyCopy(text: string): boolean {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    // Prevent scrolling / zoom on iOS
    textarea.style.cssText =
      "position:fixed;left:-9999px;top:-9999px;opacity:0;font-size:16px";
    document.body.appendChild(textarea);

    const selection = document.getSelection();
    const previousRange =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    textarea.focus();
    textarea.select();

    // iOS-specific range selection
    if (/ipad|iphone|ipod/i.test(navigator.userAgent)) {
      const range = document.createRange();
      range.selectNodeContents(textarea);
      selection?.removeAllRanges();
      selection?.addRange(range);
      textarea.setSelectionRange(0, text.length);
    }

    const ok = document.execCommand("copy");

    document.body.removeChild(textarea);
    if (previousRange && selection) {
      selection.removeAllRanges();
      selection.addRange(previousRange);
    }
    return ok;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Modern path — only reliable when the document actually holds focus.
  // Menus/portals closing can steal focus, which rejects the write.
  if (navigator.clipboard?.writeText) {
    try {
      if (!document.hasFocus()) window.focus();
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy path
    }
  }

  return legacyCopy(text);
}

/**
 * Gesture-safe copy: tries the synchronous legacy path first so the very first
 * click always works, then falls back to the async clipboard API.
 */
export function copyToClipboardSync(text: string): Promise<boolean> {
  if (!text) return Promise.resolve(false);
  if (legacyCopy(text)) return Promise.resolve(true);
  return copyToClipboard(text);
}

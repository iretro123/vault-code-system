/**
 * Cross-browser clipboard copy that works on iOS 13+, Android 10+,
 * and non-secure contexts where navigator.clipboard is unavailable.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern path — available in secure contexts on newer browsers
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy path
    }
  }

  // Legacy fallback — works in older WebViews and non-HTTPS
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    // Prevent scrolling on iOS
    textarea.style.cssText =
      "position:fixed;left:-9999px;top:-9999px;opacity:0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    // iOS-specific range selection
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      textarea.setSelectionRange(0, text.length);
    }

    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function openExternalUrl(url: string) {
  // noopener intentionally permits a null handle even when the tab opens.
  // Never use that return value to navigate away and discard the current task.
  window.open(url, "_blank", "noopener,noreferrer");
}

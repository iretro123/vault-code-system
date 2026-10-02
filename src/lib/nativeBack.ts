/** Android Back dismisses the top overlay before navigating away from a page. */
export function handleNativeBack(canGoBack: boolean, exitApp: () => void) {
  const overlays = document.querySelectorAll<HTMLElement>(
    '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"], [data-state="open"][role="menu"], [data-state="open"][role="listbox"]',
  );
  if (overlays.length) {
    // Radix dismissable layers already implement Escape, including nested layers
    // and dialogs that deliberately prevent dismissal (e.g. unsaved changes).
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    return;
  }
  if (canGoBack) window.history.back();
  else exitApp();
}

export async function installNativeBack() {
  const { App } = await import('@capacitor/app');
  return App.addListener('backButton', ({ canGoBack }) => {
    handleNativeBack(canGoBack, () => { void App.exitApp(); });
  });
}

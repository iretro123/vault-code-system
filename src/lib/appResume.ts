import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';

/** Native foreground events do not reliably fire DOM focus/visibility events. */
export function onNativeAppState(callback: (active: boolean) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  let disposed = false;
  let handle: PluginListenerHandle | undefined;
  void App.addListener('appStateChange', ({ isActive }) => {
    if (!disposed) callback(isActive);
  }).then(listener => {
    if (disposed) void listener.remove();
    else handle = listener;
  }).catch(() => { /* DOM/network recovery remains available on older binaries. */ });
  return () => { disposed = true; void handle?.remove(); };
}

import { useEffect, useState } from "react";

export function ChatConnectionStatus({ reconnecting }: { reconnecting: boolean }) {
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(document.visibilityState === "visible");
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const visibility = () => setForeground(document.visibilityState === "visible");
    const network = () => setOnline(navigator.onLine);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
    };
  }, []);
  useEffect(() => {
    // Give suspended sockets time to recover without announcing a false failure.
    setVisible(false);
    if (!foreground || !online || !reconnecting) return;
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, [reconnecting, foreground, online]);
  if (!foreground || (online && (!reconnecting || !visible))) return null;
  return <p role="status" className="community-connection-status">{online ? "Restoring chat connection…" : "You're offline. Chat will update when you're back online."}</p>;
}

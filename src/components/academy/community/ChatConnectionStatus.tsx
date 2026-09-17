import { useEffect, useState } from "react";

export function ChatConnectionStatus({ reconnecting }: { reconnecting: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Ignore momentary reconnects; require stable recovery before hiding.
    const timer = setTimeout(() => setVisible(reconnecting), reconnecting ? 1500 : 3000);
    return () => clearTimeout(timer);
  }, [reconnecting]);
  if (!visible) return null;
  return <p role="status" className="community-connection-status">Reconnecting to chat…</p>;
}

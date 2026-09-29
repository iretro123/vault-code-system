import { useEffect, useState } from "react";
import { ChatAvatar } from "@/lib/chatAvatars";
import "./vault-arrival.css";

export function VaultArrival({ name, avatarUrl, onComplete }: {
  name: string; avatarUrl: string | null; onComplete: () => Promise<void>;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      onComplete().catch(() => { if (active) setFailed(true); });
    }, reduced ? 150 : 2000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [onComplete]);

  return <div className="vault-arrival" role="status" aria-live="polite">
    <div className="vault-arrival-light" aria-hidden="true"/>
    <div className="vault-arrival-content">
      <span className="vault-arrival-wordmark">VAULT <b>OS</b></span>
      <div className="vault-arrival-avatar"><ChatAvatar avatarUrl={avatarUrl || "initials:hsl(217, 91%, 60%)"} userName={name} size="h-24 w-24"/></div>
      <h2>You're in, {name}.</h2>
      <p>{failed ? "Your setup is saved. Let's open your dashboard." : "Welcome to your Vault."}</p>
      <div className="vault-arrival-line" aria-hidden="true"><span/></div>
      {failed && <button onClick={() => { setFailed(false); void onComplete().catch(() => setFailed(true)); }}>Open dashboard</button>}
    </div>
  </div>;
}

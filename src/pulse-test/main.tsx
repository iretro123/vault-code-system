import { createRoot } from "react-dom/client";
import { useState } from "react";
import { Radio, MessageCircle, ArrowUpRight } from "lucide-react";
import { SpxPulseRoom } from "@/components/academy/community/SpxPulseRoom";
import "@/index.css";
import "@/pages/academy/academy-community.css";
import "./preview.css";

// An isolated dev entry imports the real component and Community CSS, without auth,
// member queries, entitlements, or any production message/push side effects.
function PulseTest() {
  const [tab, setTab] = useState("Signals");
  return <main className="pulse-test-page"><div className="pulse-test-brand"><span className="pulse-test-logo">V</span><strong>VAULT<span>OS</span></strong><span className="pulse-test-divider"/><span>Community</span><a href="/academy/community?tab=daily-setups&preview=spx500-pulse">Open in app <ArrowUpRight size={13}/></a></div>
    <div className="vault-community pulse-test-community"><div className="pulse-test-shell">
      <div className="community-heading"><div className="community-title-row"><h1>Community</h1><span className="pulse-test-tag"><Radio size={12}/> PRIVATE TEST</span></div><div className="pulse-test-note"><MessageCircle size={15}/> Your room. Your indicator.</div></div>
      <nav className="community-room-tabs" aria-label="Community rooms">{["Chat","Signals","Wins"].map(t=><button key={t} aria-current={tab===t ? "page" : undefined} onClick={()=>setTab(t)}>{t}</button>)}</nav>
      <div className="pulse-test-content">{tab === "Signals" ? <SpxPulseRoom source="local"/> : <div className="pulse-test-placeholder"><MessageCircle size={28}/><h2>{tab}</h2><p>Your member conversations stay in the app.</p><button onClick={()=>setTab("Signals")}>Back to SPX500 Pulse</button></div>}</div>
    </div></div><p className="pulse-test-outside">LOCAL TEST · No member posts or notifications</p>
  </main>;
}
if (import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(location.hostname)) createRoot(document.getElementById("root")!).render(<PulseTest/>);

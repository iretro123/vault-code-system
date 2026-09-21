import { useState } from "react";
import { Play, Share2, X } from "lucide-react";
import { AddClassCalendar } from './AddClassCalendar';
import { copyToClipboard } from "@/lib/copyToClipboard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import classroomImage from "@/assets/classroom-open.svg";
import "./vault-live-preview.css";

const DEFAULT_TRADING_ZOOM_URL = "https://us06web.zoom.us/j/84498145528?pwd=iQ6BKlXurpYAhh2d7F0BiKTUylMsxG.1";

const classrooms = [
  { name: "Live Trading", days: "Monday–Thursday", time: "9:15 AM", description: "Watch the market and learn together.", bullets: ["Watch the market live together", "Understand the thinking behind each setup", "Ask questions as the session unfolds"], action: "Open trading room" },
  { name: "Wednesday Class", days: "Every Wednesday", time: "8:00 PM", description: "Learn a concept. Ask your questions.", bullets: ["Break down one trading concept", "Work through real chart examples", "Get answers in a relaxed Q&A"], action: "Open training room" },
];

export default function VaultLivePreview() {
  const [classroomOpen, setClassroomOpen] = useState(() => new URLSearchParams(window.location.search).get('open') === '1');
  const [activeClass, setActiveClass] = useState(() => new URLSearchParams(window.location.search).get('class') === 'wednesday' ? 1 : 0);
  const [sharing, setSharing] = useState(false);
  const [inviteStatus, setInviteStatus] = useState("");
  const [showInviteLink, setShowInviteLink] = useState(false);
  const current = classrooms[activeClass];
  const zoomUrl = activeClass === 0 ? (import.meta.env.VITE_VAULT_TRADING_ZOOM_URL || DEFAULT_TRADING_ZOOM_URL) : import.meta.env.VITE_VAULT_WEDNESDAY_ZOOM_URL;

  async function inviteFriends() {
    if (!zoomUrl || sharing) return;
    setSharing(true);
    setInviteStatus("");
    setShowInviteLink(false);
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: "Vault Live | Wednesday Class", text: "Join me for the Vault Wednesday class at 8 PM Eastern!", url: zoomUrl });
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
          // Unsupported or blocked sharing falls back to copying the room link.
        }
      }
      const copied = await copyToClipboard(zoomUrl);
      setInviteStatus(copied ? "Link copied! Paste it into a message to invite a friend." : "Select and copy the link below to invite a friend.");
      setShowInviteLink(!copied);
    } finally {
      setSharing(false);
    }
  }

  return <main className="vault-live-preview">
    <header className="vl-header">
      <h1>Vault <span>Live</span></h1>
    </header>

    <div className="vl-class-tabs" role="tablist" aria-label="Choose your classroom">
      {classrooms.map((room, index) => <button key={room.name} id={`class-tab-${index}`} role="tab" aria-selected={activeClass === index} aria-controls="class-panel" tabIndex={activeClass === index ? 0 : -1} onClick={() => setActiveClass(index)} onKeyDown={event => {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
          setActiveClass(next);
          document.getElementById(`class-tab-${next}`)?.focus();
        }
      }}>{room.name}</button>)}
    </div>
    <section id="class-panel" role="tabpanel" aria-labelledby={`class-tab-${activeClass}`} className={`vl-classroom vl-focused-class ${activeClass === 1 ? "vl-training-class" : ""}`}>
      <div className="vl-classroom-copy">
        <p className="vl-class-days">{current.days}</p>
        <h2 className="vl-class-time">{current.time} <span>Eastern</span></h2>
        <ul className="vl-class-bullets">{current.bullets.map(point => <li key={point}>{point}</li>)}</ul>
        <button className="vl-join" onClick={() => setClassroomOpen(true)}><Play size={20} fill="currentColor" /> {current.action}</button>
      </div>
      <img src={classroomImage} alt="A classroom board showing a simple trading chart" />
    </section>
    <AddClassCalendar key={activeClass} wednesday={activeClass === 1} zoomUrl={zoomUrl}/>

    <Dialog open={classroomOpen} onOpenChange={open => { setClassroomOpen(open); setInviteStatus(""); setShowInviteLink(false); }}>
      <DialogContent className="vl-dialog sm:max-w-lg">
        <DialogHeader><DialogTitle>{current.name}</DialogTitle><DialogDescription>{zoomUrl ? "Your dedicated room is ready. Join on Zoom when class starts." : "The room link isn’t available yet. Please contact support."}</DialogDescription></DialogHeader>
        {activeClass === 0 && <p>{current.days} · {current.time} Eastern</p>}
        {activeClass === 0 ? <section className="vl-rules-board" aria-labelledby="vl-rules-heading">
          <div className="vl-rules-copy">
            <h3 id="vl-rules-heading">Before joining the call</h3>
            <ul>
              <li>Do your own due diligence.</li>
              <li>Always apply risk management.</li>
              <li>Your trades. Your decisions.</li>
            </ul>
          </div>
        </section> : <img src={classroomImage} alt="Classroom chalkboard" />}
        {activeClass !== 0 && <p>{current.days} · {current.time} Eastern</p>}
        {zoomUrl && <div className={activeClass === 0 ? "vl-guided-join" : "vl-zoom-action"}>
          {activeClass === 0 && <svg className="vl-join-arrow" viewBox="0 0 120 64" fill="none" aria-hidden="true"><path d="M108 5C112 30 55 8 44 32C40 40 45 48 52 56M37 51L52 57L56 41" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          <a className="vl-join" href={zoomUrl} target="_blank" rel="noopener noreferrer"><Play size={18} /> Join on Zoom</a>
        </div>}
        {activeClass === 1 && zoomUrl && <div className="vl-invite-action">
          <button className="vl-join vl-invite" onClick={inviteFriends} disabled={sharing}><Share2 size={18} /> {sharing ? "Opening share…" : "Invite friends"}</button>
          <p role="status" aria-live="polite">{inviteStatus}</p>
          {showInviteLink && <input aria-label="Wednesday class invite link" readOnly value={zoomUrl} onFocus={event => event.currentTarget.select()} />}
        </div>}
        <button className="vl-join" onClick={() => setClassroomOpen(false)}><X size={18} /> Back to Vault Live</button>
      </DialogContent>
    </Dialog>
  </main>;
}

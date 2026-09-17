import { CalendarCheck, Check, ArrowUpRight } from "lucide-react";
import "./schedule-training-preview.css";

const bookingUrl = "https://calendly.com/rz_/vault-os-support-calls-1-on-1";
const introVideoUrl = import.meta.env.VITE_VAULT_TRAINING_INTRO_URL;

export default function ScheduleTrainingPreview() {
  return <main className="schedule-training">
    <header className="st-header">
      <p className="st-eyebrow"><CalendarCheck size={18} aria-hidden="true" /> Schedule 1:1</p>
      <h1>Stop piecing it together.<br /><span>Get a clear next step.</span></h1>
      <p>More videos won’t answer every question. Sit down with RZ, work through what’s holding you back, and build a plan for what to practice next.</p>
      <span className="st-days">Tuesdays & Thursdays</span>
    </header>

    {introVideoUrl && <section className="st-video-section" aria-label="Introduction to one-on-one training">
      <div className="st-player">
        <video className="st-video" src={introVideoUrl} controls playsInline preload="metadata" aria-label="One-on-one training with RZ" />
      </div>
    </section>}

    <section className="st-details" aria-labelledby="st-session-heading">
      <h2 id="st-session-heading">Don’t carry the same questions into another week.</h2>
      <p>Bring a chart, a lesson, or the part that still doesn’t make sense. Your call starts there—not with another generic lecture.</p>
      <ul>
        <li><Check aria-hidden="true" /><div><strong>Find where you’re getting stuck.</strong><span>Walk RZ through your thinking and identify the concepts that need more work.</span></div></li>
        <li><Check aria-hidden="true" /><div><strong>Turn “I’ve seen this” into “I understand it.”</strong><span>Break down chart examples together, with room to pause and ask why.</span></div></li>
        <li><Check aria-hidden="true" /><div><strong>Leave with a focused practice plan.</strong><span>Know which lesson to revisit, what to practice, and where to put your attention next.</span></div></li>
      </ul>
      <div className="st-booking">
        <a href={bookingUrl} target="_blank" rel="noopener noreferrer"><CalendarCheck size={21} aria-hidden="true" /> Book your one-on-one call <ArrowUpRight size={20} aria-hidden="true" /></a>
        <p>Choose a time that works for you on Calendly.</p>
      </div>
    </section>
  </main>;
}

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import home from "@/assets/onboarding-tour/home.png";
import learn from "@/assets/onboarding-tour/learn.png";
import community from "@/assets/onboarding-tour/community.png";
import live from "@/assets/onboarding-tour/live.png";
import trade from "@/assets/onboarding-tour/trade.png";
import coach from "@/assets/onboarding-tour/coach.png";
import "./vault-screen-tour.css";

const FEATURES = [
  { title: "Home", headline: "Start every day HERE.", subtext: "Your lessons, live sessions, and community in one place.", image: home },
  { title: "Learn", headline: "Build skill. One lesson at a time.", subtext: "Learn the basics. Grow at your own pace.", image: learn },
  { title: "Community", headline: "Find your trading people.", subtext: "Share wins, ask questions, and learn together.", image: community },
  { title: "Vault Live", headline: "Join the room. Learn live.", subtext: "Watch the process. Ask questions in real time.", image: live },
  { title: "Trade OS", headline: "Plan your risk before your trade.", subtext: "Set your daily limit before you enter.", image: trade },
  { title: "Ask Coach", headline: "Turn questions into clarity.", subtext: "Get a simpler explanation when something doesn't click.", image: coach },
] as const;

export function VaultTourCarousel({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(!document.hidden);
  const [failed, setFailed] = useState(false);
  const feature = FEATURES[index];

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!playing || !visible) return;
    const timer = window.setTimeout(() => {
      setIndex(current => (current + 1) % FEATURES.length);
      setFailed(false);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [index, playing, visible]);

  useEffect(() => {
    const nextImage = new Image();
    nextImage.src = FEATURES[(index + 1) % FEATURES.length].image;
  }, [index]);

  const select = (next: number) => { setIndex(next); setFailed(false); };

  return <div className="vault-screen-tour" data-playing={playing && visible}>
    <div className="vault-screen-tabs" role="group" aria-label="Explore Vault features">
      {FEATURES.map((item, i) => <button key={item.title} type="button" aria-pressed={i === index} onClick={() => select(i)}>{item.title}</button>)}
    </div>
    <div className="vault-screen-slide" key={feature.title}>
      <h2>{feature.title === "Vault Live" ? <>Join the room. Learn <span className="vault-tour-live-word">LIVE.</span></> : feature.title === "Trade OS" ? <>Plan your <span className="vault-tour-risk-word">RISK</span> before your trade.</> : feature.headline}</h2>
      <p className="vault-screen-subtext">{feature.subtext}</p>
      <div className="vault-mobile-stage">
      <div className="vault-screen-image">
        <img src={feature.image} alt={`${feature.title}: mobile screenshot of the Vault OS app`} decoding="async" onError={() => {setFailed(true); setPlaying(false);}} />
        {failed && <div className="vault-screen-error">Preview unavailable. You can still explore the next section.</div>}
      </div>
      </div>
    </div>
    <div className="vault-screen-playback">
      <button type="button" aria-label="Previous tour feature" onClick={() => select((index + FEATURES.length - 1) % FEATURES.length)}><ArrowLeft size={18}/></button>
      <div className="vault-screen-meter" aria-label={`Feature ${index + 1} of ${FEATURES.length}`}>
        {FEATURES.map((item, i) => <span key={item.title} data-active={i === index}><i key={`${index}-${playing}`}/></span>)}
      </div>
      <button type="button" aria-label={playing ? "Pause tour" : "Play tour"} onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={17}/> : <Play size={17}/>}</button>
      <button type="button" aria-label="Next tour feature" onClick={() => select((index + 1) % FEATURES.length)}><ArrowRight size={18}/></button>
    </div>
    <button type="button" className="vault-tour-continue" onClick={onComplete}>Continue<ArrowRight size={18}/></button>
  </div>;
}

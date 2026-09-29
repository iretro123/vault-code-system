import { useEffect, useState, type CSSProperties } from "react";
import "./pulse-nexus.css";

const stars = [
  [17, 32, 1], [36, 14, .8], [75, 10, 1.2], [119, 24, .8],
  [139, 57, 1.2], [127, 99, .9], [93, 117, 1], [49, 113, .7],
  [12, 83, .9], [28, 64, .6], [110, 45, .7], [62, 96, .6],
];

const motionKey = "vault-pulse-galaxy-motion";
function motionPreference() {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem(motionKey);
    if (saved === "on" || saved === "off") return saved === "on";
  } catch { /* Storage may be unavailable in private browsing. */ }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Decorative motion; the feed's text remains the source of connection status. */
export function PulseNexus({ moving = true }: { moving?: boolean }) {
  const [animate, setAnimate] = useState(motionPreference);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAnimate(motionPreference());
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const toggleMotion = () => {
    const next = !animate;
    setAnimate(next);
    try { localStorage.setItem(motionKey, next ? "on" : "off"); } catch { /* Keep the in-memory choice. */ }
  };
  const label = animate ? "Pause galaxy animation" : "Animate galaxy";
  return <button type="button" className="pulse-nexus" data-moving={moving} data-motion={animate ? "on" : "off"} aria-label={label} aria-pressed={animate} title={label} onClick={toggleMotion}>
    <span className="nexus-halo" />
    <svg className="nexus-stars" viewBox="0 0 152 128" fill="currentColor" aria-hidden="true">
      {stars.map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} />)}
    </svg>
    <span className="nexus-galaxy"><span className="nexus-nebula" /></span>
    {[-28, 48, 108].map((tilt, i) => <span className="nexus-orbit" key={tilt} style={{ "--tilt": `${tilt}deg`, "--duration": `${14 + i * 7}s`, "--delay": `${-i * 5}s` } as CSSProperties}>
      <span className="nexus-orbit-wheel"><i /><i /></span>
    </span>)}
    <span className="nexus-core"><span className="nexus-clouds" /><span className="nexus-shine" /></span>
    <span className="nexus-flare" />
  </button>;
}
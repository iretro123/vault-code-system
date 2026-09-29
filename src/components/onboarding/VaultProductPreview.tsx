import { useEffect, useState } from "react";
import { MessageCircle, Pause, Play, Radio, Trophy } from "lucide-react";
import community from "@/assets/intro/intro-community.jpg";
import wins from "@/assets/intro/intro-wins.jpg";
import live from "@/assets/intro/intro-live.jpg";
import rz from "@/assets/rz-avatar.png";
import "./vault-device-showcase.css";

export function VaultMark() {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M3 6h7l7 14 8-14h6L17 30Z" fill="currentColor"/><path d="m3 6 7 0 7 14-3 6Z" fill="white" fillOpacity=".5"/></svg>;
}

const SCENES = [
  { label: "The conversation", title: "Your people. Your trading floor.", detail: "Talk through the session together.", image: community, phone: wins, icon: MessageCircle, caption: "Community conversations", position: "community" },
  { label: "The wins", title: "Share the moment. Learn the lesson.", detail: "A place for progress, big and small.", image: wins, phone: community, icon: Trophy, caption: "Member-shared wins", position: "wins" },
  { label: "The live room", title: "Show up. Ask. Learn together.", detail: "Trading sessions and Wednesday training.", image: live, phone: community, icon: Radio, caption: "Live-session experience", position: "live" },
] as const;

export function VaultProductPreview({ index = 0 }: { index?: number }) {
  const initial = index === 3 ? 2 : index === 4 ? 1 : 0;
  const [sceneIndex, setSceneIndex] = useState(initial);
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => setReducedMotion(media.matches);
    const onVisibility = () => setVisible(!document.hidden);
    onMotion(); onVisibility();
    media.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { media.removeEventListener("change", onMotion); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  useEffect(() => {
    if (!playing || !visible) return;
    const timer = window.setTimeout(() => setSceneIndex(current => (current + 1) % SCENES.length), 6000);
    return () => window.clearTimeout(timer);
  }, [playing, visible, sceneIndex]);

  const scene = SCENES[sceneIndex];
  const Icon = scene.icon;
  return <div className="vault-film" data-playing={playing && visible} data-reduced-motion={reducedMotion}>
    <div className="vault-device-stage" key={sceneIndex} data-scene={scene.position}>
      <div className="vault-stage-light" aria-hidden="true"/>
      <div className="vault-laptop">
        <div className="vault-laptop-lid">
          <span className="vault-laptop-camera"/>
          <div className="vault-laptop-screen">
            <div className="vault-device-toolbar"><span>Vault OS</span><small>{scene.caption}</small></div>
            <div className="vault-screen-capture"><img src={scene.image} alt={`Saved Vault screenshot: ${scene.caption}`} draggable={false}/></div>
          </div>
        </div>
        <div className="vault-laptop-base"><span/></div>
      </div>
      <div className="vault-iphone">
        <div className="vault-phone-screen"><div className="vault-phone-status"><span>9:41</span><i/><span>▰</span></div><img src={wins} alt="Vault iPhone preview: member-shared wins" draggable={false}/><div className="vault-home-indicator"/></div>
      </div>
      <div className="vault-film-badge"><img src={rz} alt="RZ"/><span>Learn with RZ<small>Inside the Vault community</small></span></div>
    </div>
    <div className="vault-film-caption"><span className="vault-film-icon"><Icon size={19}/></span><div><strong>{scene.title}</strong></div></div>
    <div className="vault-film-controls"><div role="group" aria-label="Preview scenes">{SCENES.map((item,i)=><button key={item.label} type="button" aria-label={`Show ${item.label}`} aria-pressed={i===sceneIndex} onClick={()=>{setSceneIndex(i);setPlaying(true);}}><span><i key={`${sceneIndex}-${playing}`} /></span></button>)}</div><button className="vault-film-pause" type="button" aria-label={playing?"Pause preview":"Play preview"} onClick={()=>setPlaying(value=>!value)}>{playing?<Pause size={15}/>:<Play size={15}/>}</button></div>
  </div>;
}

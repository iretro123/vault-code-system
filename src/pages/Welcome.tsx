import { useLayoutEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Crown, MessageCircle, Radio, Users, Video, Wrench } from "lucide-react";
import { isNativeAndroidApp, isNativeIOSApp } from "@/lib/platform";
import { VAULT_OS_MONTHLY_FALLBACK_PRICE, VAULT_OS_PRIVACY_POLICY_URL, VAULT_OS_TERMS_URL } from "@/lib/membership";
import finn from "@/assets/vault-avatars/pixel-finn.png";
import owl from "@/assets/vault-avatars/market-owl.png";
import panda from "@/assets/vault-avatars/breakout-panda.png";
import orbit from "@/assets/vault-avatars/orbit-cat.png";
import "./welcome.css";

export default function Welcome() {
  const [params, setParams] = useSearchParams();
  const choosing = params.get("step") === "access";
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (root.current) root.current.scrollTop = 0;
    root.current?.querySelector<HTMLElement>("h1")?.focus({preventScroll:true});
  }, [choosing]);

  return <main ref={root} className="vault-entry academy-main-safe">
    <div className="vault-entry-shell">
      <header className="vault-entry-header">
        {choosing ? <button className="vault-entry-back" aria-label="Back to welcome" onClick={() => setParams({}, {replace:true})}><ArrowLeft size={20}/></button> : null}
        <span className="vault-entry-brand">VAULT <b>OS</b></span>
        <Link to="/auth">Log in</Link>
      </header>
      {choosing ? <section key="access" className="vault-entry-access">
        <div className="vault-entry-title"><h1 tabIndex={-1}>Choose your access.</h1><p>Start free or unlock the full experience.</p></div>
        <article className="vault-plan">
          <div className="vault-plan-heading"><span className="vault-plan-icon"><Users/></span><div><h2>Free Community</h2><p>Free</p></div></div>
          <ul><li><MessageCircle/>Community chat</li><li><BookOpen/>One free course</li></ul>
          <Link className="vault-entry-button vault-entry-button--secondary" to="/create-account">Join free<ArrowRight size={18}/></Link>
        </article>
        <article className="vault-plan vault-plan--full">
          <div className="vault-plan-heading"><span className="vault-plan-icon"><Crown/></span><div><h2>Full Access</h2><p>{VAULT_OS_MONTHLY_FALLBACK_PRICE.replace("/month", " / month")}</p></div></div>
          <ul><li><Users/>Everything in Free</li><li><Video/>Live sessions &amp; full training</li><li><Wrench/>Trading tools + AI features</li><li><Radio aria-hidden="true"/><span className="vault-plan-live-feature"><span className="vault-plan-live-badge">LIVE</span>Supply &amp; demand zones</span></li></ul>
          <Link className="vault-entry-button" to="/create-account/full">Get full access<ArrowRight size={18}/></Link>
        </article>
        <p className="vault-entry-login">Already registered? <Link to="/auth">Log in</Link></p>
      </section> : <section key="welcome" className="vault-entry-intro">
        <div className="vault-entry-art" role="img" aria-label="Illustrative community messages: Just traded SPY, 15% win. Joined the live trading session. Example messages, not verified results.">
          <div className="vault-entry-orbit"/>
          <img className="vault-entry-person vault-entry-person--main" src={finn} alt=""/>
          <img className="vault-entry-person vault-entry-person--one" src={owl} alt=""/>
          <img className="vault-entry-person vault-entry-person--two" src={panda} alt=""/>
          <img className="vault-entry-person vault-entry-person--three" src={orbit} alt=""/>
          <div className="vault-entry-bubble vault-entry-bubble--one"><span>Just traded SPY.<br/><strong>15% win!</strong></span></div>
          <div className="vault-entry-bubble vault-entry-bubble--two"><span>Joined the <b>LIVE</b><br/>trading session.</span></div>
          <span className="vault-entry-preview-caption">Community preview</span>
        </div>
        <div className="vault-entry-title"><h1 tabIndex={-1}>Your trading<br/>community<br/><span>starts here.</span></h1><p>Learn, connect, and build your process.</p></div>
        <div className="vault-entry-start"><button className="vault-entry-button" onClick={() => setParams({step:"access"})}>Get started<ArrowRight size={20}/></button><p className="vault-entry-login">Already have an account? <Link to="/auth">Log in</Link></p></div>
      </section>}
      <footer className="vault-entry-footer">
        <Link to="/membership">{isNativeIOSApp() ? "Restore Apple Purchase" : isNativeAndroidApp() ? "Restore Google Play Purchase" : "Manage membership"}</Link>
        <span><a href={VAULT_OS_TERMS_URL} target="_blank" rel="noopener noreferrer">Terms</a><i aria-hidden="true">·</i><a href={VAULT_OS_PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">Privacy</a></span>
      </footer>
    </div>
  </main>;
}

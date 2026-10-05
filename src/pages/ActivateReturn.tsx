import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ensureProfile } from '@/lib/ensureProfile';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export const ACTIVATION_RESEND_SECONDS = 60;
const ACTIVATION_REDIRECT = 'https://member.vaulttradingacademy.com/activate-return';

/** True when the email link that brought the user here was expired or already used. */
export function activationLinkFailed(search: string, hash: string): boolean {
  const q = new URLSearchParams(search);
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  const code = q.get('error_code') || h.get('error_code') || '';
  const desc = q.get('error_description') || h.get('error_description') || '';
  return code === 'otp_expired' || !!q.get('error') || !!h.get('error') || /expired|invalid/i.test(desc);
}

type Notice = { tone: 'info' | 'error' | 'success'; text: string };

export default function ActivateReturn() {
  const { user, loading, refetchProfile } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activated, setActivated] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [loginSetup, setLoginSetup] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const inFlight = useRef(false);

  useEffect(() => {
    if (activationLinkFailed(window.location.search, window.location.hash)) {
      setNotice({ tone: 'error', text: 'That email link expired or was already used. Some email apps open links early. Enter your checkout email and we’ll send a new one.' });
      window.history.replaceState({}, '', '/activate-return');
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function activate() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setNotice({ tone: 'info', text: 'Checking your membership…' });
    try {
      if (user) await ensureProfile(user.id, user.email);
      const { data, error } = await supabase.functions.invoke('activate-stripe-return');
      let code: string | undefined;
      if (error) { try { code = (await (error as { context?: Response }).context?.json())?.code; } catch { /* ignore */ } }
      if (code === 'fresh_email_link_required') {
        // Only a session opened from a fresh email link can connect a payment.
        await supabase.auth.signOut({ scope: 'local' });
        setNotice({ tone: 'info', text: 'To connect your payment, we need to confirm your email. Enter your checkout email and open the new link we send you.' });
      } else if (error || !data?.success) {
        setNotice({ tone: 'error', text: 'We couldn’t find a payment for this email yet. Make sure it’s the same email you used at checkout. If you just paid, wait a minute and try again. Your payment is safe.' });
      } else {
        // The server hands back a fresh session for this same account; adopt it before reloading access.
        if (data.session?.access_token && data.session?.refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
          if (setErr) throw setErr;
        }
        await refetchProfile();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['student-access', user?.id] }),
          queryClient.invalidateQueries({ queryKey: ['academy-permissions', user?.id] }),
        ]);
        setActivated(true);
        setNotice({ tone: 'success', text: data.secured ? 'Your membership is active. If you were signed in on other devices, sign in there again.' : 'Your membership is active.' });
      }
    } catch {
      setNotice({ tone: 'error', text: 'Something went wrong while checking your membership. Your payment is safe. Tap “Check my paid membership” to try again, or contact support.' });
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  useEffect(() => { if (user && !loading) void activate(); }, [user?.id, loading]);

  async function sendLink(e?: React.FormEvent) {
    e?.preventDefault();
    const target = (sentTo && !e ? sentTo : email).trim().toLowerCase();
    if (busy || cooldown > 0 || !target) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: target, options: { emailRedirectTo: ACTIVATION_REDIRECT, shouldCreateUser: true } });
      if (error) {
        setNotice({ tone: 'error', text: /rate|seconds|too many/i.test(error.message) ? 'Please wait a minute before asking for another link.' : 'We couldn’t send the link right now. Try again shortly or contact support.' });
      } else {
        setSentTo(target);
        setNotice(null);
      }
      setCooldown(ACTIVATION_RESEND_SECONDS);
    } catch {
      setNotice({ tone: 'error', text: 'Connection problem. Check your internet and try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function setUpLogin() {
    if (!user?.email || loginSetup === 'sending') return;
    setLoginSetup('sending');
    try {
      // Existing reset-password flow: the member sets a password from a link sent to this same email.
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` });
      setLoginSetup(error ? 'error' : 'sent');
    } catch { setLoginSetup('error'); }
  }

  const btn = { padding: '16px 24px', borderRadius: 10, background: '#087aff', color: '#fff', border: 0, fontSize: 17, cursor: 'pointer' } as const;
  const ghost = { ...btn, background: 'transparent', color: '#72b8ff', border: '1px solid #33507a' } as const;
  const tone = notice?.tone === 'error' ? '#ffb5bc' : notice?.tone === 'success' ? '#9ff0c4' : '#d4e2f5';

  return <main style={{minHeight:'100dvh',background:'#07152a',color:'#fff',padding:'64px 24px',fontFamily:'Arial,sans-serif'}}>
    <section style={{maxWidth:540,margin:'0 auto'}}>
      <p style={{letterSpacing:3,fontWeight:700}}>VAULT OS</p>
      <h1 style={{fontSize:42,lineHeight:1.08,letterSpacing:-1}}>{activated ? <>You’re in.<br/>Welcome to Vault.</> : <>Your next step.<br/>Get inside Vault.</>}</h1>
      {!activated && <p style={{color:'#b9c9dd',fontSize:18,lineHeight:1.6}}>Already paid? Use the email you entered at Stripe checkout. We’ll email you a sign-in link (not a code) to confirm it’s you and connect your membership. New to Vault or coming from Whop? Your login is created when you open that link. No second payment.</p>}
      {!user && !loading && !sentTo && <form onSubmit={sendLink} aria-busy={busy}>
        <label htmlFor="billing-email">Your checkout email</label>
        <input id="billing-email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy} style={{display:'block',width:'100%',boxSizing:'border-box',padding:16,margin:'12px 0',borderRadius:10,color:'#111'}}/>
        <button disabled={busy || cooldown > 0} style={btn}>{busy ? 'Sending…' : cooldown > 0 ? `Send again in ${cooldown}s` : 'Email my sign-in link'}</button>
      </form>}
      {!user && !loading && sentTo && <div>
        <p style={{color:'#d4e2f5',fontSize:17,lineHeight:1.6}}>Check your inbox. We sent a sign-in link to <strong style={{color:'#fff'}}>{sentTo}</strong>. Open it on this device or any other device. Check spam if it hasn’t arrived.</p>
        <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:16}}>
          <button type="button" disabled={busy || cooldown > 0} onClick={() => void sendLink()} style={btn}>{busy ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}</button>
          <button type="button" disabled={busy} onClick={() => { setEmail(sentTo); setSentTo(''); setCooldown(0); setNotice(null); }} style={ghost}>Wrong email? Change it</button>
        </div>
      </div>}
      {user && !activated && <div>
        <p style={{color:'#b9c9dd',fontSize:16,lineHeight:1.6}}>Signed in as <strong style={{color:'#fff'}}>{user.email}</strong></p>
        <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:16}}>
          <button disabled={busy} onClick={activate} style={btn}>{busy ? 'Checking…' : 'Check my paid membership'}</button>
          <button disabled={busy} onClick={()=>supabase.auth.signOut()} style={ghost}>Use another email</button>
        </div>
      </div>}
      <p role="status" style={{lineHeight:1.6,color:tone}}>{loading ? 'Loading your account…' : notice?.text}</p>
      {activated && <div style={{display:'grid',gap:16,marginTop:28}}>
        <Link style={{...btn,textAlign:'center',textDecoration:'none'}} to="/academy">Open Vault on the web →</Link>
        <div>
          <p style={{lineHeight:1.6,margin:'0 0 12px'}}>To use the mobile app, set a password for <strong>{user?.email}</strong>. We’ll email you a link to choose one.</p>
          <button type="button" onClick={setUpLogin} disabled={loginSetup === 'sending' || loginSetup === 'sent'} style={ghost}>{loginSetup === 'sending' ? 'Sending…' : loginSetup === 'sent' ? 'Link sent — check your inbox' : 'Set up app login'}</button>
          {loginSetup === 'error' && <p role="alert" style={{color:'#ffb5bc'}}>We couldn’t send that link. Try again in a minute.</p>}
        </div>
        <a style={{color:'#72b8ff'}} href="https://apps.apple.com/us/app/vault-os-trading-academy/id6770046448">Download for iPhone →</a>
        <a style={{color:'#72b8ff'}} href="https://play.google.com/store/apps/details?id=com.vaulttradingacademy.vaultos">Download for Android →</a>
        <p style={{lineHeight:1.6,color:'#b9c9dd'}}>When you open Vault, you’ll set up your profile first. Then start in Learn and check the live session schedule.</p>
      </div>}
      <p style={{fontSize:14,color:'#b9c9dd',marginTop:32}}>Need help? <a style={{color:'#72b8ff'}} href="mailto:vault@vaulttradingacademy.com">vault@vaulttradingacademy.com</a><br/>Keep your Stripe receipt. You don’t need to pay again to finish activation.</p>
    </section>
  </main>;
}

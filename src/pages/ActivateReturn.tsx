import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ensureProfile } from '@/lib/ensureProfile';
import { Link } from 'react-router-dom';

export default function ActivateReturn() {
  const { user, loading, refetchProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [activated, setActivated] = useState(false);
  async function activate() {
    setBusy(true); setMessage('Checking your membership…');
    if (user) await ensureProfile(user.id, user.email);
    const { data, error } = await supabase.functions.invoke('activate-stripe-return');
    if (error || !data?.success) {
      setMessage('We couldn’t confirm access yet. Use the same email you entered at Stripe checkout. If you just paid, wait a moment and retry. Your payment is saved.');
    } else {
      await refetchProfile(); setActivated(true); setMessage('Your Vault OS access is ready.');
    }
    setBusy(false);
  }
  useEffect(() => { if (user && !loading) void activate(); }, [user?.id, loading]);
  async function sendLink(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({email:email.trim().toLowerCase(), options:{emailRedirectTo:'https://member.vaulttradingacademy.com/activate-return',shouldCreateUser:true}});
    setMessage(error ? 'Unable to send your secure link right now. Try again shortly or contact support.' : 'Check your email for your secure sign-in link. Open it to connect your payment to Vault OS.');
    setBusy(false);
  }
  return <main style={{minHeight:'100dvh',background:'#07152a',color:'#fff',padding:'64px 24px',fontFamily:'Arial,sans-serif'}}>
    <section style={{maxWidth:540,margin:'0 auto'}}>
      <p style={{letterSpacing:3,fontWeight:700}}>VAULT OS</p>
      <h1 style={{fontSize:42,lineHeight:1.08,letterSpacing:-1}}>Your next step.<br/>Get inside Vault.</h1>
      {!activated && <p style={{color:'#b9c9dd',fontSize:18,lineHeight:1.6}}>Already paid? Use the email you entered at Stripe checkout. We’ll verify your email and connect your membership—no second payment.</p>}
      {!user && !loading && <form onSubmit={sendLink}>
        <label htmlFor="billing-email">Your checkout email</label>
        <input id="billing-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%',boxSizing:'border-box',padding:16,margin:'12px 0',borderRadius:10,color:'#111'}}/>
        <button disabled={busy} style={{padding:'16px 24px',borderRadius:10,background:'#087aff',color:'#fff',border:0,fontSize:17}}>{busy?'Sending…':'Email my secure access link'}</button>
      </form>}
      {user && !activated && <><p>Signed in as {user.email}</p><button disabled={busy} onClick={activate}>Check my paid membership</button><button disabled={busy} onClick={()=>supabase.auth.signOut()}>Use another email</button></>}
      <p role="status" style={{lineHeight:1.6}}>{loading?'Loading your account…':message}</p>
      {activated && <div style={{display:'grid',gap:16,marginTop:28}}>
        <a style={{color:'#72b8ff'}} href="https://apps.apple.com/us/app/vault-os-trading-academy/id6770046448">Download for iPhone →</a>
        <a style={{color:'#72b8ff'}} href="https://play.google.com/store/apps/details?id=com.vaulttradingacademy.vaultos">Download for Android →</a>
        <Link style={{color:'#72b8ff'}} to="/academy">Open Vault on the web →</Link>
        <p style={{lineHeight:1.6}}>In the app, sign in with <strong>{user?.email}</strong>. If you haven’t set a password, use “Forgot password” on the sign-in screen to create one. Start in Learn for your courses and playbooks, then check the live session schedule.</p>
      </div>}
      <p style={{fontSize:14,color:'#b9c9dd',marginTop:32}}>Need help? <a style={{color:'#72b8ff'}} href="mailto:vault@vaulttradingacademy.com">vault@vaulttradingacademy.com</a><br/>Keep your Stripe receipt. You don’t need to pay again to finish activation.</p>
    </section>
  </main>;
}

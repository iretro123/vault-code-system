import { createClient } from 'npm:@supabase/supabase-js@2.94.1';
import { calendlyDeps, handleCalendlyWebhook, verifyCalendlySignature } from '../_shared/mentoringCalendly.ts';
// Signed Calendly webhook (invitee.created / invitee.canceled) for $49 mentoring bookings.
// The body is only a pointer; state comes from re-read Calendly objects. Off unless VAULT_MENTORING_ENABLED=true.
Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  const body = await req.text();
  const key = Deno.env.get('CALENDLY_WEBHOOK_SIGNING_KEY') || '';
  if (!(await verifyCalendlySignature(req.headers.get('Calendly-Webhook-Signature'), body, key))) return new Response('Unauthorized', { status: 401 });
  if (Deno.env.get('VAULT_MENTORING_ENABLED') !== 'true') return Response.json({ received: true, ignored: 'disabled' });
  let ev: unknown;
  try { ev = JSON.parse(body); } catch { return new Response('Bad Request', { status: 400 }); }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const result = await handleCalendlyWebhook(ev, calendlyDeps(db, Deno.env.get('CALENDLY_PERSONAL_ACCESS_TOKEN') || ''));
    console.log('[calendly-webhook]', JSON.stringify({ result }));
    return Response.json({ received: true, result });
  } catch (e) {
    console.log('[calendly-webhook] retry', String((e as Error)?.message ?? e).slice(0, 120));
    return new Response('Retry', { status: 500 });
  }
});

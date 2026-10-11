import { createClient } from 'npm:@supabase/supabase-js@2.94.1';
import { decideCalendlyUpdate, matchFor, verifyCalendlySignature } from '../_shared/mentoringCalendly.ts';
// Signed Calendly webhook (invitee.created / invitee.canceled) for $49 mentoring bookings.
// Unsigned or unmatched deliveries change nothing. Off unless VAULT_MENTORING_ENABLED=true.
Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  const body = await req.text();
  const key = Deno.env.get('CALENDLY_WEBHOOK_SIGNING_KEY') || '';
  if (!(await verifyCalendlySignature(req.headers.get('Calendly-Webhook-Signature'), body, key))) return new Response('Unauthorized', { status: 401 });
  if (Deno.env.get('VAULT_MENTORING_ENABLED') !== 'true') return Response.json({ received: true, ignored: 'disabled' });
  let ev: any;
  try { ev = JSON.parse(body); } catch { return new Response('Bad Request', { status: 400 }); }
  const m = matchFor(ev);
  if (!m) return Response.json({ received: true, matched: false });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const col = m.by === 'entitlement_id' ? 'id' : 'booked_event_uri';
  const { data: e, error } = await db.from('vault_mentoring_entitlements')
    .select('id,status,booked_event_uri,reschedule_count,calendly_event_type_uri').eq(col, m.value).maybeSingle();
  if (error) return new Response('Retry', { status: 500 });
  if (!e) return Response.json({ received: true, matched: false });
  const patch = decideCalendlyUpdate(ev, e);
  if (patch) {
    const { error: uerr } = await db.from('vault_mentoring_entitlements').update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', e.id).eq('status', e.status).eq('reschedule_count', e.reschedule_count);
    if (uerr) return new Response('Retry', { status: 500 });
  }
  console.log('[calendly-webhook]', JSON.stringify({ event: ev?.event, updated: !!patch }));
  return Response.json({ received: true, matched: true });
});

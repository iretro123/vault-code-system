/* eslint-disable @typescript-eslint/no-explicit-any */
// Calendly booking lifecycle -> mentoring entitlement state, per the session policy:
//  - member cancellation: nonrefundable (canceled_by_member)
//  - one member reschedule, requested >= 24h before the start; anything else goes to staff review
//  - coach (host) cancellation: canceled_by_coach -> staff reschedules or refunds
//  - refunds are handled from Stripe, never here
// The webhook body is only a pointer: invitee + scheduled event are re-read from Calendly, and the
// event type and purchaser email must match the entitlement. Writes are compare-and-set on updated_at.
export const RESCHEDULE_NOTICE_MS = 24 * 3_600_000;
export const SIGNATURE_TOLERANCE_S = 180;
const CAL = 'https://api.calendly.com';

export async function verifyCalendlySignature(header: string | null, body: string, key: string, nowS = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!header || !key) return false;
  const parts = Object.fromEntries(header.split(',').map(p => p.trim().split('=', 2) as [string, string]));
  const t = Number(parts.t), v1 = parts.v1;
  if (!Number.isInteger(t) || !v1 || Math.abs(nowS - t) > SIGNATURE_TOLERANCE_S) return false;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`${t}.${body}`)));
  const hex = Array.from(sig, b => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== v1.length) return false;
  let diff = 0; for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVITEE = /^https:\/\/api\.calendly\.com\/scheduled_events\/[0-9a-f-]{36}\/invitees\/[0-9a-f-]{36}$/i;
export const eventUriOfInvitee = (inviteeUri: unknown): string | null => {
  const m = typeof inviteeUri === 'string' && inviteeUri.match(/^(https:\/\/api\.calendly\.com\/scheduled_events\/[0-9a-f-]{36})\/invitees\//i);
  return m ? m[1] : null;
};

export type Canonical = { kind: 'created' | 'canceled'; inviteeUri: string; email: string; eventUri: string; eventType: string;
  startTime: string | null; rescheduled: boolean; oldInvitee: string | null; cancelerType: string | null; canceledAt: string | null; utm: string | null };
export type Ent = { id: string; email: string; status: string; booked_event_uri: string | null; reschedule_count: number;
  calendly_event_type_uri: string; updated_at: string };
export type Patch = Record<string, unknown> | null;

export function decideCalendlyUpdate(c: Canonical, e: Ent, nowMs = Date.now()): Patch {
  if (c.eventType !== e.calendly_event_type_uri) return { staff_review_reason: 'booking on unexpected event type' };
  if (c.email !== e.email) return { staff_review_reason: 'booking email does not match purchaser' };
  if (['refunded', 'withheld'].includes(e.status)) return { staff_review_reason: `booking activity on ${e.status} entitlement` };
  if (c.kind === 'created') {
    if (e.booked_event_uri === c.eventUri && e.status !== 'dispatched') return null; // duplicate delivery
    if (!['link_ready', 'dispatched', 'booked'].includes(e.status)) return { staff_review_reason: `booking while ${e.status}` };
    if (e.status === 'booked' && eventUriOfInvitee(c.oldInvitee) !== e.booked_event_uri) return { staff_review_reason: 'second booking on single-use entitlement' };
    return { status: 'booked', booked_event_uri: c.eventUri, booked_start_at: c.startTime };
  }
  if (e.status !== 'booked' || c.eventUri !== e.booked_event_uri) return null; // stale/duplicate/superseded
  if (c.cancelerType === 'host') return { status: 'canceled_by_coach', staff_review_reason: 'coach canceled: reschedule or refund' };
  if (c.rescheduled) {
    const start = Date.parse(c.startTime ?? ''), at = Date.parse(c.canceledAt ?? '') || nowMs;
    if (e.reschedule_count >= 1) return { staff_review_reason: 'second member reschedule (policy allows one)' };
    if (!Number.isFinite(start) || start - at < RESCHEDULE_NOTICE_MS) return { reschedule_count: 1, staff_review_reason: 'member rescheduled with under 24h notice' };
    return { reschedule_count: 1 };
  }
  return { status: 'canceled_by_member', staff_review_reason: 'member canceled (nonrefundable)' };
}

export interface CalendlyDeps {
  getJson(url: string): Promise<any>;            // authenticated Calendly GET; throws on non-200
  findById(id: string): Promise<Ent | null>;
  findByBookedEvent(eventUri: string): Promise<Ent | null>;
  cas(id: string, updatedAt: string, patch: Record<string, unknown>): Promise<boolean>;
}

export async function loadCanonical(webhook: any, deps: CalendlyDeps): Promise<Canonical | null> {
  const kind = webhook?.event === 'invitee.created' ? 'created' : webhook?.event === 'invitee.canceled' ? 'canceled' : null;
  const uri = webhook?.payload?.uri;
  if (!kind || typeof uri !== 'string' || !INVITEE.test(uri)) return null;
  const inv = (await deps.getJson(uri))?.resource;
  const ev = (await deps.getJson(inv?.event ?? eventUriOfInvitee(uri)!))?.resource;
  if (!inv || !ev || ev.uri !== eventUriOfInvitee(uri)) return null;
  return { kind, inviteeUri: uri, email: String(inv.email ?? '').trim().toLowerCase(), eventUri: ev.uri, eventType: ev.event_type,
    startTime: ev.start_time ?? null, rescheduled: inv.rescheduled === true, oldInvitee: inv.old_invitee ?? null,
    cancelerType: inv.cancellation?.canceler_type ?? null, canceledAt: inv.cancellation?.created_at ?? null,
    utm: typeof inv.tracking?.utm_content === 'string' && UUID.test(inv.tracking.utm_content) ? inv.tracking.utm_content : null };
}

/** Returns 'ignored' | 'unmatched' | 'unchanged' | 'updated'. Throws on persistent CAS conflict (caller returns 500 -> Calendly retries). */
export async function handleCalendlyWebhook(webhook: any, deps: CalendlyDeps, nowMs = Date.now()) {
  const c = await loadCanonical(webhook, deps);
  if (!c) return 'ignored';
  // Our link carries utm_content=<entitlement>; a reschedule chains from the prior booking. Email is still verified.
  const find = async () => (c.utm ? await deps.findById(c.utm) : null)
    ?? (c.kind === 'created' && c.oldInvitee ? await deps.findByBookedEvent(eventUriOfInvitee(c.oldInvitee) ?? '') : null)
    ?? (c.kind === 'canceled' ? await deps.findByBookedEvent(c.eventUri) : null);
  for (let attempt = 0; attempt < 3; attempt++) {
    const e = await find();
    if (!e) return 'unmatched';
    let state = { ...e }, merged: Record<string, unknown> = {};
    const steps: Canonical[] = [c];
    // Out of order: "created" arriving after the booking was already canceled applies both, in order.
    if (c.kind === 'created' && (c.cancelerType || webhook?.payload?.status === 'canceled')) steps.push({ ...c, kind: 'canceled' });
    for (const s of steps) {
      const p = decideCalendlyUpdate(s, state as Ent, nowMs);
      if (p) { merged = { ...merged, ...p }; state = { ...state, ...p } as Ent; }
    }
    if (!Object.keys(merged).length) return 'unchanged';
    if (await deps.cas(e.id, e.updated_at, { ...merged, last_calendly_event_at: new Date(nowMs).toISOString() })) return 'updated';
  }
  throw new Error('entitlement changed concurrently; retry');
}

export function calendlyDeps(db: any, token: string, fetchFn: typeof fetch = fetch): CalendlyDeps {
  const sel = 'id,email,status,booked_event_uri,reschedule_count,calendly_event_type_uri,updated_at';
  const one = async (q: any) => { const { data, error } = await q.maybeSingle(); if (error) throw error; return data ?? null; };
  return {
    async getJson(url) {
      if (!url.startsWith(`${CAL}/`)) throw new Error('unexpected Calendly URL');
      const r = await fetchFn(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
      if (!r.ok) throw new Error(`Calendly read HTTP ${r.status}`);
      return r.json();
    },
    findById: id => one(db.from('vault_mentoring_entitlements').select(sel).eq('id', id)),
    findByBookedEvent: uri => one(db.from('vault_mentoring_entitlements').select(sel).eq('booked_event_uri', uri)),
    async cas(id, updatedAt, patch) {
      const { data, error } = await db.from('vault_mentoring_entitlements').update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id).eq('updated_at', updatedAt).select('id');
      if (error) throw error; return (data ?? []).length === 1;
    },
  };
}

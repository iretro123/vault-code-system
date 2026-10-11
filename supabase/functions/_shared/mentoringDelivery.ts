/* eslint-disable @typescript-eslint/no-explicit-any */
// Booking delivery for a recorded $49 mentoring entitlement:
//   capacity guard -> one single-use Calendly link (persisted) -> GHL contact field + tag.
// A GHL workflow (published separately) sends the branded email from the tag. Nothing here emails directly.
import { MENTORING_APPROVED } from './mentoringFulfillment.ts';

export const MENTORING_TAG = 'vault-mentoring-paid';
const GHL = 'https://services.leadconnectorhq.com';
const CAL = 'https://api.calendly.com';
const CLOSED = ['refunded', 'withheld', 'canceled_by_member', 'canceled_by_coach', 'completed', 'booked'];

export type MentoringEnv = { enabled: boolean; calendlyToken: string; ghlKey: string; locationId: string; linkFieldId: string };
export const mentoringEnv = (get: (k: string) => string | undefined): MentoringEnv => ({
  enabled: get('VAULT_MENTORING_ENABLED') === 'true', calendlyToken: get('CALENDLY_PERSONAL_ACCESS_TOKEN') || '',
  ghlKey: get('GHL_API_KEY') || '', locationId: get('GHL_LOCATION_ID') || '', linkFieldId: get('GHL_MENTORING_LINK_FIELD_ID') || '',
});
export const mentoringReady = (e: MentoringEnv) => e.enabled && !!e.calendlyToken && !!e.ghlKey && !!e.locationId && !!e.linkFieldId;
export const backoffMs = (attempts: number) => Math.min(3_600_000, 60_000 * 2 ** Math.min(Math.max(attempts, 0), 6));

export type Entitlement = { id: string; email: string; status: string; calendly_event_type_uri: string;
  calendly_link_url: string | null; link_attempt_started_at: string | null };
export type Job = { entitlement_id: string; attempts: number };
export type Outcome = 'sent' | 'retry' | 'withheld' | 'held_no_capacity' | 'staff_review';

export interface MentoringStore {
  get(id: string): Promise<Entitlement | null>;
  outstandingExcluding(id: string): Promise<number>;
  beginLink(id: string): Promise<boolean>;
  clearLinkAttempt(id: string): Promise<void>;
  saveLink(id: string, url: string): Promise<void>;
  markSent(id: string): Promise<void>;
  retry(id: string, attempts: number, reason: string): Promise<void>;
  withhold(id: string, reason: string, staffReview: boolean): Promise<void>;
}

class Ambiguous extends Error {}

/** Next-7-day open slots for the exact event; also confirms active + 120 minutes. */
export async function calendlyCapacity(env: MentoringEnv, eventUri: string, fetchFn: typeof fetch, now = new Date()): Promise<number> {
  const h = { Authorization: `Bearer ${env.calendlyToken}` };
  const et = await fetchFn(eventUri, { headers: h, signal: AbortSignal.timeout(10_000) });
  if (!et.ok) throw new Error(`Calendly event HTTP ${et.status}`);
  const r = (await et.json())?.resource;
  if (r?.active !== true || r?.duration !== MENTORING_APPROVED.durationMinutes || r?.scheduling_url !== MENTORING_APPROVED.calendlySchedulingUrl) return 0;
  const start = new Date(now.getTime() + 5 * 60_000), end = new Date(start.getTime() + 7 * 86_400_000 - 60_000);
  const q = new URLSearchParams({ event_type: eventUri, start_time: start.toISOString(), end_time: end.toISOString() });
  const at = await fetchFn(`${CAL}/event_type_available_times?${q}`, { headers: h, signal: AbortSignal.timeout(10_000) });
  if (!at.ok) throw new Error(`Calendly availability HTTP ${at.status}`);
  return ((await at.json())?.collection ?? []).filter((s: any) => s?.status === 'available').length;
}

/** Single-use link. Definite 4xx = nothing created (safe to retry). Timeout/5xx/bad body = ambiguous. */
async function createLink(env: MentoringEnv, eventUri: string, fetchFn: typeof fetch): Promise<string> {
  let res: Response;
  try {
    res = await fetchFn(`${CAL}/scheduling_links`, { method: 'POST', signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${env.calendlyToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_event_count: 1, owner: eventUri, owner_type: 'EventType' }) });
  } catch { throw new Ambiguous('link request outcome unknown'); }
  if (res.status >= 400 && res.status < 500 && res.status !== 408) throw new Error(`Calendly link HTTP ${res.status}`);
  if (!res.ok) throw new Ambiguous(`link HTTP ${res.status}`);
  const url = (await res.json().catch(() => null))?.resource?.booking_url;
  if (typeof url !== 'string' || !url.startsWith('https://calendly.com/')) throw new Ambiguous('link response unreadable');
  return url;
}

/** Deliver one already-leased job. Never throws. */
export async function deliverMentoringJob(store: MentoringStore, job: Job, env: MentoringEnv, fetchFn: typeof fetch = fetch, now = new Date()): Promise<Outcome> {
  const eid = job.entitlement_id;
  try {
    const e = await store.get(eid);
    if (!e || CLOSED.includes(e.status)) { await store.withhold(eid, 'entitlement not deliverable', false); return 'withheld'; }
    let url = e.calendly_link_url;
    if (!url) {
      if (e.link_attempt_started_at) { await store.withhold(eid, 'ambiguous Calendly link attempt; verify in Calendly before resending', true); return 'staff_review'; }
      const slots = await calendlyCapacity(env, e.calendly_event_type_uri, fetchFn, now);
      const outstanding = await store.outstandingExcluding(eid);
      if (slots <= outstanding) { await store.retry(eid, job.attempts, `held: ${slots} open slots for ${outstanding + 1} outstanding sessions`); return 'held_no_capacity'; }
      if (!(await store.beginLink(eid))) { await store.retry(eid, job.attempts, 'link attempt already in progress'); return 'retry'; }
      try { url = await createLink(env, e.calendly_event_type_uri, fetchFn); }
      catch (err) {
        if (err instanceof Ambiguous) { await store.withhold(eid, `ambiguous Calendly link attempt (${err.message})`, true); return 'staff_review'; }
        await store.clearLinkAttempt(eid); throw err;
      }
      url = `${url}${url.includes('?') ? '&' : '?'}utm_content=${eid}`;
      await store.saveLink(eid, url);
    }
    const h = { Authorization: `Bearer ${env.ghlKey}`, Version: '2021-07-28', 'Content-Type': 'application/json' };
    const up = await fetchFn(`${GHL}/contacts/upsert`, { method: 'POST', headers: h, signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ locationId: env.locationId, email: e.email, customFields: [{ id: env.linkFieldId, field_value: url }] }) });
    const body = await up.json().catch(() => ({}));
    if (!up.ok || !body?.contact?.id) throw new Error(`GHL contact upsert HTTP ${up.status}`);
    const tag = await fetchFn(`${GHL}/contacts/${encodeURIComponent(body.contact.id)}/tags`, { method: 'POST', headers: h, signal: AbortSignal.timeout(10_000), body: JSON.stringify({ tags: [MENTORING_TAG] }) });
    if (!tag.ok) throw new Error(`GHL tag HTTP ${tag.status}`);
    await store.markSent(eid);
    return 'sent';
  } catch (err) {
    try { await store.retry(eid, job.attempts, String((err as Error)?.message ?? err).slice(0, 200)); } catch { /* lease expiry recovers */ }
    return 'retry';
  }
}

export function supabaseMentoringStore(db: any): MentoringStore {
  const E = 'vault_mentoring_entitlements', O = 'vault_mentoring_outbox';
  const ok = ({ error }: any) => { if (error) throw error; };
  const ts = () => new Date().toISOString();
  return {
    async get(id) {
      const { data, error } = await db.from(E).select('id,email,status,calendly_event_type_uri,calendly_link_url,link_attempt_started_at').eq('id', id).maybeSingle();
      if (error) throw error; return data ?? null;
    },
    async outstandingExcluding(id) {
      const { data, error } = await db.rpc('vault_mentoring_outstanding_count', { p_exclude: id }); if (error) throw error; return Number(data ?? 0);
    },
    async beginLink(id) { const { data, error } = await db.rpc('begin_vault_mentoring_link', { p_id: id }); if (error) throw error; return data === true; },
    async clearLinkAttempt(id) { ok(await db.from(E).update({ link_attempt_started_at: null, updated_at: ts() }).eq('id', id).is('calendly_link_url', null)); },
    async saveLink(id, url) { ok(await db.from(E).update({ calendly_link_url: url, calendly_link_created_at: ts(), status: 'link_ready', updated_at: ts() }).eq('id', id).eq('status', 'paid')); },
    async markSent(id) {
      ok(await db.from(O).update({ state: 'sent', sent_at: ts(), locked_until: null, last_error: null }).eq('entitlement_id', id));
      ok(await db.from(E).update({ status: 'sent', updated_at: ts() }).eq('id', id).eq('status', 'link_ready'));
    },
    async retry(id, attempts, reason) {
      ok(await db.from(O).update({ state: 'pending', locked_until: null, last_error: reason, next_attempt_at: new Date(Date.now() + backoffMs(attempts)).toISOString() }).eq('entitlement_id', id).neq('state', 'sent'));
    },
    async withhold(id, reason, staff) {
      ok(await db.from(O).update({ state: 'withheld', locked_until: null, last_error: `withheld: ${reason}`.slice(0, 250) }).eq('entitlement_id', id).neq('state', 'sent'));
      if (staff) ok(await db.from(E).update({ staff_review_reason: reason.slice(0, 200), updated_at: ts() }).eq('id', id));
    },
  };
}

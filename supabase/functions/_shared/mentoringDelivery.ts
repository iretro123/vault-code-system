/* eslint-disable @typescript-eslint/no-explicit-any */
// Booking delivery for a recorded $49 mentoring entitlement:
//   deliverable-capacity guard -> one single-use Calendly link (persisted, conditional) -> GHL dispatch.
// "Dispatched" means the GHL workflow was triggered (fields set + tag re-applied). It is NOT proof the
// email arrived; GHL owns delivery. Nothing here emails directly.
import { MENTORING_APPROVED } from './mentoringFulfillment.ts';

export const MENTORING_TAG = 'vault-mentoring-paid';
/** Must match the Calendly event's before/after buffers and weekly limit (Calendly's API does not expose them). */
export const SESSION_BUFFER_MINUTES = 30;
export const WEEKLY_SESSION_CAP = 2;
export const CAPACITY_WINDOW_DAYS = 14;
const GHL = 'https://services.leadconnectorhq.com';
const CAL = 'https://api.calendly.com';
const DELIVERABLE = ['paid', 'link_ready'];

export type MentoringEnv = { enabled: boolean; calendlyToken: string; ghlKey: string; locationId: string; linkFieldId: string; idFieldId: string };
export const mentoringEnv = (get: (k: string) => string | undefined): MentoringEnv => ({
  enabled: get('VAULT_MENTORING_ENABLED') === 'true', calendlyToken: get('CALENDLY_PERSONAL_ACCESS_TOKEN') || '',
  ghlKey: get('GHL_API_KEY') || '', locationId: get('GHL_LOCATION_ID') || '',
  linkFieldId: get('GHL_MENTORING_LINK_FIELD_ID') || '', idFieldId: get('GHL_MENTORING_ID_FIELD_ID') || '',
});
export const mentoringReady = (e: MentoringEnv) => e.enabled && !!e.calendlyToken && !!e.ghlKey && !!e.locationId && !!e.linkFieldId && !!e.idFieldId;
export const backoffMs = (attempts: number) => Math.min(3_600_000, 60_000 * 2 ** Math.min(Math.max(attempts, 0), 6));

export type Entitlement = { id: string; email: string; status: string; calendly_event_type_uri: string;
  calendly_link_url: string | null; link_attempt_started_at: string | null };
export type Job = { entitlement_id: string; attempts: number };
export type Outcome = 'dispatched' | 'retry' | 'withheld' | 'held_no_capacity' | 'staff_review';

export interface MentoringStore {
  get(id: string): Promise<Entitlement | null>;
  outstandingExcluding(id: string): Promise<number>;
  bookedStarts(from: Date, to: Date): Promise<string[]>;
  beginLink(id: string): Promise<boolean>;
  clearLinkAttempt(id: string): Promise<void>;
  /** Conditional: only paid + no link. Returns false when zero rows changed. */
  saveLink(id: string, url: string): Promise<boolean>;
  /** Conditional: entitlement link_ready -> dispatched AND outbox processing -> dispatched. */
  markDispatched(id: string): Promise<boolean>;
  retry(id: string, attempts: number, reason: string): Promise<void>;
  withhold(id: string, reason: string, staffReview: boolean): Promise<void>;
}

class Ambiguous extends Error {}

// Tampa sessions: weeks are counted in US Eastern time (Mon-start).
const weekKey = (ms: number) => {
  const d = new Date(new Date(ms).toLocaleString('en-US', { timeZone: 'America/New_York' }));
  d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toDateString();
};

/**
 * Calendly available_times are overlapping START choices, not sessions. Count sessions that can all
 * be delivered: greedy non-overlapping starts (120 min + buffers), then at most WEEKLY_SESSION_CAP per
 * week including sessions already booked.
 */
export function deliverableSessions(starts: string[], booked: string[], durationMin = MENTORING_APPROVED.durationMinutes,
  bufferMin = SESSION_BUFFER_MINUTES, weeklyCap = WEEKLY_SESSION_CAP): number {
  const gap = (durationMin + 2 * bufferMin) * 60_000;
  const picked: number[] = [];
  for (const t of starts.map(s => Date.parse(s)).filter(Number.isFinite).sort((a, b) => a - b)) {
    if (!picked.length || t - picked[picked.length - 1] >= gap) picked.push(t);
  }
  const used = new Map<string, number>();
  for (const b of booked) { const t = Date.parse(b); if (Number.isFinite(t)) used.set(weekKey(t), (used.get(weekKey(t)) ?? 0) + 1); }
  let n = 0;
  for (const t of picked) { const k = weekKey(t); const u = used.get(k) ?? 0; if (u < weeklyCap) { used.set(k, u + 1); n++; } }
  return n;
}

export async function calendlyCapacity(env: MentoringEnv, eventUri: string, store: MentoringStore, fetchFn: typeof fetch, now = new Date()): Promise<number> {
  const h = { Authorization: `Bearer ${env.calendlyToken}` };
  const et = await fetchFn(eventUri, { headers: h, signal: AbortSignal.timeout(10_000) });
  if (!et.ok) throw new Error(`Calendly event HTTP ${et.status}`);
  const r = (await et.json())?.resource;
  if (r?.active !== true || r?.duration !== MENTORING_APPROVED.durationMinutes || r?.scheduling_url !== MENTORING_APPROVED.calendlySchedulingUrl) return 0;
  const starts: string[] = [];
  const begin = now.getTime() + 5 * 60_000;
  for (let w = 0; w < CAPACITY_WINDOW_DAYS / 7; w++) { // Calendly allows at most 7 days per request
    const s = new Date(begin + w * 7 * 86_400_000), e = new Date(s.getTime() + 7 * 86_400_000 - 60_000);
    const q = new URLSearchParams({ event_type: eventUri, start_time: s.toISOString(), end_time: e.toISOString() });
    const at = await fetchFn(`${CAL}/event_type_available_times?${q}`, { headers: h, signal: AbortSignal.timeout(10_000) });
    if (!at.ok) throw new Error(`Calendly availability HTTP ${at.status}`);
    for (const x of (await at.json())?.collection ?? []) if (x?.status === 'available' && x?.start_time) starts.push(x.start_time);
  }
  const booked = await store.bookedStarts(new Date(begin - 7 * 86_400_000), new Date(begin + (CAPACITY_WINDOW_DAYS + 7) * 86_400_000));
  return deliverableSessions(starts, booked);
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

/** Deliver one already-leased job. Never throws. Every write is conditional; a lost race stops delivery. */
export async function deliverMentoringJob(store: MentoringStore, job: Job, env: MentoringEnv, fetchFn: typeof fetch = fetch, now = new Date()): Promise<Outcome> {
  const eid = job.entitlement_id;
  try {
    const e = await store.get(eid);
    if (!e || !DELIVERABLE.includes(e.status)) { await store.withhold(eid, `entitlement ${e?.status ?? 'missing'}`, false); return 'withheld'; }
    let url = e.calendly_link_url;
    if (!url) {
      if (e.link_attempt_started_at) { await store.withhold(eid, 'ambiguous Calendly link attempt; verify in Calendly before resending', true); return 'staff_review'; }
      const sessions = await calendlyCapacity(env, e.calendly_event_type_uri, store, fetchFn, now);
      const outstanding = await store.outstandingExcluding(eid);
      if (sessions <= outstanding) { await store.retry(eid, job.attempts, `held: ${sessions} deliverable sessions for ${outstanding + 1} outstanding`); return 'held_no_capacity'; }
      if (!(await store.beginLink(eid))) { await store.withhold(eid, 'link attempt not granted (state changed)', true); return 'staff_review'; }
      try { url = await createLink(env, e.calendly_event_type_uri, fetchFn); }
      catch (err) {
        if (err instanceof Ambiguous) { await store.withhold(eid, `ambiguous Calendly link attempt (${err.message})`, true); return 'staff_review'; }
        await store.clearLinkAttempt(eid); throw err;
      }
      url = `${url}${url.includes('?') ? '&' : '?'}utm_content=${eid}`;
      if (!(await store.saveLink(eid, url))) { await store.withhold(eid, 'state changed during link creation; unused Calendly link exists', true); return 'staff_review'; }
    }
    // Re-check right before dispatch: a refund/dispute during link creation must stop the email.
    const fresh = await store.get(eid);
    if (!fresh || fresh.status !== 'link_ready' || fresh.calendly_link_url !== url) { await store.withhold(eid, `not dispatched: entitlement ${fresh?.status ?? 'missing'}`, fresh?.status !== 'refunded'); return 'withheld'; }
    const h = { Authorization: `Bearer ${env.ghlKey}`, Version: '2021-07-28', 'Content-Type': 'application/json' };
    const up = await fetchFn(`${GHL}/contacts/upsert`, { method: 'POST', headers: h, signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ locationId: env.locationId, email: fresh.email,
        customFields: [{ id: env.linkFieldId, field_value: url }, { id: env.idFieldId, field_value: eid }] }) });
    const body = await up.json().catch(() => ({}));
    if (!up.ok || !body?.contact?.id) throw new Error(`GHL contact upsert HTTP ${up.status}`);
    // Read back: GHL ignores unknown field ids silently, so never tag until both fields hold this purchase.
    const rb = await fetchFn(`${GHL}/contacts/${encodeURIComponent(body.contact.id)}`, { headers: h, signal: AbortSignal.timeout(10_000) });
    const cf: any[] = (await rb.json().catch(() => ({})))?.contact?.customFields ?? [];
    const val = (fid: string) => cf.find((f: any) => f?.id === fid)?.value;
    if (!rb.ok || val(env.linkFieldId) !== url || val(env.idFieldId) !== eid) throw new Error(`GHL booking fields not confirmed (HTTP ${rb.status})`);
    const tagUrl = `${GHL}/contacts/${encodeURIComponent(body.contact.id)}/tags`;
    // Re-entry per purchase: a returning buyer already carries the tag, so remove then re-add it.
    const rm = await fetchFn(tagUrl, { method: 'DELETE', headers: h, signal: AbortSignal.timeout(10_000), body: JSON.stringify({ tags: [MENTORING_TAG] }) });
    if (!rm.ok && rm.status !== 404) throw new Error(`GHL tag reset HTTP ${rm.status}`);
    const tag = await fetchFn(tagUrl, { method: 'POST', headers: h, signal: AbortSignal.timeout(10_000), body: JSON.stringify({ tags: [MENTORING_TAG] }) });
    if (!tag.ok) throw new Error(`GHL tag HTTP ${tag.status}`);
    if (!(await store.markDispatched(eid))) { await store.withhold(eid, 'dispatched but entitlement changed concurrently; contact buyer', true); return 'staff_review'; }
    return 'dispatched';
  } catch (err) {
    try { await store.retry(eid, job.attempts, String((err as Error)?.message ?? err).slice(0, 200)); } catch { /* lease expiry recovers */ }
    return 'retry';
  }
}

export function supabaseMentoringStore(db: any): MentoringStore {
  const E = 'vault_mentoring_entitlements', O = 'vault_mentoring_outbox';
  const ok = ({ error }: any) => { if (error) throw error; };
  const rows = ({ data, error }: any) => { if (error) throw error; return (data ?? []).length; };
  const ts = () => new Date().toISOString();
  return {
    async get(id) {
      const { data, error } = await db.from(E).select('id,email,status,calendly_event_type_uri,calendly_link_url,link_attempt_started_at').eq('id', id).maybeSingle();
      if (error) throw error; return data ?? null;
    },
    async outstandingExcluding(id) {
      const { data, error } = await db.rpc('vault_mentoring_outstanding_count', { p_exclude: id }); if (error) throw error; return Number(data ?? 0);
    },
    async bookedStarts(from, to) {
      const { data, error } = await db.rpc('vault_mentoring_booked_starts', { p_from: from.toISOString(), p_to: to.toISOString() });
      if (error) throw error; return (data ?? []).map((r: any) => (typeof r === 'string' ? r : Object.values(r)[0])) as string[];
    },
    async beginLink(id) { const { data, error } = await db.rpc('begin_vault_mentoring_link', { p_id: id }); if (error) throw error; return data === true; },
    async clearLinkAttempt(id) { ok(await db.from(E).update({ link_attempt_started_at: null, updated_at: ts() }).eq('id', id).eq('status', 'paid').is('calendly_link_url', null)); },
    async saveLink(id, url) {
      return rows(await db.from(E).update({ calendly_link_url: url, calendly_link_created_at: ts(), status: 'link_ready', updated_at: ts() })
        .eq('id', id).eq('status', 'paid').is('calendly_link_url', null).select('id')) === 1;
    },
    async markDispatched(id) {
      const n = rows(await db.from(E).update({ status: 'dispatched', dispatched_at: ts(), updated_at: ts() }).eq('id', id).eq('status', 'link_ready').select('id'));
      ok(await db.from(O).update({ state: 'dispatched', dispatched_at: ts(), locked_until: null, last_error: n === 1 ? null : 'entitlement changed at dispatch' }).eq('entitlement_id', id).eq('state', 'processing'));
      return n === 1;
    },
    async retry(id, attempts, reason) {
      ok(await db.from(O).update({ state: 'pending', locked_until: null, last_error: reason, next_attempt_at: new Date(Date.now() + backoffMs(attempts)).toISOString() }).eq('entitlement_id', id).eq('state', 'processing'));
    },
    async withhold(id, reason, staff) {
      ok(await db.from(O).update({ state: 'withheld', locked_until: null, last_error: `withheld: ${reason}`.slice(0, 250) }).eq('entitlement_id', id).neq('state', 'dispatched'));
      if (staff) ok(await db.from(E).update({ staff_review_reason: reason.slice(0, 200), updated_at: ts() }).eq('id', id));
    },
  };
}

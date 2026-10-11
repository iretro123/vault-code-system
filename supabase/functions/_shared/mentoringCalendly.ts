/* eslint-disable @typescript-eslint/no-explicit-any */
// Calendly booking lifecycle -> mentoring entitlement state, per the session policy:
//  - member cancellation: nonrefundable (canceled_by_member)
//  - one member reschedule, requested >= 24h before the start; anything else goes to staff review
//  - coach (host) cancellation: canceled_by_coach -> staff reschedules or refunds
//  - refunds are handled from Stripe, never here
export const RESCHEDULE_NOTICE_MS = 24 * 3_600_000;
export const SIGNATURE_TOLERANCE_S = 180;

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
/** Scheduled-event URI embedded in an invitee URI (…/scheduled_events/{uuid}/invitees/{uuid}). */
export const eventUriOfInvitee = (inviteeUri: unknown): string | null => {
  const m = typeof inviteeUri === 'string' && inviteeUri.match(/^(https:\/\/api\.calendly\.com\/scheduled_events\/[0-9a-f-]{36})\/invitees\//i);
  return m ? m[1] : null;
};

export type Match = { by: 'entitlement_id'; value: string } | { by: 'booked_event_uri'; value: string } | null;

/** How to find the entitlement: our single-use link carries utm_content=<id>; reschedules chain via old_invitee. */
export function matchFor(ev: any): Match {
  const p = ev?.payload ?? {};
  const utm = p?.tracking?.utm_content;
  if (typeof utm === 'string' && UUID.test(utm)) return { by: 'entitlement_id', value: utm };
  const prior = eventUriOfInvitee(ev?.event === 'invitee.created' ? p.old_invitee : p.uri);
  return prior ? { by: 'booked_event_uri', value: prior } : null;
}

type Ent = { status: string; booked_event_uri: string | null; reschedule_count: number; calendly_event_type_uri: string };
export type Patch = Record<string, unknown> | null;

export function decideCalendlyUpdate(ev: any, e: Ent, nowMs = Date.now()): Patch {
  const p = ev?.payload ?? {};
  const se = p.scheduled_event ?? {};
  if (se.event_type && se.event_type !== e.calendly_event_type_uri) return { staff_review_reason: 'booking on unexpected event type' };
  if (['refunded', 'withheld'].includes(e.status)) return { staff_review_reason: `booking activity on ${e.status} entitlement` };

  if (ev?.event === 'invitee.created') {
    if (!['link_ready', 'sent', 'booked'].includes(e.status)) return { staff_review_reason: `booking while ${e.status}` };
    const eventUri = eventUriOfInvitee(p.uri);
    if (e.status === 'booked' && !p.old_invitee) return { staff_review_reason: 'second booking on single-use entitlement' };
    return { status: 'booked', booked_event_uri: eventUri, booked_start_at: se.start_time ?? null };
  }
  if (ev?.event === 'invitee.canceled') {
    if (e.status !== 'booked' || eventUriOfInvitee(p.uri) !== e.booked_event_uri) return null; // stale/duplicate
    const host = p.cancellation?.canceler_type === 'host';
    if (host) return { status: 'canceled_by_coach', staff_review_reason: 'coach canceled: reschedule or refund' };
    if (p.rescheduled === true) {
      const start = Date.parse(se.start_time ?? ''), at = Date.parse(p.cancellation?.created_at ?? '') || nowMs;
      if (e.reschedule_count >= 1) return { staff_review_reason: 'second member reschedule (policy allows one)' };
      if (!Number.isFinite(start) || start - at < RESCHEDULE_NOTICE_MS) return { reschedule_count: 1, staff_review_reason: 'member rescheduled with under 24h notice' };
      return { reschedule_count: 1 };
    }
    return { status: 'canceled_by_member', staff_review_reason: 'member canceled (nonrefundable)' };
  }
  return null;
}

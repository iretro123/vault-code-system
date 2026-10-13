import { describe, expect, it, vi } from 'vitest';
import { fulfillMentoringPayment, mentoringConfig, mentoringQaConfig, MentoringPending, MENTORING_APPROVED, isMentoringCandidate } from '../../supabase/functions/_shared/mentoringFulfillment';
import { deliverMentoringJob, deliverableSessions, type MentoringStore, type Entitlement, MENTORING_TAG } from '../../supabase/functions/_shared/mentoringDelivery';
import { handleCalendlyWebhook, verifyCalendlySignature, type CalendlyDeps, type Ent } from '../../supabase/functions/_shared/mentoringCalendly';

const cfg = { ...mentoringConfig(() => 'true') };
const A = MENTORING_APPROVED;

function fx() {
  const md = { altId: A.locationId, altType: 'location', orderId: 'ord_1', contactId: 'ct_1' };
  const charge: any = { id: 'ch_1', paid: true, captured: true, status: 'succeeded', amount: 4900, amount_refunded: 0, refunded: false, disputed: false };
  const pi: any = { id: 'pi_1', object: 'payment_intent', livemode: true, status: 'succeeded', amount: 4900, amount_received: 4900, currency: 'usd', customer: 'cus_1', metadata: { ...md }, latest_charge: charge };
  const order: any = { _id: 'ord_1', altId: A.locationId, altType: 'location', contactId: 'ct_1', liveMode: true, status: 'completed', paymentStatus: 'paid', currency: 'USD', amount: 49,
    items: [{ qty: 1, product: { _id: A.ghlProductId }, price: { _id: A.ghlPriceId, amount: 49, type: 'one_time', currency: 'USD' } }] };
  const tx: any[] = [{ _id: 'tx_1', entityId: 'ord_1', chargeId: 'pi_1', status: 'succeeded', amount: 49, currency: 'usd', liveMode: true, altId: A.locationId }];
  const stripe = { paymentIntents: { retrieve: vi.fn(async () => pi) }, customers: { retrieve: vi.fn(async () => ({ email: ' Buyer@Example.com' })) } };
  const db = { rpc: vi.fn(async () => ({ data: true, error: null } as any)) };
  const fetchFn = vi.fn(async (url: string) => {
    if (url.includes('/payments/orders/')) return new Response(JSON.stringify(order), { status: 200 });
    return new Response(JSON.stringify({ data: tx, totalCount: tx.length }), { status: 200 });
  }) as any;
  return { pi, order, tx, charge, stripe, db, fetchFn };
}
const run = (f: ReturnType<typeof fx>, c = cfg) => fulfillMentoringPayment({ id: 'pi_1', object: 'payment_intent', amount: 4900, currency: 'usd', metadata: { altId: A.locationId } }, f.stripe, f.db, c, 'k', { fetchFn: f.fetchFn });

describe('$49 mentoring payment verification', () => {
  it('flag off unless exactly "true"; off makes no calls', async () => {
    expect(mentoringConfig(() => undefined).enabled).toBe(false);
    expect(mentoringConfig(() => '1').enabled).toBe(false);
    const f = fx();
    expect(await run(f, { ...cfg, enabled: false })).toBe('not_applicable');
    expect(f.stripe.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it('routes only $49 USD PaymentIntents from our location (never the $1.99 intro)', () => {
    expect(isMentoringCandidate({ object: 'payment_intent', amount: 199, currency: 'usd', metadata: {} }, cfg)).toBe(false);
    expect(isMentoringCandidate({ object: 'payment_intent', amount: 4900, currency: 'usd', metadata: { altId: 'other' } }, cfg)).toBe(false);
  });

  it('records a verified payment with canonical proof only', async () => {
    const f = fx();
    expect(await run(f)).toBe('recorded');
    expect(f.db.rpc).toHaveBeenCalledWith('record_vault_mentoring_payment', expect.objectContaining({
      p_payment_intent: 'pi_1', p_charge: 'ch_1', p_order: 'ord_1', p_transaction: 'tx_1', p_email: 'buyer@example.com',
      p_product: A.ghlProductId, p_price: A.ghlPriceId, p_amount: 4900, p_livemode: true, p_event_type: A.calendlyEventTypeUri }));
    expect(f.stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_1', { expand: ['latest_charge'] });
  });

  it('exact replay reports replayed', async () => {
    const f = fx(); f.db.rpc.mockResolvedValue({ data: false, error: null });
    expect(await run(f)).toBe('replayed');
  });

  it.each([
    ['wrong product', (f: any) => { f.order.items[0].product._id = 'p_other'; }],
    ['wrong GHL price', (f: any) => { f.order.items[0].price._id = 'pr_other'; }],
    ['wrong order amount', (f: any) => { f.order.amount = 48; }],
    ['two order lines', (f: any) => { f.order.items.push(f.order.items[0]); }],
    ['foreign order location', (f: any) => { f.order.altId = 'x'; }],
    ['test-mode order on live', (f: any) => { f.order.liveMode = false; }],
    ['test-mode payment on live', (f: any) => { f.pi.livemode = false; }],
    ['partial amount received', (f: any) => { f.pi.amount_received = 4000; }],
    ['refunded charge', (f: any) => { f.charge.amount_refunded = 4900; }],
    ['disputed charge', (f: any) => { f.charge.disputed = true; }],
    ['transaction for another payment only', (f: any) => { f.tx[0].chargeId = 'pi_9'; f.tx.push({ ...f.tx[0], chargeId: 'pi_1', entityId: 'ord_9' }); }],
    ['transaction amount mismatch', (f: any) => { f.tx[0].amount = 50; }],
    ['foreign PaymentIntent location', (f: any) => { f.pi.metadata.altId = 'other_loc'; }],
    ['contact mismatch', (f: any) => { f.pi.metadata.contactId = 'ct_9'; }],
  ])('rejects terminally: %s (never records)', async (_n, mut) => {
    const f = fx(); mut(f);
    expect(await run(f)).toBe('rejected');
    expect(f.db.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['payment metadata not yet written', (f: any) => { f.pi.metadata = {}; }],
    ['order not yet visible (404)', (f: any) => { f.fetchFn.mockImplementation(async () => new Response('{}', { status: 404 })); }],
    ['order not yet completed', (f: any) => { f.order.paymentStatus = 'pending'; }],
    ['transaction not yet listed', (f: any) => { f.tx.length = 0; }],
    ['customer email missing', (f: any) => { f.stripe.customers.retrieve.mockResolvedValue({ email: '' }); }],
  ])('pending (retry, no record): %s', async (_n, mut) => {
    const f = fx(); mut(f);
    await expect(run(f)).rejects.toBeInstanceOf(MentoringPending);
    expect(f.db.rpc).not.toHaveBeenCalled();
  });

  it('GHL auth/server errors retry instead of granting or rejecting', async () => {
    const f = fx(); f.fetchFn.mockImplementation(async () => new Response('{}', { status: 401 }));
    await expect(run(f)).rejects.toThrow(/HTTP 401/);
    expect(f.db.rpc).not.toHaveBeenCalled();
  });

  it('late GHL metadata: first delivery pending, redelivery records', async () => {
    const f = fx(); const md = f.pi.metadata; f.pi.metadata = {};
    await expect(run(f)).rejects.toBeInstanceOf(MentoringPending);
    f.pi.metadata = md;
    expect(await run(f)).toBe('recorded');
    expect(f.db.rpc).toHaveBeenCalledTimes(1);
  });

  it('QA config requires explicit IDs and is test-mode only', () => {
    expect(() => mentoringQaConfig({ locationId: '', ghlProductId: 'a', ghlPriceId: 'b', calendlyEventTypeUri: 'c' })).toThrow();
    expect(mentoringQaConfig({ locationId: 'l', ghlProductId: 'a', ghlPriceId: 'b', calendlyEventTypeUri: 'c' }).expectedLivemode).toBe(false);
    expect(mentoringConfig(() => 'true').expectedLivemode).toBe(true);
  });
});

function memStore(e: Partial<Entitlement> = {}, outstanding = 0, booked: string[] = []) {
  const ent: Entitlement = { id: '11111111-1111-4111-8111-111111111111', email: 'b@x.com', status: 'paid', calendly_event_type_uri: A.calendlyEventTypeUri, calendly_link_url: null, link_attempt_started_at: null, ...e };
  const log: string[] = [];
  const hooks: { beforeSave?: () => void; afterGet?: (n: number) => void } = {};
  let gets = 0;
  const store: MentoringStore = {
    get: async () => { gets++; hooks.afterGet?.(gets); return { ...ent }; },
    outstandingExcluding: async () => outstanding,
    bookedStarts: async () => booked,
    beginLink: async () => { if (ent.link_attempt_started_at || ent.status !== 'paid') return false; ent.link_attempt_started_at = 'now'; return true; },
    clearLinkAttempt: async () => { ent.link_attempt_started_at = null; log.push('clear'); },
    saveLink: async (_id, url) => { hooks.beforeSave?.(); if (ent.status !== 'paid' || ent.calendly_link_url) return false; ent.calendly_link_url = url; ent.status = 'link_ready'; return true; },
    markDispatched: async () => { if (ent.status !== 'link_ready') return false; ent.status = 'dispatched'; log.push('dispatched'); return true; },
    retry: async (_i, _a, r) => { log.push(`retry:${r}`); },
    withhold: async (_i, r, staff) => { log.push(`withhold:${staff}:${r}`); },
  };
  return { ent, store, log, hooks };
}
const env = { enabled: true, calendlyToken: 't', ghlKey: 'g', locationId: 'loc', linkFieldId: 'fld', idFieldId: 'idf' };
const slotsEvery30 = (n: number, from = Date.parse('2026-11-02T14:00:00Z')) => Array.from({ length: n }, (_, i) => new Date(from + i * 30 * 60_000).toISOString());
function calFetch(opts: { starts?: string[]; link?: () => Response; active?: boolean; dropFields?: boolean } = {}) {
  let stored: any[] = [];
  const calls: { url: string; method: string; body?: any }[] = [];
  let availCalls = 0;
  const fn = vi.fn(async (url: string, init?: any) => {
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(init.body) : undefined });
    if (url === A.calendlyEventTypeUri) return new Response(JSON.stringify({ resource: { active: opts.active ?? true, duration: 120, scheduling_url: A.calendlySchedulingUrl } }));
    if (url.includes('event_type_available_times')) { const c = availCalls++ === 0 ? (opts.starts ?? slotsEvery30(1)) : []; return new Response(JSON.stringify({ collection: c.map(start_time => ({ status: 'available', start_time })) })); }
    if (url.endsWith('/scheduling_links')) return opts.link ? opts.link() : new Response(JSON.stringify({ resource: { booking_url: 'https://calendly.com/d/abc-123' } }), { status: 201 });
    if (url.endsWith('/contacts/upsert')) { stored = init?.body ? JSON.parse(init.body).customFields : []; return new Response(JSON.stringify({ contact: { id: 'c1' } })); }
    if (url.includes('/tags')) return new Response('{}');
    if (url.endsWith('/contacts/c1')) return new Response(JSON.stringify({ contact: { customFields: opts.dropFields ? [] : stored.map((f: any) => ({ id: f.id, value: f.field_value })) } }));
    return new Response('{}', { status: 500 });
  }) as any;
  return { fn, calls };
}
const job = (s: ReturnType<typeof memStore>, attempts = 1) => ({ entitlement_id: s.ent.id, attempts });

describe('deliverable capacity', () => {
  it('overlapping 30-minute start choices are not separate sessions', () => {
    // 45 starts every 30 min across one day = 22.5h of starts; with 120 min + 2x30 buffer only one per 3h.
    // No artificial weekly cap: all 8 non-overlapping sessions are deliverable.
    expect(deliverableSessions(slotsEvery30(45), [])).toBe(8);
    expect(deliverableSessions(slotsEvery30(45), [], 120, 30, 2)).toBe(2);
  });
  it('more than 2 sessions per week are allowed; booked sessions still reduce capacity', () => {
    expect(deliverableSessions(slotsEvery30(45), ['2026-11-03T15:00:00Z'])).toBe(7);
    expect(deliverableSessions(slotsEvery30(45), ['2026-11-03T15:00:00Z', '2026-11-04T15:00:00Z'])).toBe(6);
  });
});

describe('$49 mentoring booking delivery', () => {
  it('creates one single-use link, stores it, then dispatches with per-purchase identity and tag re-entry', async () => {
    const s = memStore(); const f = calFetch({ starts: slotsEvery30(12) });
    expect(await deliverMentoringJob(s.store, job(s), env, f.fn)).toBe('dispatched');
    expect(f.calls.find(c => c.url.endsWith('/scheduling_links'))!.body).toEqual({ max_event_count: 1, owner: A.calendlyEventTypeUri, owner_type: 'EventType' });
    expect(s.ent.calendly_link_url).toBe(`https://calendly.com/d/abc-123?utm_content=${s.ent.id}`);
    expect(f.calls.find(c => c.url.endsWith('/contacts/upsert'))!.body.customFields).toEqual([{ id: 'fld', field_value: s.ent.calendly_link_url }, { id: 'idf', field_value: s.ent.id }]);
    const tags = f.calls.filter(c => c.url.includes('/tags'));
    expect(tags.map(t => t.method)).toEqual(['DELETE', 'POST']);
    expect(tags[1].body).toEqual({ tags: [MENTORING_TAG] });
    expect(s.ent.status).toBe('dispatched');
  });

  it('never tags when GHL did not store the booking fields (wrong field id)', async () => {
    const s = memStore({ status: 'link_ready', calendly_link_url: 'https://calendly.com/d/x', link_attempt_started_at: 'x' });
    const f = calFetch({ dropFields: true });
    expect(await deliverMentoringJob(s.store, job(s), env, f.fn)).toBe('retry');
    expect(f.calls.some(c => c.url.includes('/tags'))).toBe(false);
  });

  it('retry after a CRM failure reuses the stored link (no second Calendly link)', async () => {
    const s = memStore({ calendly_link_url: 'https://calendly.com/d/x?utm_content=1', status: 'link_ready', link_attempt_started_at: 'then' });
    const f = calFetch();
    expect(await deliverMentoringJob(s.store, job(s, 2), env, f.fn)).toBe('dispatched');
    expect(f.calls.some(c => c.url.endsWith('/scheduling_links'))).toBe(false);
  });

  it('holds when deliverable sessions do not exceed outstanding paid sessions', async () => {
    const s = memStore({}, 2); const f = calFetch({ starts: slotsEvery30(6) });
    expect(await deliverMentoringJob(s.store, job(s), env, f.fn)).toBe('held_no_capacity');
    expect(f.calls.some(c => c.url.endsWith('/scheduling_links'))).toBe(false);
  });

  it('holds when the event is inactive', async () => {
    const s = memStore(); const f = calFetch({ active: false });
    expect(await deliverMentoringJob(s.store, job(s), env, f.fn)).toBe('held_no_capacity');
  });

  it('ambiguous link response goes to staff review and is never retried automatically', async () => {
    const s = memStore(); const f = calFetch({ link: () => new Response('', { status: 502 }) });
    expect(await deliverMentoringJob(s.store, job(s), env, f.fn)).toBe('staff_review');
    const again = calFetch();
    expect(await deliverMentoringJob(s.store, job(s, 2), env, again.fn)).toBe('staff_review');
    expect(again.calls.some(c => c.url.endsWith('/scheduling_links'))).toBe(false);
  });

  it('definite 4xx means nothing was created: attempt cleared and retried later', async () => {
    const s = memStore(); const f = calFetch({ link: () => new Response('{}', { status: 403 }) });
    expect(await deliverMentoringJob(s.store, job(s), env, f.fn)).toBe('retry');
    expect(s.ent.link_attempt_started_at).toBeNull();
  });

  it('refund during link creation: conditional save fails and nothing is dispatched', async () => {
    const s = memStore(); s.hooks.beforeSave = () => { s.ent.status = 'refunded'; };
    const f = calFetch();
    expect(await deliverMentoringJob(s.store, job(s), env, f.fn)).toBe('staff_review');
    expect(f.calls.some(c => c.url.includes('/contacts'))).toBe(false);
  });

  it('refund after link saved but before dispatch: re-check stops the tag', async () => {
    const s = memStore(); s.hooks.afterGet = (n) => { if (n === 2) s.ent.status = 'refunded'; };
    const f = calFetch();
    // first get() returns paid; second (pre-dispatch) sees refunded
    s.hooks.afterGet = (n) => { if (n === 1) return; s.ent.status = 'refunded'; };
    expect(await deliverMentoringJob(s.store, job(s), env, f.fn)).toBe('withheld');
    expect(f.calls.some(c => c.url.includes('/contacts'))).toBe(false);
  });

  it('dispute (withheld) or refund before start: never touches Calendly or GHL', async () => {
    for (const status of ['refunded', 'withheld', 'booked', 'dispatched', 'canceled_by_member']) {
      const s = memStore({ status }); const f = calFetch();
      expect(await deliverMentoringJob(s.store, job(s), env, f.fn)).toBe('withheld');
      expect(f.fn).not.toHaveBeenCalled();
    }
  });

  it('entitlement changed between tag and mark: flagged for staff, not reported dispatched', async () => {
    const s = memStore({ status: 'link_ready', calendly_link_url: 'https://calendly.com/d/x', link_attempt_started_at: 'x' });
    const f = calFetch();
    const orig = f.fn.getMockImplementation();
    f.fn.mockImplementation(async (u: string, i: any) => { const r = await orig(u, i); if (u.includes('/tags') && i?.method === 'POST') s.ent.status = 'refunded'; return r; });
    expect(await deliverMentoringJob(s.store, job(s), env, f.fn)).toBe('staff_review');
  });
});

describe('Calendly booking webhook (canonical re-read)', () => {
  const ET = A.calendlyEventTypeUri;
  const EV = 'https://api.calendly.com/scheduled_events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const INV = `${EV}/invitees/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`;
  const EV2 = 'https://api.calendly.com/scheduled_events/cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const INV2 = `${EV2}/invitees/dddddddd-dddd-4ddd-8ddd-dddddddddddd`;
  const ID = '11111111-1111-4111-8111-111111111111';
  const start = Date.parse('2026-11-10T15:00:00Z');
  function world(ent: Partial<Ent> = {}) {
    const e: Ent = { id: ID, email: 'buyer@example.com', status: 'dispatched', booked_event_uri: null, reschedule_count: 0, calendly_event_type_uri: ET, updated_at: 'v0', ...ent };
    const res: Record<string, any> = {
      [INV]: { resource: { uri: INV, event: EV, email: 'Buyer@Example.com', tracking: { utm_content: ID } } },
      [EV]: { resource: { uri: EV, event_type: ET, start_time: new Date(start).toISOString(), status: 'active' } },
    };
    let v = 0; let conflicts = 0;
    const deps: CalendlyDeps = {
      getJson: async (u) => { if (!res[u]) throw new Error('404'); return res[u]; },
      findById: async (id) => (id === e.id ? { ...e } : null),
      findByBookedEvent: async (u) => (u === e.booked_event_uri ? { ...e } : null),
      cas: async (_id, ver, patch) => { if (conflicts > 0) { conflicts--; e.updated_at = `v${++v}`; return false; } if (ver !== e.updated_at) return false; Object.assign(e, patch, { updated_at: `v${++v}` }); return true; },
    };
    return { e, res, deps, conflict: (n: number) => { conflicts = n; } };
  }
  const created = (uri = INV) => ({ event: 'invitee.created', payload: { uri, tracking: { utm_content: ID }, email: 'attacker@x.com' } });
  const canceled = (uri = INV) => ({ event: 'invitee.canceled', payload: { uri } });

  it('books only after canonical event type and purchaser email match', async () => {
    const w = world();
    expect(await handleCalendlyWebhook(created(), w.deps)).toBe('updated');
    expect(w.e).toMatchObject({ status: 'booked', booked_event_uri: EV });
  });

  it('payload fields are ignored: a different canonical email is not booked', async () => {
    const w = world(); w.res[INV].resource.email = 'someone@else.com';
    await handleCalendlyWebhook(created(), w.deps);
    expect(w.e.status).toBe('dispatched');
    expect((w.e as any).staff_review_reason).toMatch(/email/);
  });

  it('wrong canonical event type is never booked', async () => {
    const w = world(); w.res[EV].resource.event_type = 'https://api.calendly.com/event_types/other';
    await handleCalendlyWebhook(created(), w.deps);
    expect(w.e.status).toBe('dispatched');
  });

  it('duplicate created delivery is a no-op', async () => {
    const w = world();
    await handleCalendlyWebhook(created(), w.deps);
    expect(await handleCalendlyWebhook(created(), w.deps)).toBe('unchanged');
  });

  it('out-of-order: created arriving after the member canceled ends as canceled_by_member', async () => {
    const w = world(); w.res[INV].resource.cancellation = { canceler_type: 'invitee', created_at: new Date(start - 3 * 86400e3).toISOString() };
    expect(await handleCalendlyWebhook(canceled(), w.deps)).toBe('unchanged'); // not booked yet; nothing to cancel
    expect(await handleCalendlyWebhook(created(), w.deps)).toBe('updated');
    expect(w.e.status).toBe('canceled_by_member');
  });

  it('one reschedule with >= 24h notice; the new booking chains from the old one', async () => {
    const w = world({ status: 'booked', booked_event_uri: EV });
    w.res[INV].resource.rescheduled = true;
    w.res[INV].resource.cancellation = { canceler_type: 'invitee', created_at: new Date(start - 48 * 3600e3).toISOString() };
    expect(await handleCalendlyWebhook(canceled(), w.deps)).toBe('updated');
    expect(w.e.reschedule_count).toBe(1);
    w.res[INV2] = { resource: { uri: INV2, event: EV2, email: 'buyer@example.com', old_invitee: INV } };
    w.res[EV2] = { resource: { uri: EV2, event_type: ET, start_time: '2026-11-12T15:00:00Z' } };
    expect(await handleCalendlyWebhook(created(INV2), w.deps)).toBe('updated');
    expect(w.e).toMatchObject({ status: 'booked', booked_event_uri: EV2 });
  });

  it('late reschedule goes to staff review; coach cancel goes to reschedule/refund review', async () => {
    const w = world({ status: 'booked', booked_event_uri: EV });
    w.res[INV].resource.rescheduled = true;
    w.res[INV].resource.cancellation = { canceler_type: 'invitee', created_at: new Date(start - 2 * 3600e3).toISOString() };
    await handleCalendlyWebhook(canceled(), w.deps);
    expect((w.e as any).staff_review_reason).toMatch(/24h/);
    const h = world({ status: 'booked', booked_event_uri: EV });
    h.res[INV].resource.cancellation = { canceler_type: 'host' };
    await handleCalendlyWebhook(canceled(), h.deps);
    expect(h.e.status).toBe('canceled_by_coach');
  });

  it('CAS conflict is retried by re-reading; persistent conflict throws so Calendly redelivers', async () => {
    const w = world(); w.conflict(1);
    expect(await handleCalendlyWebhook(created(), w.deps)).toBe('updated');
    const p = world(); p.conflict(5);
    await expect(handleCalendlyWebhook(created(), p.deps)).rejects.toThrow(/retry/);
  });

  it('refunded entitlement is never booked', async () => {
    const w = world({ status: 'refunded' });
    await handleCalendlyWebhook(created(), w.deps);
    expect(w.e.status).toBe('refunded');
  });

  it('webhook signature: valid accepted; tampered, stale, or missing key rejected', async () => {
    const key = 'k3y', body = '{"a":1}', t = 1_800_000_000;
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const hex = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`${t}.${body}`))), b => b.toString(16).padStart(2, '0')).join('');
    expect(await verifyCalendlySignature(`t=${t},v1=${hex}`, body, key, t)).toBe(true);
    expect(await verifyCalendlySignature(`t=${t},v1=${hex}`, '{"a":2}', key, t)).toBe(false);
    expect(await verifyCalendlySignature(`t=${t},v1=${hex}`, body, key, t + 600)).toBe(false);
    expect(await verifyCalendlySignature(`t=${t},v1=${hex}`, body, '', t)).toBe(false);
  });
});

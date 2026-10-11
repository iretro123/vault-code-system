import { describe, expect, it, vi } from 'vitest';
import { fulfillMentoringPayment, mentoringConfig, mentoringQaConfig, MentoringPending, MENTORING_APPROVED, isMentoringCandidate } from '../../supabase/functions/_shared/mentoringFulfillment';
import { deliverMentoringJob, type MentoringStore, type Entitlement, MENTORING_TAG } from '../../supabase/functions/_shared/mentoringDelivery';
import { decideCalendlyUpdate, matchFor, verifyCalendlySignature } from '../../supabase/functions/_shared/mentoringCalendly';

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
const run = (f: ReturnType<typeof fx>, c = cfg) => fulfillMentoringPayment({ id: 'pi_1', object: 'payment_intent', amount: 4900, currency: 'usd', metadata: f.pi.metadata }, f.stripe, f.db, c, 'k', { fetchFn: f.fetchFn });

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

function memStore(e: Partial<Entitlement> = {}, outstanding = 0) {
  const ent: Entitlement = { id: '11111111-1111-4111-8111-111111111111', email: 'b@x.com', status: 'paid', calendly_event_type_uri: A.calendlyEventTypeUri, calendly_link_url: null, link_attempt_started_at: null, ...e };
  const log: string[] = [];
  const store: MentoringStore = {
    get: async () => ent,
    outstandingExcluding: async () => outstanding,
    beginLink: async () => { if (ent.link_attempt_started_at) return false; ent.link_attempt_started_at = 'now'; return true; },
    clearLinkAttempt: async () => { ent.link_attempt_started_at = null; log.push('clear'); },
    saveLink: async (_id, url) => { ent.calendly_link_url = url; ent.status = 'link_ready'; },
    markSent: async () => { ent.status = 'sent'; log.push('sent'); },
    retry: async (_i, _a, r) => { log.push(`retry:${r}`); },
    withhold: async (_i, r, staff) => { log.push(`withhold:${staff}:${r}`); },
  };
  return { ent, store, log };
}
const env = { enabled: true, calendlyToken: 't', ghlKey: 'g', locationId: 'loc', linkFieldId: 'fld' };
function calFetch(opts: { slots?: number; link?: () => Response; active?: boolean } = {}) {
  const calls: { url: string; body?: any }[] = [];
  const fn = vi.fn(async (url: string, init?: any) => {
    calls.push({ url, body: init?.body ? JSON.parse(init.body) : undefined });
    if (url === A.calendlyEventTypeUri) return new Response(JSON.stringify({ resource: { active: opts.active ?? true, duration: 120, scheduling_url: A.calendlySchedulingUrl } }));
    if (url.includes('event_type_available_times')) return new Response(JSON.stringify({ collection: Array.from({ length: opts.slots ?? 5 }, () => ({ status: 'available' })) }));
    if (url.endsWith('/scheduling_links')) return opts.link ? opts.link() : new Response(JSON.stringify({ resource: { booking_url: 'https://calendly.com/d/abc-123' } }), { status: 201 });
    if (url.endsWith('/contacts/upsert')) return new Response(JSON.stringify({ contact: { id: 'c1' } }));
    if (url.includes('/tags')) return new Response('{}');
    return new Response('{}', { status: 500 });
  }) as any;
  return { fn, calls };
}

describe('$49 mentoring booking delivery', () => {
  it('creates one single-use link for the exact event, stores it, then tags GHL', async () => {
    const s = memStore(); const f = calFetch();
    expect(await deliverMentoringJob(s.store, { entitlement_id: s.ent.id, attempts: 1 }, env, f.fn)).toBe('sent');
    const link = f.calls.find(c => c.url.endsWith('/scheduling_links'))!;
    expect(link.body).toEqual({ max_event_count: 1, owner: A.calendlyEventTypeUri, owner_type: 'EventType' });
    expect(s.ent.calendly_link_url).toBe(`https://calendly.com/d/abc-123?utm_content=${s.ent.id}`);
    expect(f.calls.find(c => c.url.endsWith('/contacts/upsert'))!.body.customFields).toEqual([{ id: 'fld', field_value: s.ent.calendly_link_url }]);
    expect(f.calls.find(c => c.url.includes('/tags'))!.body).toEqual({ tags: [MENTORING_TAG] });
  });

  it('retry after a CRM failure reuses the stored link (no second Calendly link)', async () => {
    const s = memStore({ calendly_link_url: 'https://calendly.com/d/x?utm_content=1', status: 'link_ready', link_attempt_started_at: 'then' });
    const f = calFetch();
    expect(await deliverMentoringJob(s.store, { entitlement_id: s.ent.id, attempts: 2 }, env, f.fn)).toBe('sent');
    expect(f.calls.some(c => c.url.endsWith('/scheduling_links'))).toBe(false);
  });

  it('holds when open slots do not exceed outstanding paid sessions', async () => {
    const s = memStore({}, 3); const f = calFetch({ slots: 3 });
    expect(await deliverMentoringJob(s.store, { entitlement_id: s.ent.id, attempts: 1 }, env, f.fn)).toBe('held_no_capacity');
    expect(f.calls.some(c => c.url.endsWith('/scheduling_links'))).toBe(false);
  });

  it('holds when the event is inactive', async () => {
    const s = memStore(); const f = calFetch({ active: false });
    expect(await deliverMentoringJob(s.store, { entitlement_id: s.ent.id, attempts: 1 }, env, f.fn)).toBe('held_no_capacity');
  });

  it('ambiguous link response (timeout/5xx) goes to staff review and is never retried automatically', async () => {
    const s = memStore(); const f = calFetch({ link: () => new Response('', { status: 502 }) });
    expect(await deliverMentoringJob(s.store, { entitlement_id: s.ent.id, attempts: 1 }, env, f.fn)).toBe('staff_review');
    const again = calFetch();
    expect(await deliverMentoringJob(s.store, { entitlement_id: s.ent.id, attempts: 2 }, env, again.fn)).toBe('staff_review');
    expect(again.calls.some(c => c.url.endsWith('/scheduling_links'))).toBe(false);
  });

  it('definite 4xx means nothing was created: attempt cleared and retried later', async () => {
    const s = memStore(); const f = calFetch({ link: () => new Response('{}', { status: 403 }) });
    expect(await deliverMentoringJob(s.store, { entitlement_id: s.ent.id, attempts: 1 }, env, f.fn)).toBe('retry');
    expect(s.log).toContain('clear');
    expect(s.ent.link_attempt_started_at).toBeNull();
  });

  it.each(['refunded', 'withheld', 'booked', 'canceled_by_member'])('never delivers when %s', async (status) => {
    const s = memStore({ status }); const f = calFetch();
    expect(await deliverMentoringJob(s.store, { entitlement_id: s.ent.id, attempts: 1 }, env, f.fn)).toBe('withheld');
    expect(f.fn).not.toHaveBeenCalled();
  });
});

describe('Calendly booking policy', () => {
  const ET = A.calendlyEventTypeUri;
  const ev = 'https://api.calendly.com/scheduled_events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const inv = `${ev}/invitees/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`;
  const base = { status: 'booked', booked_event_uri: ev, reschedule_count: 0, calendly_event_type_uri: ET };
  const start = Date.parse('2026-11-01T15:00:00Z');
  const cancel = (o: any) => ({ event: 'invitee.canceled', payload: { uri: inv, scheduled_event: { event_type: ET, start_time: new Date(start).toISOString() }, ...o } });

  it('matches by our utm_content, else by the prior booking', () => {
    expect(matchFor({ event: 'invitee.created', payload: { tracking: { utm_content: '11111111-1111-4111-8111-111111111111' } } })).toEqual({ by: 'entitlement_id', value: '11111111-1111-4111-8111-111111111111' });
    expect(matchFor({ event: 'invitee.created', payload: { old_invitee: inv } })).toEqual({ by: 'booked_event_uri', value: ev });
    expect(matchFor({ event: 'invitee.created', payload: {} })).toBeNull();
  });

  it('first booking marks booked; a second fresh booking goes to staff review', () => {
    const created = { event: 'invitee.created', payload: { uri: inv, scheduled_event: { event_type: ET, start_time: 'x' } } };
    expect(decideCalendlyUpdate(created, { ...base, status: 'sent', booked_event_uri: null })).toMatchObject({ status: 'booked', booked_event_uri: ev });
    expect(decideCalendlyUpdate(created, base)).toEqual({ staff_review_reason: 'second booking on single-use entitlement' });
  });

  it('one reschedule with >= 24h notice is allowed; late or second goes to staff review', () => {
    expect(decideCalendlyUpdate(cancel({ rescheduled: true, cancellation: { canceler_type: 'invitee', created_at: new Date(start - 25 * 3600e3).toISOString() } }), base)).toEqual({ reschedule_count: 1 });
    expect(decideCalendlyUpdate(cancel({ rescheduled: true, cancellation: { canceler_type: 'invitee', created_at: new Date(start - 2 * 3600e3).toISOString() } }), base)).toMatchObject({ staff_review_reason: expect.stringMatching(/24h/) });
    expect(decideCalendlyUpdate(cancel({ rescheduled: true, cancellation: { canceler_type: 'invitee', created_at: new Date(start - 48 * 3600e3).toISOString() } }), { ...base, reschedule_count: 1 })).toMatchObject({ staff_review_reason: expect.stringMatching(/second/) });
  });

  it('member cancel is nonrefundable; coach cancel goes to reschedule/refund review', () => {
    expect(decideCalendlyUpdate(cancel({ cancellation: { canceler_type: 'invitee' } }), base)).toMatchObject({ status: 'canceled_by_member' });
    expect(decideCalendlyUpdate(cancel({ cancellation: { canceler_type: 'host' } }), base)).toMatchObject({ status: 'canceled_by_coach' });
  });

  it('ignores other event types and refunded entitlements', () => {
    const created = { event: 'invitee.created', payload: { uri: inv, scheduled_event: { event_type: 'https://api.calendly.com/event_types/other' } } };
    expect(decideCalendlyUpdate(created, { ...base, status: 'sent' })).toEqual({ staff_review_reason: 'booking on unexpected event type' });
    expect(decideCalendlyUpdate(cancel({}), { ...base, status: 'refunded' })).toMatchObject({ staff_review_reason: expect.any(String) });
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

// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { reconcileUnknownPrice, UnmanagedSubscription, type AccessRow } from '../../supabase/functions/_shared/legacyReconcile';

const sub = (o: Partial<{ status: string; customer: string }> = {}) => ({
  id: 'sub_legacy', customer: o.customer ?? 'cus_1', status: o.status ?? 'past_due',
  items: { data: [{ price: { id: 'price_unknown_whop' } }] },
});
const row: AccessRow = { user_id: 'u1', product_key: 'vault_academy', tier: 'elite_v1', status: 'active', stripe_subscription_id: 'sub_legacy', stripe_customer_id: 'cus_1' };

describe('stripe-webhook unknown-price branch', () => {
  it('unknown price, no bound account: unmanaged (acknowledged), no access mutation', async () => {
    const apply = vi.fn();
    await expect(reconcileUnknownPrice(sub(), async () => ({ data: [], error: null }), apply)).rejects.toBeInstanceOf(UnmanagedSubscription);
    expect(apply).not.toHaveBeenCalled();
  });
  it('unknown price, row bound to a different customer: unmanaged, no mutation', async () => {
    const apply = vi.fn();
    await expect(reconcileUnknownPrice(sub({ customer: 'cus_other' }), async () => ({ data: [row], error: null }), apply)).rejects.toBeInstanceOf(UnmanagedSubscription);
    expect(apply).not.toHaveBeenCalled();
  });
  it('unknown price WITH a mapped access row is NOT ignored: reconciles that row from the current subscription', async () => {
    const apply = vi.fn(async () => undefined);
    const t = await reconcileUnknownPrice(sub({ status: 'canceled' }), async () => ({ data: [row], error: null }), apply);
    expect(t).toEqual(row);
    expect(apply).toHaveBeenCalledWith(row);
  });
  it('ambiguous bindings fail closed (unmanaged), never pick one', async () => {
    const apply = vi.fn();
    await expect(reconcileUnknownPrice(sub(), async () => ({ data: [row, { ...row, user_id: 'u2' }], error: null }), apply)).rejects.toBeInstanceOf(UnmanagedSubscription);
    expect(apply).not.toHaveBeenCalled();
  });
  it('transient database read error propagates as a real error (webhook returns 500), not ignored', async () => {
    const dbErr = new Error('connection reset');
    const p = reconcileUnknownPrice(sub(), async () => ({ data: null, error: dbErr }), vi.fn());
    await expect(p).rejects.toBe(dbErr);
    await expect(p).rejects.not.toBeInstanceOf(UnmanagedSubscription);
  });
  it('transient write error during reconcile propagates (retryable)', async () => {
    const p = reconcileUnknownPrice(sub(), async () => ({ data: [row], error: null }), async () => { throw new Error('write failed'); });
    await expect(p).rejects.toThrow('write failed');
    await expect(p).rejects.not.toBeInstanceOf(UnmanagedSubscription);
  });
  it('replay applies the identical target/state each time (idempotent)', async () => {
    const apply = vi.fn(async () => undefined);
    const load = async () => ({ data: [row], error: null });
    await reconcileUnknownPrice(sub(), load, apply);
    await reconcileUnknownPrice(sub(), load, apply);
    expect(apply.mock.calls[0]).toEqual(apply.mock.calls[1]);
  });
  it('webhook handler maps only UnmanagedSubscription to "ignored"; everything else stays 500', () => {
    const src = readFileSync('supabase/functions/stripe-webhook/index.ts', 'utf8');
    expect(src).toMatch(/if \(err instanceof UnmanagedSubscription\) \{[\s\S]*?status: "ignored"[\s\S]*?status: 200/);
    expect(src).toMatch(/PROCESSING_ERROR[\s\S]*?status: "failed"[\s\S]*?status: 500/);
  });
});

describe('profiles.access_status validator', () => {
  const original = readFileSync('supabase/migrations/20260215150856_2993d8eb-259a-40fe-8bc3-b3621dafd9bc.sql', 'utf8');
  const fix = readFileSync('drizzle/migrations/0013_allow_inactive_access_status.sql', 'utf8');
  async function db() {
    const d = new PGlite();
    await d.exec('CREATE TABLE public.profiles(user_id int PRIMARY KEY);');
    await d.exec(original); await d.exec(fix);
    return d;
  }
  it('permits trial, active, inactive, revoked (previous values preserved) on insert and update', async () => {
    const d = await db();
    let i = 0;
    for (const v of ['trial', 'active', 'inactive', 'revoked']) await d.query('INSERT INTO profiles(user_id, access_status) VALUES ($1,$2)', [++i, v]);
    await d.query("UPDATE profiles SET access_status='inactive' WHERE user_id=2");
    expect((await d.query("SELECT count(*)::int n FROM profiles WHERE access_status='inactive'")).rows[0]).toEqual({ n: 2 });
  });
  it('still rejects invalid values', async () => {
    const d = await db();
    for (const v of ['banned', 'INACTIVE', '', 'paid']) {
      await expect(d.query('INSERT INTO profiles(user_id, access_status) VALUES (9,$1)', [v])).rejects.toThrow(/Invalid access_status/);
    }
    await d.query("INSERT INTO profiles(user_id) VALUES (10)");
    expect((await d.query('SELECT access_status FROM profiles WHERE user_id=10')).rows[0]).toEqual({ access_status: 'trial' });
  });
});

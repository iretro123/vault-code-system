// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import * as h from './helpers/returnClaimDb';
const read = (p: string) => readFileSync(path.resolve(__dirname, '../..', p), 'utf8');
let db: Awaited<ReturnType<typeof h.makeDb>>;
beforeAll(async () => {
  db = await h.makeDb([
    read('supabase/migrations/20261002000100_vault_return_onboarding.sql'),
    read('supabase/migrations/20261002000200_vault_return_onboarding_execute_grants.sql'),
    read('drizzle/migrations/0002_vault_return_claim_inbox_proof.sql'),
    read('drizzle/migrations/0003_vault_return_claim_session_strict.sql'),
    `ALTER TABLE public.allowed_signups ADD COLUMN stripe_customer_id text;
     ALTER TABLE public.student_access ADD COLUMN stripe_price_id text;
     ALTER TABLE public.vault_return_memberships ADD COLUMN source text;`,
    read('scripts/release/stripe-trial-access.sql'),
  ]);
});
afterAll(async () => { await db?.close(); });
async function member(status: string, price: string | null = 'price_1TYctUAMsd1FtcvLi570XeiH') {
  const u = await h.addUser(db, `${h.uid()}@example.com`);
  const s = await h.addSession(db, u, 'password');
  const student = h.uid();
  const sub = `sub_${h.uid()}`;
  await db.query('INSERT INTO public.students VALUES ($1,$2)', [student,u]);
  await db.query(`INSERT INTO public.student_access VALUES ($1,$2,'vault_academy',$3,'cus_verified',$4)`, [student,status,sub,price]);
  const allowed = () => h.hasAccess(db,u,'member@example.com',s);
  return { u, student, sub, allowed };
}
describe('live Stripe trial access policy', () => {
  it('Meghan legacy trialing subscription receives full access without rewriting Stripe status', async () => {
    const m = await member('trialing');
    expect(await m.allowed()).toBe(true);
    expect((await db.query<{status:string}>('SELECT status FROM public.student_access WHERE user_id=$1',[m.student])).rows[0]?.status).toBe('trialing');
  });
  it('active Stripe subscriptions retain full access', async () => {
    expect(await (await member('active')).allowed()).toBe(true);
  });
  it.each(['past_due','canceled','unpaid','incomplete','paused'])('%s does not qualify', async (status) => {
    expect(await (await member(status)).allowed()).toBe(false);
  });
  it.each(['price_1UOqHXAMsd1FtcvLBM7QdEOz','price_1UR1FcAMsd1FtcvLgvyx0GFO','price_1UR1DwAMsd1FtcvL2q3fUjQE'])('GHL offer %s cannot bypass verified invoice activation', async (price) => {
    expect(await (await member('trialing',price)).allowed()).toBe(false);
  });
  it('missing price does not authorize an unverified trial', async () => {
    expect(await (await member('trialing',null)).allowed()).toBe(false);
  });
  it('ban overrides a trial', async () => {
    const m=await member('trialing');
    await db.query('UPDATE public.profiles SET is_banned=true WHERE user_id=$1',[m.u]);
    expect(await m.allowed()).toBe(false);
  });
  it('revocation overrides an active subscription', async () => {
    const m=await member('active');
    await db.query("UPDATE public.profiles SET access_status='revoked' WHERE user_id=$1",[m.u]);
    expect(await m.allowed()).toBe(false);
  });
  it('missing customer linkage does not authorize a trial', async () => {
    const m=await member('trialing');
    await db.query('UPDATE public.student_access SET stripe_customer_id=null WHERE user_id=$1',[m.student]);
    expect(await m.allowed()).toBe(false);
  });
});
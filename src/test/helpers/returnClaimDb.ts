import { PGlite } from "@electric-sql/pglite";
// Shared harness for SQL-level paid-return claim tests (src/test/returnClaimProof.sql.test.ts).

// Minimal stand-in for the hosted auth schema: only the columns the claim and
// access functions read. auth.uid()/auth.jwt() read request.jwt.claims exactly
// like the hosted helpers do.
const AUTH_STUB = `
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
CREATE TABLE auth.sessions(id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE auth.mfa_amr_claims(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid REFERENCES auth.sessions(id), authentication_method text, created_at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(auth.jwt()->>'sub','')::uuid $$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid() TO anon, authenticated, service_role;
CREATE TABLE public.profiles(user_id uuid PRIMARY KEY, is_banned boolean, access_status text);
CREATE TABLE public.allowed_signups(email text);
CREATE TABLE public.user_roles(user_id uuid, role text);
CREATE TABLE public.academy_roles(id uuid PRIMARY KEY, name text);
CREATE TABLE public.academy_user_roles(user_id uuid, role_id uuid);
CREATE TABLE public.students(id uuid PRIMARY KEY, auth_user_id uuid);
CREATE TABLE public.student_access(user_id uuid, status text, product_key text, stripe_subscription_id text, stripe_customer_id text);
CREATE TABLE public.ios_membership_activations(user_id uuid, expires_date timestamptz, metadata jsonb);
CREATE TABLE public.android_membership_activations(user_id uuid, expires_date timestamptz, subscription_state text);
`;

export async function makeDb(migrations: string[]) {
  const db = new PGlite();
  await db.exec(AUTH_STUB);
  for (const sql of migrations) await db.exec(sql);
  return db;
}

export const uid = () => crypto.randomUUID();

export async function addUser(db: PGlite, email: string) {
  const id = uid();
  await db.query("INSERT INTO auth.users VALUES ($1,$2,now())", [id, email]);
  await db.query("INSERT INTO public.profiles VALUES ($1,false,null)", [id]);
  return id;
}

export async function addSession(db: PGlite, userId: string, method: "otp" | "password", ageMinutes = 0) {
  const id = uid();
  await db.query("INSERT INTO auth.sessions VALUES ($1,$2,now() - make_interval(mins => $3))", [id, userId, ageMinutes]);
  await db.query("INSERT INTO auth.mfa_amr_claims(session_id,authentication_method,created_at) VALUES ($1,$2,now() - make_interval(mins => $3))", [id, method, ageMinutes]);
  return id;
}

export async function addPaid(db: PGlite, email: string) {
  const sub = "sub_" + uid();
  await db.query(
    "SELECT public.record_vault_return_payment($1,$2,'cus_test',$3,'active',now()+interval '30 days')",
    [sub, "cs_" + sub, email],
  );
  return sub;
}

export async function prepare(db: PGlite, sessionId: string, userId: string, email: string, ageMinutes = 0) {
  await db.query("INSERT INTO public.vault_return_claim_proofs VALUES ($1,$2,$3,now() - make_interval(mins => $4))", [sessionId, userId, email, ageMinutes]);
}

/** Run fn as the `authenticated` role carrying a JWT for (user, session). */
export async function asUser<T>(db: PGlite, userId: string, email: string, sessionId: string, sql: string): Promise<T> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated", email, session_id: sessionId });
  return db.transaction(async (tx) => {
    await tx.query("SELECT set_config('request.jwt.claims',$1,true)", [claims]);
    await tx.exec("SET LOCAL ROLE authenticated");
    const r = await tx.query<{ v: T }>(sql);
    return r.rows[0]?.v as T;
  });
}

export const claim = (db: PGlite, u: string, e: string, s: string) =>
  asUser<boolean>(db, u, e, s, "SELECT public.claim_vault_return_membership() AS v");

/** has_current_full_access() equivalent: vault_access_for_user(auth.uid()) under the caller's JWT. */
export async function hasAccess(db: PGlite, u: string, e: string, s: string) {
  const claims = JSON.stringify({ sub: u, role: "authenticated", email: e, session_id: s });
  return db.transaction(async (tx) => {
    await tx.query("SELECT set_config('request.jwt.claims',$1,true)", [claims]);
    const r = await tx.query<{ v: boolean }>("SELECT public.vault_access_for_user(auth.uid()) AS v");
    return r.rows[0].v;
  });
}

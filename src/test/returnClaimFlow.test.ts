import { describe, expect, it } from "vitest";
import { bindReturnMembership, type ClaimDeps } from "../../supabase/functions/_shared/returnClaimFlow";

// Fake auth server with the real semantics that broke production:
// an admin password change deletes EVERY session for the user.
const NOW = 1_800_000_000;
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
function fakeAuth() {
  const sessions = new Map<string, { user: string; amr: string; at: number }>();
  const proofs = new Map<string, string>();
  let n = 0; let password = "attacker-set";
  const jwt = (sid: string) => { const s = sessions.get(sid)!; return `h.${b64({ sub: s.user, session_id: sid, role: "authenticated", email: "buyer@x.co", amr: [{ method: s.amr, timestamp: s.at }] })}.s`; };
  const open = (user: string, amr: string) => { const sid = `s${++n}`; sessions.set(sid, { user, amr, at: NOW }); return sid; };
  const sidOf = (t: string) => JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).session_id as string;
  const claimed: string[] = [];
  const deps: ClaimDeps = {
    setPassword: async (u, p) => { password = p; for (const [k, v] of sessions) if (v.user === u) sessions.delete(k); },
    revokeAll: async (t) => { const s = sessions.get(sidOf(t)); if (!s) throw new Error("session_not_found"); for (const [k, v] of sessions) if (v.user === s.user) sessions.delete(k); },
    mintEmailLinkSession: async () => jwt(open("u1", "otp")) && { access_token: jwt(`s${n}`), refresh_token: "r" },
    writeProof: async (sid, u) => { proofs.set(sid, u); },
    // Mirrors the SQL RPC: the session must still exist, be an email-link session and carry a proof row.
    claimAs: async (t) => { const sid = sidOf(t); const s = sessions.get(sid); if (!s || s.amr !== "otp" || proofs.get(sid) !== s.user) return false; claimed.push(sid); return true; },
    nowSeconds: () => NOW,
  };
  return { deps, open, jwt, sessions, claimed, get password() { return password; } };
}

describe("paid return bind with real session revocation", () => {
  it("old order fails: claiming with the caller session after the password change", async () => {
    const a = fakeAuth(); const caller = a.open("u1", "otp"); const t = a.jwt(caller);
    await a.deps.setPassword("u1", "x");
    await a.deps.writeProof(caller, "u1", "buyer@x.co");
    expect(await a.deps.claimAs(t)).toBe(false); // the production failure
  });

  it("binds on a freshly minted email-link session that survives the revocation", async () => {
    const a = fakeAuth();
    const attacker = a.open("u1", "password");
    const caller = a.open("u1", "otp");
    const r = await bindReturnMembership(a.deps, a.jwt(caller), "u1", "buyer@x.co");
    expect(r.ok).toBe(true);
    expect(a.sessions.has(attacker)).toBe(false);
    expect(a.sessions.has(caller)).toBe(false);
    expect(a.password).not.toBe("attacker-set");
    expect(a.claimed).toHaveLength(1);
    expect(a.sessions.has(a.claimed[0])).toBe(true);
    if (r.ok) expect(r.session.access_token).toContain(".");
  });

  it("password-only caller never triggers a password change or bind", async () => {
    const a = fakeAuth(); const caller = a.open("u1", "password");
    const r = await bindReturnMembership(a.deps, a.jwt(caller), "u1", "buyer@x.co");
    expect(r).toEqual({ ok: false, reason: "fresh_email_link_required" });
    expect(a.password).toBe("attacker-set");
    expect(a.sessions.has(caller)).toBe(true);
  });

  it("if minting fails the user is told to open a new link and retry is safe", async () => {
    const a = fakeAuth(); const caller = a.open("u1", "otp");
    const r = await bindReturnMembership({ ...a.deps, mintEmailLinkSession: async () => null }, a.jwt(caller), "u1", "buyer@x.co");
    expect(r).toEqual({ ok: false, reason: "fresh_email_link_required" });
    expect(a.claimed).toHaveLength(0);
    const retry = a.open("u1", "otp");
    expect((await bindReturnMembership(a.deps, a.jwt(retry), "u1", "buyer@x.co")).ok).toBe(true);
  });

  it("a minted session for another account is rejected", async () => {
    const a = fakeAuth(); const caller = a.open("u1", "otp");
    const other = { access_token: `h.${b64({ sub: "u2", session_id: "z", role: "authenticated", amr: [{ method: "otp", timestamp: NOW }] })}.s`, refresh_token: "r" };
    const r = await bindReturnMembership({ ...a.deps, mintEmailLinkSession: async () => other }, a.jwt(caller), "u1", "buyer@x.co");
    expect(r.ok).toBe(false);
    expect(a.claimed).toHaveLength(0);
  });
});

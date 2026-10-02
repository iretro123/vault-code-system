import { describe, expect, it } from "vitest";
import { decodeJwtClaims, hasFreshInboxProof, randomUnusablePassword } from "../../supabase/functions/_shared/returnClaimProof";

const now = 1_800_000_000;
const tok = (p: object) => `h.${btoa(JSON.stringify(p)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}.s`;
const base = { sub: "u", session_id: "s", role: "authenticated", email: "a@b.co" };

describe("edge inbox-proof precheck", () => {
  it("accepts a fresh email-link session", () => {
    expect(hasFreshInboxProof(decodeJwtClaims(tok({ ...base, amr: [{ method: "otp", timestamp: now - 60 }] })), now)).toBe(true);
  });
  it("rejects password-only sessions", () => {
    expect(hasFreshInboxProof(decodeJwtClaims(tok({ ...base, amr: [{ method: "password", timestamp: now }] })), now)).toBe(false);
  });
  it("rejects stale email links", () => {
    expect(hasFreshInboxProof(decodeJwtClaims(tok({ ...base, amr: [{ method: "otp", timestamp: now - 16 * 60 }] })), now)).toBe(false);
  });
  it("rejects recovery links, string-only amr and missing session", () => {
    expect(hasFreshInboxProof(decodeJwtClaims(tok({ ...base, amr: [{ method: "recovery", timestamp: now }] })), now)).toBe(false);
    expect(hasFreshInboxProof(decodeJwtClaims(tok({ ...base, amr: ["otp"] })), now)).toBe(false);
    expect(hasFreshInboxProof(decodeJwtClaims(tok({ ...base, session_id: undefined, amr: [{ method: "otp", timestamp: now }] })), now)).toBe(false);
    expect(decodeJwtClaims("garbage")).toBeNull();
  });
  it("replacement passwords are long and unique", () => {
    const a = randomUnusablePassword();
    expect(a.length).toBeGreaterThanOrEqual(64);
    expect(a).not.toBe(randomUnusablePassword());
  });
});

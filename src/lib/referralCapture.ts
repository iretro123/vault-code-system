import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "vault_referral";
const SESSION_DEDUPE_KEY = "vault_ref_click_logged";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface StoredReferral {
  code: string;
  capturedAt: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidRefCode(code: string): boolean {
  return UUID_RE.test(code);
}

/**
 * Capture a referral code from URL, persist with TTL, and log a click (best-effort).
 */
export function captureReferral(refCode: string): void {
  if (!refCode || !isValidRefCode(refCode)) {
    console.log("[Referral] invalid or empty ref code, skipping:", refCode);
    return;
  }

  const existing = readStorage();

  // Don't overwrite if same code already stored
  if (existing && existing.code === refCode) {
    console.log("[Referral] same code already stored, skipping:", refCode);
    return;
  }

  const entry: StoredReferral = { code: refCode, capturedAt: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    console.log("[Referral] captured:", refCode);
  } catch {
    console.warn("[Referral] localStorage write failed");
  }

  // Best-effort click tracking with session dedupe
  const alreadyLogged = sessionStorage.getItem(SESSION_DEDUPE_KEY);
  if (alreadyLogged === refCode) {
    console.log("[Referral] click already logged this session, skipping");
    return;
  }

  // Fire-and-forget click insert
  supabase
    .from("referrals" as any)
    .insert({ referrer_user_id: refCode, status: "clicked" } as any)
    .then(({ error }) => {
      if (error) {
        console.warn("[Referral] click tracking error:", error.message);
      } else {
        console.log("[Referral] click tracked for:", refCode);
        try { sessionStorage.setItem(SESSION_DEDUPE_KEY, refCode); } catch {}
      }
    });
}

function readStorage(): StoredReferral | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredReferral;
  } catch {
    return null;
  }
}

/**
 * Get stored referral code if still within TTL. Returns null if expired/missing.
 */
export function getStoredReferral(): string | null {
  const entry = readStorage();
  if (!entry) return null;

  if (Date.now() - entry.capturedAt > TTL_MS) {
    console.log("[Referral] stored code expired, clearing");
    clearStoredReferral();
    return null;
  }

  console.log("[Referral] read stored code:", entry.code);
  return entry.code;
}

/**
 * Clear stored referral data.
 */
export function clearStoredReferral(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_DEDUPE_KEY);
    console.log("[Referral] cleared stored referral");
  } catch {}
}

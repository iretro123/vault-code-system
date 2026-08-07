import { useState, useEffect, useRef, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/ensureProfile";
import { reconcileMembershipNow } from "@/lib/membershipReconciler";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";

type AppRole = "free" | "vault_os_owner" | "vault_access" | "vault_intelligence" | "operator" | "basic_tier";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  discipline_status: string;
  discipline_score: number;
  onboarding_completed: boolean;
  default_trading_style: string;
  initialized_at: string | null;
  access_status: string;
  academy_experience: string;
  role_level: string;
  intro_posted: boolean;
  first_lesson_started: boolean;
  timezone: string | null;
  [key: string]: any;
}

interface UserRole {
  role: AppRole;
  subscription_status: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasMinRole: (minRole: AppRole) => boolean;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const roleHierarchy: AppRole[] = ["free", "vault_os_owner", "vault_access", "vault_intelligence", "operator"];

const PROFILE_CACHE_KEY = "va_cache_profile";
const ROLE_CACHE_KEY = "va_cache_role";

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const CACHE_KEYS = [
  PROFILE_CACHE_KEY, ROLE_CACHE_KEY,
  "va_cache_inbox", "va_cache_referral", "va_cache_onboarding",
  "va_inbox_open", "va_cache_academy_rbac", "va_cache_user_tasks",
  "va_cache_pb_chapters", "va_cache_pb_progress", "va_cache_scoreboard",
  "va_cache_live_dash", "va_cache_modules", "va_cache_lessons",
  "va_cache_live_sessions", "va_cache_trade_entries", "va_cache_student_access",
  "va_cache_ai_focus", "va_cache_lesson_progress", "va_cache_hot_tickers",
];

function isNativePlatform() {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return true;
  if (window.location?.protocol === "capacitor:") return true;
  return /Capacitor/i.test(navigator.userAgent);
}

async function getPushPlatformKey() {
  const basePlatform = Capacitor.getPlatform();
  try {
    const { identifier } = await Device.getId();
    const stableId = String(identifier || "").trim();
    if (stableId) return `${basePlatform}:${stableId}`;
  } catch (err) {
    console.warn("Failed to resolve device id before sign out", err);
  }
  return basePlatform;
}

async function unregisterPushForCurrentDevice() {
  if (!isNativePlatform()) return;

  try {
    const platformKey = await getPushPlatformKey();
    const { error } = await (supabase as any).rpc("unregister_device_token", {
      _platform: platformKey,
    });

    if (error) {
      console.warn("unregister_device_token RPC failed before sign out", error);
    }
  } catch (err) {
    console.warn("Push token cleanup failed before sign out", err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => readCache(PROFILE_CACHE_KEY, null));
  const [userRole, setUserRole] = useState<UserRole | null>(() => readCache(ROLE_CACHE_KEY, null));
  const [loading, setLoading] = useState(true);

  // Ref to deduplicate fetchUserData between getSession and onAuthStateChange
  const fetchedForRef = useRef<string | null>(null);
  // Ref to access profile in the auth callback without stale closure
  const profileRef = useRef<Profile | null>(profile);
  profileRef.current = profile;

  /** Consolidated sign-out + state clearing */
  async function signOutCleanup() {
    await unregisterPushForCurrentDevice();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setUserRole(null);
    fetchedForRef.current = null;
    try {
      CACHE_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {
      void 0;
    }
    setLoading(false);
  }

  /** Handle a valid profile row — ban check, state update, timezone backfill */
  async function handleProfile(profileData: (Profile & { is_banned?: boolean }) | null, userId: string) {
    if (!profileData) return false;
    // Note: revoked/banned users are NOT auto-signed-out here. The session is kept
    // so users retain their saved login; access is gated by route-level screens
    // (AcademyLayout shows a "revoked" screen, AccessBlockModal handles past_due, etc).
    // Only an explicit user Sign Out (or clearing browser storage) should end the session.

    // Shallow-equal check: skip state update if data hasn't changed
    setProfile(prev => {
      if (prev && JSON.stringify(prev) === JSON.stringify(profileData)) return prev;
      return profileData as Profile;
    });
    try {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profileData));
    } catch {
      void 0;
    }

    // Backfill timezone only if truly empty
    const tz = profileData.timezone;
    if (!tz) {
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detected) {
          await supabase.from("profiles").update({ timezone: detected }).eq("user_id", userId);
        }
      } catch {
        void 0;
      }
    }
    return true;
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === "PASSWORD_RECOVERY") {
          window.location.href = "/reset-password";
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const uid = newSession.user.id;

          // Guard: skip redundant fetches on TOKEN_REFRESHED if profile already loaded for this user
          const currentProfile = profileRef.current;
          const alreadyLoaded = currentProfile &&
            (currentProfile.user_id === uid || currentProfile.id === uid);

          if (event === "TOKEN_REFRESHED" && alreadyLoaded) {
            // Profile unchanged — just make sure loading is false
            setLoading(false);
            return;
          }

          // Detect user switch — clear stale state
          const cachedUid = currentProfile?.user_id || currentProfile?.id;
          if (cachedUid && cachedUid !== uid) {
            setProfile(null);
            setUserRole(null);
            fetchedForRef.current = null;
            setLoading(true);
          }

          // Dedup: skip if getSession already triggered fetch for this user
          if (fetchedForRef.current === uid) return;
          fetchedForRef.current = uid;

          setTimeout(async () => {
            await ensureProfile(uid, newSession.user.email);
            fetchUserData(uid);
            // Silently reconcile any Apple StoreKit entitlement the user is
            // paying for but hasn't been credited yet. Never blocks UI.
            void reconcileMembershipNow(uid);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
          fetchedForRef.current = null;
          try {
            localStorage.removeItem(PROFILE_CACHE_KEY);
            localStorage.removeItem(ROLE_CACHE_KEY);
          } catch {
            void 0;
          }
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        const uid = initialSession.user.id;
        // Dedup: skip if onAuthStateChange already triggered fetch
        if (fetchedForRef.current === uid) return;
        fetchedForRef.current = uid;

        await ensureProfile(uid, initialSession.user.email);
        fetchUserData(uid);
        void reconcileMembershipNow(uid);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        console.warn("[Auth] No profile data yet — retaining the saved session and retrying on refresh");
        const { data: retryData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (!retryData) {
          // New accounts can briefly exist before their profile trigger completes.
          // Keep the valid Supabase session instead of logging the user out.
          return;
        }
        const ok = await handleProfile(retryData, userId);
        if (!ok) return;
      } else {
        const ok = await handleProfile(profileData, userId);
        if (!ok) return;
      }

      // Fetch user role(s) — a user may have multiple rows; pick the most restrictive.
      const { data: roleRows, error: roleError } = await supabase
        .from("user_roles")
        .select("role, subscription_status")
        .eq("user_id", userId);

      if (roleError) throw roleError;

      let roleData: UserRole | null = null;
      if (roleRows && roleRows.length > 0) {
        // Highest entitlement wins. basic_tier/free rank LAST so a leftover
        // signup row can never demote a staff member or a paying customer.
        // Visibility itself is deny-by-default in src/lib/entitlements.ts.
        const priority: AppRole[] = ["operator", "vault_intelligence", "vault_access", "vault_os_owner", "basic_tier", "free"];

        const sorted = [...roleRows].sort(
          (a, b) => priority.indexOf(a.role as AppRole) - priority.indexOf(b.role as AppRole)
        );
        roleData = sorted[0] as UserRole;
      }

      if (roleData) {
        setUserRole(prev => {
          if (prev && JSON.stringify(prev) === JSON.stringify(roleData)) return prev;
          return roleData as UserRole;
        });
        try {
          localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(roleData));
        } catch {
          void 0;
        }
      }
    } catch (error) {
      // Network and startup failures must not destroy a valid persisted login.
      // Supabase will emit SIGNED_OUT itself if the refresh token is truly invalid.
      console.error("[Auth] Could not refresh profile data; keeping saved session and cache:", error);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    await signOutCleanup();
  }

  function hasRole(role: AppRole): boolean {
    if (!userRole) return false;
    return userRole.role === role;
  }

  function hasMinRole(minRole: AppRole): boolean {
    if (!userRole) return false;
    const userRoleIndex = roleHierarchy.indexOf(userRole.role);
    const minRoleIndex = roleHierarchy.indexOf(minRole);
    return userRoleIndex >= minRoleIndex;
  }

  async function refetchProfile() {
    if (user) {
      fetchedForRef.current = null; // allow re-fetch
      await fetchUserData(user.id);
    }
  }

  const value = {
    user, session, profile, userRole, loading,
    signUp, signIn, signOut, hasRole, hasMinRole, refetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

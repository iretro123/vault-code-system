// Shared-guest sign-in. Ensures a single shared `guest` auth user exists with
// the `basic_tier` role, then returns its credentials so the client can sign
// in via supabase.auth.signInWithPassword. Basic-tier gating restricts the
// guest to Learn + Community.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GUEST_EMAIL = "guest@vaulttradingacademy.com";
const GUEST_PASSWORD = "GuestVault!Shared#2026";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // 1. Find or create the shared guest user.
    let guestId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users.find((u) => u.email?.toLowerCase() === GUEST_EMAIL);
    if (existing) {
      guestId = existing.id;
      // Make sure password is current + email confirmed.
      await admin.auth.admin.updateUserById(existing.id, {
        password: GUEST_PASSWORD,
        email_confirm: true,
      });
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: GUEST_EMAIL,
        password: GUEST_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: "Guest", is_shared_guest: true },
      });
      if (error || !created.user) throw error ?? new Error("createUser failed");
      guestId = created.user.id;
    }

    // 2. Ensure basic_tier role so the guest is restricted to Learn + Community.
    if (guestId) {
      await admin.from("user_roles").upsert(
        { user_id: guestId, role: "basic_tier" },
        { onConflict: "user_id,role" },
      );
    }

    return new Response(
      JSON.stringify({ email: GUEST_EMAIL, password: GUEST_PASSWORD }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

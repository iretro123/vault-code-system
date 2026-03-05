import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, auth_user_id } = await req.json();
    if (!email || !auth_user_id) {
      return new Response(JSON.stringify({ error: "email and auth_user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if this email is in allowed_signups and NOT yet claimed
    const { data: whitelist } = await sb
      .from("allowed_signups")
      .select("id, stripe_customer_id")
      .eq("email", normalizedEmail)
      .eq("claimed", false)
      .maybeSingle();

    if (!whitelist) {
      console.log("[provision] No unclaimed whitelist entry for:", normalizedEmail);
      return new Response(JSON.stringify({ provisioned: false, reason: "not_whitelisted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Mark whitelist entry as claimed (service role bypasses RLS)
    await sb
      .from("allowed_signups")
      .update({ claimed: true })
      .eq("id", whitelist.id);

    console.log("[provision] Marked whitelist entry as claimed:", whitelist.id);

    // 3. Check if students row already exists
    const { data: existingStudent } = await sb
      .from("students")
      .select("id")
      .eq("auth_user_id", auth_user_id)
      .maybeSingle();

    if (existingStudent) {
      console.log("[provision] Student already exists for:", auth_user_id);
      return new Response(JSON.stringify({ provisioned: false, reason: "already_exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Create students row
    const { data: newStudent, error: studentErr } = await sb
      .from("students")
      .insert({
        email: normalizedEmail,
        auth_user_id,
        stripe_customer_id: whitelist.stripe_customer_id || null,
      })
      .select("id")
      .single();

    if (studentErr || !newStudent) {
      console.error("[provision] Failed to create student:", studentErr?.message);
      return new Response(JSON.stringify({ error: "Failed to create student record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Create student_access row
    const { error: accessErr } = await sb
      .from("student_access")
      .insert({
        user_id: newStudent.id,
        status: "active",
        product_key: "vault_academy",
        tier: "elite_v1",
        stripe_customer_id: whitelist.stripe_customer_id || null,
      });

    if (accessErr) {
      console.error("[provision] Failed to create student_access:", accessErr.message);
      return new Response(JSON.stringify({ error: "Failed to create access record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Update profiles.access_status to 'active' (service role bypasses RLS)
    const { error: profileErr } = await sb
      .from("profiles")
      .update({ access_status: "active" })
      .eq("user_id", auth_user_id);

    if (profileErr) {
      console.warn("[provision] Failed to update profiles.access_status:", profileErr.message);
      // Non-fatal — student_access is the source of truth
    }

    console.log("[provision] Successfully provisioned access for:", normalizedEmail, "student_id:", newStudent.id);
    return new Response(JSON.stringify({ provisioned: true, student_id: newStudent.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[provision] error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

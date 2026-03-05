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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated operator
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claims.claims.sub as string;

    // Use service role for all operations
    const sb = createClient(supabaseUrl, serviceKey);

    // Check caller is operator
    const { data: callerRole } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["operator", "vault_os_owner"])
      .maybeSingle();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Forbidden: operator role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { target_user_id } = await req.json();
    if (!target_user_id) {
      return new Response(JSON.stringify({ error: "target_user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[admin-delete-user] Deleting user:", target_user_id, "by:", callerId);

    // Get user email from profiles for allowed_signups cleanup
    const { data: profile } = await sb
      .from("profiles")
      .select("email")
      .eq("user_id", target_user_id)
      .maybeSingle();

    const email = profile?.email?.trim().toLowerCase();

    // Get student internal ID
    const { data: student } = await sb
      .from("students")
      .select("id")
      .eq("auth_user_id", target_user_id)
      .maybeSingle();

    // Delete in order (respecting FK constraints)

    // 1. student_access (FK → students.id)
    if (student) {
      await sb.from("student_access").delete().eq("user_id", student.id);
      console.log("[admin-delete-user] Deleted student_access for student:", student.id);
    }

    // 2. students
    await sb.from("students").delete().eq("auth_user_id", target_user_id);
    console.log("[admin-delete-user] Deleted students row");

    // 3. allowed_signups — reset claimed so email can be re-added
    if (email) {
      await sb.from("allowed_signups").delete().eq("email", email);
      console.log("[admin-delete-user] Deleted allowed_signups for:", email);
    }

    // 4. academy_user_roles
    await sb.from("academy_user_roles").delete().eq("user_id", target_user_id);
    console.log("[admin-delete-user] Deleted academy_user_roles");

    // 5. lesson_progress
    await sb.from("lesson_progress").delete().eq("user_id", target_user_id);
    console.log("[admin-delete-user] Deleted lesson_progress");

    // 6. playbook_progress
    await sb.from("playbook_progress").delete().eq("user_id", target_user_id);
    console.log("[admin-delete-user] Deleted playbook_progress");

    // 7. playbook_notes
    await sb.from("playbook_notes").delete().eq("user_id", target_user_id);

    // 8. user_playbook_state
    await sb.from("user_playbook_state").delete().eq("user_id", target_user_id);

    // 9. onboarding_state
    await sb.from("onboarding_state").delete().eq("user_id", target_user_id);

    // 10. journal_entries
    await sb.from("journal_entries").delete().eq("user_id", target_user_id);

    // 11. coach_requests
    await sb.from("coach_requests").delete().eq("user_id", target_user_id);

    // 12. user_preferences
    await sb.from("user_preferences").delete().eq("user_id", target_user_id);

    // 13. profiles (last — other tables may reference user_id)
    await sb.from("profiles").delete().eq("user_id", target_user_id);
    console.log("[admin-delete-user] Deleted profile");

    return new Response(JSON.stringify({ deleted: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[admin-delete-user] error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

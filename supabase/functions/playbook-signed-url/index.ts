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

  // Verify the caller is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );
  if (claimsError || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub;

  // Use service role to check entitlement and generate signed URL
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify user has active access before issuing signed URL
  const [accessRes, rolesRes] = await Promise.all([
    serviceClient
      .from("student_access")
      .select("status")
      .eq("user_id", userId)
      .eq("product_key", "vault_academy")
      .maybeSingle(),
    serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId),
  ]);

  const hasActiveAccess =
    accessRes.data && ["active", "trialing"].includes(accessRes.data.status);
  const privilegedRoles = new Set([
    "operator",
    "vault_os_owner",
    "vault_access",
    "vault_intelligence",
  ]);
  const hasPrivilegedRole = (rolesRes.data ?? []).some((r: any) =>
    privilegedRoles.has(r.role)
  );

  if (!hasActiveAccess && !hasPrivilegedRole) {
    console.log("Access denied for user", userId, {
      access: accessRes.data,
      roles: rolesRes.data,
    });
    return new Response(JSON.stringify({ error: "Access required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const bucket = "playbook";
  const objectPath = "vault-playbook.pdf";

  const { data, error } = await serviceClient.storage
    .from(bucket)
    .createSignedUrl(objectPath, 3600); // 1 hour

  if (error || !data?.signedUrl) {
    console.error("Storage signed URL error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate signed URL",
        details: error?.message || "Unknown error",
        bucket,
        objectPath,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({ signedUrl: data.signedUrl }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});

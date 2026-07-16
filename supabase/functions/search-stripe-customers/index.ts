import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Operator role check
    const { data: roleCheck } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "operator",
    });
    if (!roleCheck) throw new Error("Forbidden: operator role required");

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return new Response(JSON.stringify({ customers: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strict allowlist: alphanumerics, spaces, and @._- only. Reject anything else
    // (no quotes, colons, brackets, or Stripe search operators).
    const trimmed = query.trim().slice(0, 100);
    if (!/^[A-Za-z0-9 @._-]+$/.test(trimmed)) {
      return new Response(JSON.stringify({ customers: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // If input looks like an email, try exact email match first (Stripe's `~` substring
    // search can miss full email strings). Fall back to substring search on name+email.
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const lower = trimmed.toLowerCase();

    let data: Stripe.Customer[] = [];

    if (isEmail) {
      const exact = await stripe.customers.search({
        query: `email:"${lower}"`,
        limit: 10,
      });
      data = exact.data;
    }

    if (data.length === 0) {
      const fuzzy = await stripe.customers.search({
        query: `name~"${trimmed}" OR email~"${trimmed}"`,
        limit: 10,
      });
      data = fuzzy.data;
    }

    // Final fallback: list by email (works for exact matches even if search index lags)
    if (data.length === 0 && isEmail) {
      const listed = await stripe.customers.list({ email: lower, limit: 10 });
      data = listed.data;
    }

    const result = { data };

    const customers = result.data.map((c) => ({
      id: c.id,
      name: c.name || null,
      email: c.email || null,
    }));

    return new Response(JSON.stringify({ customers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

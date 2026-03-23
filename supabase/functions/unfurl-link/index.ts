import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractMeta(html: string) {
  const get = (property: string): string | null => {
    // Try og: first, then twitter:, then generic meta name
    for (const attr of [`property="${property}"`, `name="${property}"`, `property="twitter:${property.replace("og:", "")}"`, `name="twitter:${property.replace("og:", "")}"`]) {
      const re = new RegExp(`<meta[^>]+${attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]+content="([^"]*)"`, "i");
      const m = html.match(re);
      if (m?.[1]) return m[1];
      // Also handle content before property
      const re2 = new RegExp(`<meta[^>]+content="([^"]*)"[^>]+${attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
      const m2 = html.match(re2);
      if (m2?.[1]) return m2[1];
    }
    return null;
  };

  const title = get("og:title") || (() => {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m?.[1]?.trim() || null;
  })();

  const description = get("og:description") || get("description");
  const image = get("og:image");
  const siteName = get("og:site_name");

  // Favicon
  const faviconMatch = html.match(/<link[^>]+rel="(?:shortcut )?icon"[^>]+href="([^"]+)"/i);
  const favicon = faviconMatch?.[1] || null;

  return { title, description, image, siteName, favicon };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic URL validation
    let parsed: URL;
    try {
      parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check cache first
    const { data: cached } = await supabase
      .from("link_previews")
      .select("*")
      .eq("url", url)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the URL with a 5s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let html: string;
    try {
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VaultBot/1.0)",
          Accept: "text/html",
        },
      });
      html = await resp.text();
    } catch {
      return new Response(JSON.stringify({ error: "Failed to fetch URL" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      clearTimeout(timeout);
    }

    const meta = extractMeta(html);

    // Resolve relative image/favicon URLs
    const resolve = (u: string | null) => {
      if (!u) return null;
      try {
        return new URL(u, url).href;
      } catch {
        return u;
      }
    };

    const result = {
      url,
      title: meta.title || null,
      description: meta.description || null,
      image: resolve(meta.image),
      site_name: meta.siteName || parsed.hostname,
      favicon: resolve(meta.favicon) || `${parsed.origin}/favicon.ico`,
      fetched_at: new Date().toISOString(),
    };

    // Cache in DB (fire and forget)
    supabase
      .from("link_previews")
      .upsert(result, { onConflict: "url" })
      .then(() => {});

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

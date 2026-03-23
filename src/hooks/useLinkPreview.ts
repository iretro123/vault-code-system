import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  site_name: string | null;
  favicon: string | null;
}

// Client-side in-memory cache
const previewCache = new Map<string, LinkPreviewData | null>();

export function useLinkPreview(url: string | null) {
  const [data, setData] = useState<LinkPreviewData | null>(
    url ? previewCache.get(url) ?? null : null
  );
  const [loading, setLoading] = useState(!!url && !previewCache.has(url));

  useEffect(() => {
    if (!url) return;

    if (previewCache.has(url)) {
      setData(previewCache.get(url) ?? null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase.functions
      .invoke("unfurl-link", { body: { url } })
      .then(({ data: res, error }) => {
        if (cancelled) return;
        if (error || !res?.title) {
          previewCache.set(url, null);
          setData(null);
        } else {
          previewCache.set(url, res);
          setData(res);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading };
}

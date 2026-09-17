import { isLocalDesignPreview } from "@/integrations/supabase/localPreviewFetch";

// Local artwork overrides only. Published course records remain untouched.
const artwork = import.meta.glob<string>("../assets/course-covers/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

export function localCourseCover(module: { slug: string; title: string }) {
  if (!isLocalDesignPreview()) return undefined;
  const chapter = module.slug === "chapter-1-basic-bridge"
    ? 0
    : Number(module.title.match(/^Chapter\s+(\d+)\b/i)?.[1]);
  if (!Number.isInteger(chapter) || chapter < 0 || chapter > 10) return undefined;
  return artwork[`../assets/course-covers/${String(chapter).padStart(2, "0")}.png`];
}

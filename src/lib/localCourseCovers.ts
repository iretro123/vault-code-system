// Bundled course artwork is shared by web and native releases.
// Published course records and video URLs remain untouched.
const artwork = import.meta.glob<string>("../assets/course-covers/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

export function localCourseCover(module: { slug: string; title: string }) {
  const chapter = module.slug === "chapter-1-basic-bridge"
    ? 0
    : Number(module.title.match(/^Chapter\s+(\d+)\b/i)?.[1]);
  if (!Number.isInteger(chapter) || chapter < 0 || chapter > 10) return undefined;
  return artwork[`../assets/course-covers/${String(chapter).padStart(2, "0")}.png`];
}

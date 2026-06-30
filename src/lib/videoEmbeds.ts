const YOUTUBE_ID_RE =
  /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.*&v=|shorts\/))([a-zA-Z0-9_-]{11})/;

const PUBLIC_APP_ORIGIN = "https://member.vaulttradingacademy.com";

function isNativeWebViewOrigin(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "capacitor:" || window.location.protocol === "ionic:";
}

export function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(YOUTUBE_ID_RE);
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(url?: string | null): string | null {
  const id = getYouTubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function getVideoEmbedUrl(url: string): string | null {
  try {
    const youtubeId = getYouTubeId(url);
    if (youtubeId) {
      if (isNativeWebViewOrigin()) {
        const relayParams = new URLSearchParams({ video: youtubeId });
        return `${PUBLIC_APP_ORIGIN}/youtube-embed?${relayParams.toString()}`;
      }

      const params = new URLSearchParams({
        rel: "0",
        modestbranding: "1",
        playsinline: "1",
        origin: PUBLIC_APP_ORIGIN,
      });
      return `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`;
    }

    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;

    if (url.includes("/embed")) return url;
  } catch {}
  return null;
}

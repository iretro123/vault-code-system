const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

const PUBLIC_APP_ORIGIN = "https://member.vaulttradingacademy.com";

export function getVideoPageOrigin(): string {
  if (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)) {
    return window.location.origin;
  }
  return PUBLIC_APP_ORIGIN;
}

function isNativeWebViewOrigin(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "capacitor:" || window.location.protocol === "ionic:";
}

export function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const host = parsed.hostname.replace(/^(www\.|m\.)/, '');
    const parts = parsed.pathname.split('/').filter(Boolean);
    const id = host === 'youtu.be' ? parts[0]
      : ['youtube.com','youtube-nocookie.com'].includes(host)
        ? (parts[0] === 'watch' ? parsed.searchParams.get('v') : ['embed','v','shorts','live'].includes(parts[0]) ? parts[1] : null)
        : null;
    return id && VIDEO_ID.test(id) ? id : null;
  } catch { return null; }
}

export function getYouTubeThumbnail(url?: string | null): string | null {
  const id = getYouTubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function getVideoEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:') return null;
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
        origin: getVideoPageOrigin(),
      });
      return `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`;
    }

    const host = parsed.hostname.replace(/^www\./,'');
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const index = parts.findIndex(part => /^\d+$/.test(part));
      if (index >= 0) {
        const hash = parsed.searchParams.get('h') || parts[index + 1];
        return `https://player.vimeo.com/video/${parts[index]}${hash && /^[a-zA-Z0-9]+$/.test(hash) ? `?h=${hash}` : ''}`;
      }
    }

    const loomMatch = host === 'loom.com' ? parsed.pathname.match(/^\/(?:share|embed)\/([a-zA-Z0-9]+)/) : null;
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;

    if (parsed.pathname.includes("/embed")) return parsed.href;
  } catch {
    return null;
  }
  return null;
}

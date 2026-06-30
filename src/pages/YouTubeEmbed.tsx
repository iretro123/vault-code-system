import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

const YouTubeEmbed = () => {
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get("video") || "";
  const isValidVideo = YOUTUBE_ID_RE.test(videoId);

  const embedUrl = useMemo(() => {
    if (!isValidVideo) return null;
    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      origin: "https://member.vaulttradingacademy.com",
    });
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  }, [isValidVideo, videoId]);

  if (!embedUrl) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6 text-center">
        <p className="text-sm text-white/70">Video unavailable.</p>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-black">
      <iframe
        src={embedUrl}
        title="Vault OS lesson video"
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </main>
  );
};

export default YouTubeEmbed;

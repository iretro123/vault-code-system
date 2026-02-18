import React, { useState } from "react";

/** Geometric icon SVGs — must match AcademyProfileForm */
const GEOMETRIC_ICONS: Record<string, React.ReactNode> = {
  diamond: <svg viewBox="0 0 40 40" className="h-full w-full"><rect x="8" y="8" width="24" height="24" rx="4" transform="rotate(45 20 20)" fill="currentColor" opacity="0.9" /><rect x="14" y="14" width="12" height="12" rx="2" transform="rotate(45 20 20)" fill="currentColor" opacity="0.4" /></svg>,
  circles: <svg viewBox="0 0 40 40" className="h-full w-full"><circle cx="20" cy="16" r="8" fill="currentColor" opacity="0.8" /><circle cx="14" cy="26" r="5" fill="currentColor" opacity="0.5" /><circle cx="26" cy="26" r="5" fill="currentColor" opacity="0.5" /></svg>,
  hexagon: <svg viewBox="0 0 40 40" className="h-full w-full"><polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill="currentColor" opacity="0.8" /><polygon points="20,12 27,16 27,24 20,28 13,24 13,16" fill="currentColor" opacity="0.3" /></svg>,
  triangle: <svg viewBox="0 0 40 40" className="h-full w-full"><polygon points="20,6 36,34 4,34" fill="currentColor" opacity="0.8" /><polygon points="20,16 28,30 12,30" fill="currentColor" opacity="0.3" /></svg>,
  bars: <svg viewBox="0 0 40 40" className="h-full w-full"><rect x="6" y="8" width="8" height="24" rx="3" fill="currentColor" opacity="0.9" /><rect x="16" y="14" width="8" height="18" rx="3" fill="currentColor" opacity="0.6" /><rect x="26" y="10" width="8" height="22" rx="3" fill="currentColor" opacity="0.75" /></svg>,
  cross: <svg viewBox="0 0 40 40" className="h-full w-full"><rect x="15" y="6" width="10" height="28" rx="3" fill="currentColor" opacity="0.8" /><rect x="6" y="15" width="28" height="10" rx="3" fill="currentColor" opacity="0.8" /></svg>,
};

const DEFAULT_COLOR = "hsl(220, 15%, 45%)";

// Simple in-memory cache for loaded image URLs
const loadedImages = new Set<string>();

export interface ParsedAvatar {
  mode: "initials" | "icon" | "image";
  color: string;
  iconId?: string;
  imageUrl?: string;
}

export function parseAvatarUrl(avatarUrl: string | null | undefined): ParsedAvatar {
  if (!avatarUrl) return { mode: "initials", color: DEFAULT_COLOR };

  if (avatarUrl.startsWith("http")) {
    return { mode: "image", imageUrl: avatarUrl, color: DEFAULT_COLOR };
  }

  if (avatarUrl.startsWith("icon:")) {
    const parts = avatarUrl.replace("icon:", "").split("|");
    return {
      mode: "icon",
      iconId: parts[0] || "diamond",
      color: parts[1] || DEFAULT_COLOR,
    };
  }

  if (avatarUrl.startsWith("initials:")) {
    return {
      mode: "initials",
      color: avatarUrl.replace("initials:", "") || DEFAULT_COLOR,
    };
  }

  return { mode: "initials", color: DEFAULT_COLOR };
}

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export function ChatAvatar({
  avatarUrl,
  userName,
  size = "h-8 w-8",
}: {
  avatarUrl?: string | null;
  userName: string;
  size?: string;
}) {
  const parsed = parseAvatarUrl(avatarUrl);
  const [imgLoaded, setImgLoaded] = useState(() =>
    parsed.mode === "image" && parsed.imageUrl ? loadedImages.has(parsed.imageUrl) : false
  );

  if (parsed.mode === "image" && parsed.imageUrl) {
    const url = parsed.imageUrl;
    return (
      <div className={`${size} rounded-full shrink-0 relative overflow-hidden`}>
        {/* Initials fallback — always rendered, hidden when image loads */}
        {!imgLoaded && (
          <div
            className={`absolute inset-0 rounded-full flex items-center justify-center text-xs font-semibold`}
            style={{ backgroundColor: DEFAULT_COLOR + "33", color: DEFAULT_COLOR }}
          >
            {getInitials(userName)}
          </div>
        )}
        <img
          src={url}
          alt={userName}
          loading="eager"
          className={`absolute inset-0 h-full w-full rounded-full object-cover ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => { loadedImages.add(url); setImgLoaded(true); }}
        />
      </div>
    );
  }

  if (parsed.mode === "icon" && parsed.iconId && GEOMETRIC_ICONS[parsed.iconId]) {
    return (
      <div
        className={`${size} rounded-full flex items-center justify-center p-1.5 shrink-0`}
        style={{ backgroundColor: parsed.color + "33", color: parsed.color }}
      >
        {GEOMETRIC_ICONS[parsed.iconId]}
      </div>
    );
  }

  // Initials mode
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center text-xs font-semibold shrink-0`}
      style={{ backgroundColor: parsed.color + "33", color: parsed.color }}
    >
      {getInitials(userName)}
    </div>
  );
}

import React, { useState } from "react";
import { AVATAR_ICONS_MAP } from "@/lib/avatarIcons";

const DEFAULT_COLOR = "hsl(220, 15%, 45%)";

function withAlpha(hsl: string, alpha: number): string {
  return hsl.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
}

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

  if (parsed.mode === "icon" && parsed.iconId && AVATAR_ICONS_MAP[parsed.iconId]) {
    return (
      <div
        className={`${size} rounded-full flex items-center justify-center p-1.5 shrink-0`}
        style={{ backgroundColor: parsed.color + "33", color: parsed.color }}
      >
        {AVATAR_ICONS_MAP[parsed.iconId]}
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

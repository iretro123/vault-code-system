import React, { useState } from "react";
import { AVATAR_ICONS_MAP } from "@/lib/avatarIcons";

const DEFAULT_COLOR = "hsl(220, 15%, 45%)";

function withAlpha(hsl: string, alpha: number): string {
  return hsl.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
}

// Simple in-memory cache for loaded image URLs
const loadedImages = new Set<string>();

export interface ParsedAvatar {
  mode: "initials" | "icon" | "image" | "vault";
  color: string;
  iconId?: string;
  imageUrl?: string;
}

const VAULT_BRAND_COLOR = "hsl(217, 91%, 60%)";

export function parseAvatarUrl(avatarUrl: string | null | undefined): ParsedAvatar {
  // Branded Vault default when no avatar is set
  if (!avatarUrl) return { mode: "vault", color: VAULT_BRAND_COLOR };

  if (avatarUrl.startsWith("http")) {
    return { mode: "image", imageUrl: avatarUrl, color: DEFAULT_COLOR };
  }

  if (avatarUrl === "vault" || avatarUrl.startsWith("vault:")) {
    const color = avatarUrl.includes(":") ? avatarUrl.split(":")[1] || VAULT_BRAND_COLOR : VAULT_BRAND_COLOR;
    return { mode: "vault", color };
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
            style={{ backgroundColor: withAlpha(DEFAULT_COLOR, 0.2), color: DEFAULT_COLOR }}
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
style={{ backgroundColor: withAlpha(parsed.color, 0.2), color: parsed.color }}
      >
        {AVATAR_ICONS_MAP[parsed.iconId]}
      </div>
    );
  }

  if (parsed.mode === "vault") {
    return (
      <div
        className={`${size} rounded-full flex items-center justify-center shrink-0 font-black tracking-tight`}
        style={{
          background: `linear-gradient(135deg, ${withAlpha(parsed.color, 0.28)}, ${withAlpha(parsed.color, 0.12)})`,
          color: parsed.color,
          border: `1px solid ${withAlpha(parsed.color, 0.35)}`,
        }}
        aria-label="Vault member"
      >
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5 L12 20 L20 5" />
        </svg>
      </div>
    );
  }

  // Initials mode
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center text-xs font-semibold shrink-0`}
style={{ backgroundColor: withAlpha(parsed.color, 0.2), color: parsed.color }}
    >
      {getInitials(userName)}
    </div>
  );
}

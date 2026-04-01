/**
 * Generate a deterministic unique gradient from a user ID.
 * Every user gets a visually distinct banner.
 */
export function generateBannerGradient(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  const hue1 = ((hash >>> 0) % 360);
  const hue2 = (hue1 + 40 + ((hash >>> 8) % 40)) % 360;
  const angle = 120 + ((hash >>> 16) % 60);
  return `linear-gradient(${angle}deg, hsl(${hue1}, 60%, 22%), hsl(${hue2}, 50%, 15%))`;
}

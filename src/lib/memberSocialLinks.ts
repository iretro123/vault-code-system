export function socialProfileUrl(value: string | null | undefined, platform: 'instagram' | 'youtube') {
  if (!value?.trim()) return null;
  const raw = value.trim();
  if (/^https?:/i.test(raw)) {
    try {
      const url = new URL(raw);
      const allowed = platform === 'instagram' ? ['instagram.com', 'www.instagram.com'] : ['youtube.com', 'www.youtube.com', 'm.youtube.com'];
      return url.protocol === 'https:' && !url.username && !url.password && allowed.includes(url.hostname) ? url.href : null;
    } catch { return null; }
  }
  const handle = raw.replace(/^@/, '');
  return /^[\w.-]+$/.test(handle) ? `https://${platform}.com/${platform === 'youtube' ? '@' : ''}${encodeURIComponent(handle)}` : null;
}

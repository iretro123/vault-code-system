/** Provider response bodies are evidence, never a reason to retire tokens on HTTP status alone. */
export function fcmTokenIsUnregistered(raw: string): boolean {
  try {
    const details = JSON.parse(raw)?.error?.details;
    return Array.isArray(details) && details.some(detail => detail?.['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError' && detail.errorCode === 'UNREGISTERED');
  } catch { return false; }
}
export function apnsFailureReason(raw: string): string {
  try { const reason = JSON.parse(raw)?.reason; return typeof reason === 'string' && /^[A-Za-z]{1,64}$/.test(reason) ? reason : ''; }
  catch { return ''; }
}
/** Apple's 410 body carries the ms timestamp when the token became inactive. */
export function apnsInactiveSince(raw: string): number | null {
  try { const t = Number(JSON.parse(raw)?.timestamp); return Number.isFinite(t) && t > 0 ? t : null; }
  catch { return null; }
}
const TOKEN_REJECTIONS = new Set(['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic']);
/**
 * Retire an iOS token only when both Apple environments reject it, and never when
 * Apple's "inactive since" time predates the device's latest registration
 * (Apple: a token re-registered after that time is still valid).
 */
export function apnsShouldRetire(p: { primary: string; alternate: string | null; inactiveSince: number | null; registeredAt: number | null }): boolean {
  if (!TOKEN_REJECTIONS.has(p.primary)) return false;
  if (p.alternate === null || !TOKEN_REJECTIONS.has(p.alternate)) return false;
  if (p.inactiveSince !== null && p.registeredAt !== null && p.registeredAt > p.inactiveSince) return false;
  return true;
}

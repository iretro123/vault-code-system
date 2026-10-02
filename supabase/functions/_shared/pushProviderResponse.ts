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

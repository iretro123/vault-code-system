export const INDICATOR = 'Vault Zone Pulse - SPY Live';
export const CHART_URL = 'https://www.tradingview.com/chart/Db5ipsDu/';
export const MAX_CAPTURE_AGE = 90_000;

export function captureWindowOpen(at = Date.now()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(at).map(p => [p.type, p.value]));
  return !['Sat', 'Sun'].includes(parts.weekday) && Number(parts.hour) >= 9 && Number(parts.hour) < 16;
}

export function verifyCaptureSource(source, post, now = Date.now()) {
  if (post.symbol !== 'AMEX:SPY' || ![5,15].includes(post.timeframe)) throw new Error('wrong-instrument');
  if (!Number.isFinite(post.at) || post.at > now || now - post.at > MAX_CAPTURE_AGE) throw new Error('capture-window-expired');
  if (!new RegExp(`^Chart for (?:AMEX|BATS):SPY, ${post.timeframe} minutes$`).test(source.label)) throw new Error('wrong-chart-timeframe');
  if (!source.text.includes(INDICATOR)) throw new Error('pulse-indicator-missing');
  if (/disconnected|connection lost|reconnect|cannot connect|can't open this chart|sign in to continue|verify you are human/i.test(source.pageText)) throw new Error('chart-needs-attention');
  const quote = Number(source.text.match(/([\d,]+(?:\.\d+)?)\s*SELL/)?.[1]?.replaceAll(',',''));
  if (!quote || !Number.isFinite(post.price) || Math.abs(quote-post.price)>Math.max(1,post.price*0.002)) throw new Error('chart-price-mismatch');
  return true;
}

export async function verifyImageSignature(id, expiry, signature, secret, now = Date.now()) {
  if (!/^[a-f0-9-]{36}$/.test(id) || !/^\d{10}$/.test(expiry||'') || !/^[a-f0-9]{64}$/.test(signature||'') || !/^[a-f0-9]{64}$/.test(secret||'')) return false;
  const expires = Number(expiry);
  if (expires <= Math.floor(now/1000) || expires > Math.floor(now/1000)+3660) return false;
  const bytes = hex => Uint8Array.from(hex.match(/../g), v=>parseInt(v,16));
  const key = await crypto.subtle.importKey('raw',bytes(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('HMAC',key,bytes(signature),new TextEncoder().encode(`${id}:${expiry}`));
}

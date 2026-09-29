import { CHART_URL, INDICATOR } from './capture-policy.js';
import { openChartSession, rememberChartLogin } from './capture-session.js';

// Explicit operator preflight: never claims an event, changes capture_enabled,
// creates member notifications, or substitutes a current image for an old alert.
export async function checkChartConnection(env) {
  let browser;
  try {
    if (!env.BROWSER || !env.CHART_IMAGES) return { ok:false, failure:'hosted-browser-not-configured' };
    browser = await openChartSession(env);
    const page = (await browser.pages()).find(p => p.url().startsWith(CHART_URL));
    if (!page) return { ok:false, failure:'hosted-chart-login-required' };
    const source = await page.evaluate(() => ({
      label:document.querySelector('.chart-widget canvas[aria-label]')?.getAttribute('aria-label') || '',
      text:document.querySelector('.chart-widget')?.innerText || '',
      pageText:document.body.innerText,
    }));
    const match = source.label.match(/^Chart for (AMEX|BATS):SPY, (5|15) minutes$/);
    if (!match || !source.text.includes(INDICATOR)
      || /disconnected|connection lost|reconnect|cannot connect|can't open this chart|sign in to continue|verify you are human/i.test(source.pageText)) {
      return { ok:false, failure:'hosted-chart-login-required' };
    }
    await rememberChartLogin(env,page);
    return { ok:true, symbol:'AMEX:SPY', timeframe:Number(match[2]), indicator:INDICATOR };
  } catch {
    // No provider error text, cookies, URLs or page contents cross this boundary.
    return { ok:false, failure:'hosted-chart-login-required' };
  } finally {
    if (browser) { try { await browser.disconnect(); } catch { /* read-only preflight complete */ } }
  }
}

export async function captureAuthorized(request, secret) {
  if (!secret) return false;
  const encoder = new TextEncoder();
  const actual = encoder.encode(request.headers.get('Authorization') || '');
  const expected = encoder.encode(`Bearer ${secret}`);
  return actual.byteLength === expected.byteLength && crypto.subtle.timingSafeEqual(actual, expected);
}

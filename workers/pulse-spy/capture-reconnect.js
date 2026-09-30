// A normal TradingView Connect action is authorized by the owner. Never retry
// indefinitely or interact with login, CAPTCHA, payment or security challenges.
export async function reconnectChart(env,page) {
  const disconnected=await page.evaluate(()=>/session disconnected/i.test(document.body.innerText));
  if (!disconnected) return;
  const key='private:last-reconnect-at';
  const last=Number(await env.CHART_IMAGES.get(key)||0);
  if (last && Date.now()-last<10*60_000) throw new Error('chart-session-conflict');
  const buttons=await page.$$('button');
  for (const button of buttons) {
    if (!(await button.boundingBox())) continue;
    if ((await button.evaluate(el=>el.textContent?.trim()))!=='Connect') continue;
    // Record before clicking, so a failed attempt cannot produce a retry storm.
    await env.CHART_IMAGES.put(key,String(Date.now()),{expirationTtl:600});
    try {
      await button.click();
      await page.waitForFunction(()=>!/session disconnected/i.test(document.body.innerText),{timeout:6000});
    } catch {
      // A competing account session must not be mistaken for an expired browser.
      throw new Error('chart-session-conflict');
    }
    return;
  }
  throw new Error('chart-session-conflict');
}

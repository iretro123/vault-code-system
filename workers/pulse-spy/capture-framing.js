// Rebuild framing from a reset, or reuse a recent unchanged frame without adding zoom.
// Keep TradingView's own price scale, candles, zone labels and attribution intact.
export async function frameChart(page,{reuse=false}={}) {
  // A dedicated chart already follows the live edge. Repeating the entire zoom
  // sequence on bursts of updates adds seconds. Reuse for at most one minute,
  // invalidated by timeframe/viewport changes or any chart interaction.
  if (reuse && await page.evaluate(()=>{
    const chart=document.querySelector('.chart-widget');
    const key=JSON.stringify([chart?.querySelector('canvas[aria-label]')?.getAttribute('aria-label'),innerWidth,innerHeight,devicePixelRatio]);
    return chart?.dataset.vaultFrameKey===key && Date.now()-Number(chart.dataset.vaultFrameAt)<60_000;
  })) return;
  const chart=await page.$('.chart-widget');
  if (!chart) throw new Error('chart-crop-unavailable');
  await page.keyboard.press('Escape');
  await chart.click({offset:{x:400,y:300}});
  await page.keyboard.down('Alt');
  try { await page.keyboard.press('r'); } finally { await page.keyboard.up('Alt'); }
  await page.keyboard.down('Control');
  try { for(let step=0;step<6;step++) await page.keyboard.press('ArrowUp'); }
  finally { await page.keyboard.up('Control'); }
  await page.mouse.move(0,0);
  // Wait for two paint frames rather than an arbitrary screenshot delay.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  if (reuse) await page.evaluate(()=>{
    const chart=document.querySelector('.chart-widget');
    if (!chart) return;
    chart.dataset.vaultFrameKey=JSON.stringify([chart.querySelector('canvas[aria-label]')?.getAttribute('aria-label'),innerWidth,innerHeight,devicePixelRatio]);
    chart.dataset.vaultFrameAt=String(Date.now());
    if (!chart.dataset.vaultFrameListener) {
      chart.dataset.vaultFrameListener='true';
      const invalidate=()=>{delete chart.dataset.vaultFrameKey;};
      chart.addEventListener('pointerdown',invalidate,{passive:true});
      chart.addEventListener('wheel',invalidate,{passive:true});
      chart.addEventListener('keydown',invalidate);
    }
  });
}

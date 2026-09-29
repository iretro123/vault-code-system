// Rebuild the same view on every capture: no accumulated zoom across events.
// Keep TradingView's own price scale, candles, zone labels and attribution intact.
export async function frameChart(page) {
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
}

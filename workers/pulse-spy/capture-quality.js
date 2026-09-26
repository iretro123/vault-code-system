export const CHART_VIEWPORT = Object.freeze({ width:1280, height:800, deviceScaleFactor:2 });

export async function waitForChartPixels(page) {
  try {
    await page.waitForFunction(async function chartAtCaptureDensity(scale) {
      if (document.fonts?.status === 'loading') return false;
      // Resizing the browser does not guarantee the chart has repainted yet.
      // Wait for the canvas backing stores as well as two browser paint frames.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const chart=document.querySelector('.chart-widget');
      const main=chart?.querySelector('canvas[aria-label]');
      if (!main || window.devicePixelRatio < scale) return false;
      const mainBounds=main.getBoundingClientRect();
      if (mainBounds.width < 600 || mainBounds.height < 300) return false;
      const canvases=Array.from(chart.querySelectorAll('canvas')).filter(canvas => {
        const rect=canvas.getBoundingClientRect();
        return rect.width > 32 && rect.height > 32 && getComputedStyle(canvas).visibility !== 'hidden';
      });
      return canvases.length > 0 && canvases.every(canvas => {
        const rect=canvas.getBoundingClientRect();
        return canvas.width >= rect.width * scale - 2 && canvas.height >= rect.height * scale - 2;
      });
    }, {timeout:6000}, CHART_VIEWPORT.deviceScaleFactor);
  } catch {
    throw new Error('chart-resolution-unavailable');
  }
}

export function verifyChartPng(bytes, bounds) {
  const signature=[137,80,78,71,13,10,26,10];
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 10_000 || bytes.byteLength > 8_000_000
    || signature.some((value,index) => bytes[index] !== value)) throw new Error('chart-image-invalid');
  const header=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if (header.getUint32(8) !== 13 || header.getUint32(12) !== 0x49484452) throw new Error('chart-image-invalid');
  const width=header.getUint32(16),height=header.getUint32(20);
  const scale=CHART_VIEWPORT.deviceScaleFactor;
  // A large file is not proof of resolution. Reject 1x exports and an unexpected
  // full-page capture instead of stretching them into a member's chart card.
  if (!Number.isFinite(bounds?.width) || !Number.isFinite(bounds?.height)
    || width < 1800 || height < 800
    || Math.abs(width-bounds.width*scale) > 4 || Math.abs(height-bounds.height*scale) > 4) {
    throw new Error('chart-resolution-unavailable');
  }
  return {width,height,scale};
}

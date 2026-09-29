/** A display crop of one exact original. The original image is never rewritten. */
export interface PulseChartFocus {
  imageId: string;
  capturedAt: number;
  sourceWidth: number;
  sourceHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function validPulseChartFocus(focus: PulseChartFocus | undefined, capturedAt: number, width: number, height: number, imageUrl?: string): focus is PulseChartFocus {
  if (!focus || focus.capturedAt !== capturedAt || focus.sourceWidth !== width || focus.sourceHeight !== height) return false;
  if (!/^[a-f0-9-]{36}$/.test(focus.imageId) || !imageUrl?.split("?")[0].endsWith(`/image/${focus.imageId}`)) return false;
  return [focus.x, focus.y, focus.width, focus.height].every(Number.isFinite)
    && focus.x >= 0 && focus.y >= 0 && focus.width >= 200 && focus.height >= 120
    && focus.x + focus.width <= width && focus.y + focus.height <= height
    && focus.width / focus.height >= 1.3 && focus.width / focus.height <= 2;
}

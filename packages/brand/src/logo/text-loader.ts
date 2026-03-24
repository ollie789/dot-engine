/**
 * Text loader (browser-only, synchronous).
 * Renders text to canvas via fillText, extracts alpha mask.
 */

export interface MaskResult {
  mask: Uint8Array;
  width: number;
  height: number;
}

export function loadTextToMask(
  text: string,
  resolution: number,
  font?: string,
  weight?: number,
): MaskResult {
  const fontFamily = font ?? 'sans-serif';
  const fontWeight = weight ?? 400;

  // Measure text width first to set canvas aspect ratio correctly
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d')!;
  const fontSize = Math.round(resolution * 0.55);
  measureCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = measureCtx.measureText(text);
  const textWidth = metrics.width;

  // Canvas sized to fit the text with padding
  const padding = fontSize * 0.3;
  const canvasWidth = Math.ceil(textWidth + padding * 2);
  const canvasHeight = Math.ceil(fontSize * 1.4 + padding * 2);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D canvas context');
  }

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);

  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const mask = new Uint8Array(canvasWidth * canvasHeight);
  for (let i = 0; i < mask.length; i++) {
    // mask=1 where text IS present (alpha > 128 = inside the text shape)
    mask[i] = imageData.data[i * 4 + 3] > 128 ? 1 : 0;
  }
  return { mask, width: canvasWidth, height: canvasHeight };
}

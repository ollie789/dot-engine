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
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D canvas context');
  }

  const fontFamily = font ?? 'sans-serif';
  const fontWeight = weight ?? 400;
  const fontSize = Math.round(resolution * 0.6);
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, resolution / 2, resolution / 2);

  const imageData = ctx.getImageData(0, 0, resolution, resolution);
  const mask = new Uint8Array(resolution * resolution);
  for (let i = 0; i < mask.length; i++) {
    // Alpha channel at index i*4+3; mask=1 means outside (no text)
    mask[i] = imageData.data[i * 4 + 3] < 128 ? 1 : 0;
  }
  return { mask, width: resolution, height: resolution };
}

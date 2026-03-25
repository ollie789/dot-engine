/**
 * Raster image loader (browser-only).
 * Loads image via Image + Canvas, extracts alpha mask as Uint8Array.
 */

import type { MaskResult } from './mask-types.js';
export type { MaskResult } from './mask-types.js';

export function loadImageToMask(source: string, resolution: number): Promise<MaskResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      const width = resolution;
      const height = Math.round(resolution / aspectRatio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const mask = new Uint8Array(width * height);
      for (let i = 0; i < mask.length; i++) {
        // mask=1 where content IS present (alpha > 128 = inside shape)
        mask[i] = imageData.data[i * 4 + 3] > 128 ? 1 : 0;
      }
      resolve({ mask, width, height });
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${source}`));
    img.src = source;
  });
}

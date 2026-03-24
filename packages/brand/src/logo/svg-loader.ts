/**
 * SVG loader (browser-only).
 * Loads SVG via Image + Canvas, extracts alpha mask as Uint8Array.
 */

export interface MaskResult {
  mask: Uint8Array;
  width: number;
  height: number;
}

export function loadSvgToMask(source: string, resolution: number): Promise<MaskResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
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
        // Alpha channel is at index i*4+3; threshold at 128
        mask[i] = imageData.data[i * 4 + 3] < 128 ? 1 : 0;
      }
      resolve({ mask, width, height });
    };
    img.onerror = () => reject(new Error(`Failed to load SVG: ${source}`));

    // Encode SVG as data URL if it's raw SVG markup
    if (source.trimStart().startsWith('<')) {
      const blob = new Blob([source], { type: 'image/svg+xml' });
      img.src = URL.createObjectURL(blob);
    } else {
      img.src = source;
    }
  });
}

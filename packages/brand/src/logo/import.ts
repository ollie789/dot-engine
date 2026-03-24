import { textureSdf } from '@bigpuddle/dot-engine-core';
import { computeSignedDistance } from './edt.js';
import { loadSvgToMask } from './svg-loader.js';
import { loadImageToMask } from './image-loader.js';
import { loadTextToMask } from './text-loader.js';
import type { LogoInput, ProcessedLogo, ImportOptions } from './types.js';

let _logoCounter = 0;

export async function importLogo(input: LogoInput, options?: ImportOptions): Promise<ProcessedLogo> {
  const resolution = options?.resolution ?? 512;
  const depth = options?.depth ?? 0.3;
  let mask: Uint8Array, width: number, height: number;

  switch (input.type) {
    case 'svg': { const r = await loadSvgToMask(input.source, resolution); mask = r.mask; width = r.width; height = r.height; break; }
    case 'image': { const r = await loadImageToMask(input.source, resolution); mask = r.mask; width = r.width; height = r.height; break; }
    case 'text': { const r = loadTextToMask(input.text, resolution, input.font, input.weight); mask = r.mask; width = r.width; height = r.height; break; }
  }

  const sdfTexture = computeSignedDistance(mask, width, height);
  const aspectRatio = width / height;
  const textureId = `logo_${++_logoCounter}`;
  const sdfNode = textureSdf(textureId, { depth, aspectRatio });

  return { sdfTexture, width, height, aspectRatio, textureId, sdfNode };
}

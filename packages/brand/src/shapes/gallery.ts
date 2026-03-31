import type { GalleryShape } from './types.js';
import { waveField, dotMatrix, hexGrid } from './patterns.js';
import { sphereShape, torusShape, boxShape, capsuleShape, planeShape } from './primitives.js';

export const SHAPE_GALLERY: GalleryShape[] = [
  waveField,
  dotMatrix,
  hexGrid,
  sphereShape,
  torusShape,
  boxShape,
  capsuleShape,
  planeShape,
];

export function getShape(name: string): GalleryShape | undefined {
  return SHAPE_GALLERY.find(s => s.name === name);
}

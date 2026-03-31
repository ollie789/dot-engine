import {
  sphere, capsule, cylinder, repeat, elongate,
} from '@bigpuddle/dot-engine-core';
import type { GalleryShape, ShapeBuildParams } from './types.js';

export const waveField: GalleryShape = {
  name: 'wave-field',
  label: 'Wave Field',
  category: 'pattern',
  description: 'Repeating ridges for wide banners',
  icon: '∿',
  build(params: ShapeBuildParams) {
    const spacing = 0.3 + (1 - params.density) * 0.4;
    const thickness = 0.05 + params.energy * 0.05;
    const ridge = elongate(capsule(thickness, 0.01), [2, 0, 0]);
    return repeat(ridge, [spacing, spacing, spacing]);
  },
};

export const dotMatrix: GalleryShape = {
  name: 'dot-matrix',
  label: 'Dot Matrix',
  category: 'pattern',
  description: 'Regular grid of spheres',
  icon: '●',
  build(params: ShapeBuildParams) {
    const spacing = 0.25 + (1 - params.density) * 0.35;
    const radius = 0.04 + params.energy * 0.06;
    return repeat(sphere(radius), [spacing, spacing, spacing]);
  },
};

export const hexGrid: GalleryShape = {
  name: 'hex-grid',
  label: 'Hex Grid',
  category: 'pattern',
  description: 'Honeycomb cylinder pattern',
  icon: '⬡',
  build(params: ShapeBuildParams) {
    const spacing = 0.3 + (1 - params.density) * 0.3;
    const radius = 0.06 + params.energy * 0.04;
    const height = 0.3 + params.energy * 0.2;
    return repeat(cylinder(radius, height), [spacing, spacing * 0.866, spacing]);
  },
};

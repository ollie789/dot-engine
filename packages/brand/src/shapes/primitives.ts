import {
  sphere as coreSphere,
  torus as coreTorus,
  box as coreBox,
  capsule as coreCapsule,
  plane as corePlane,
} from '@bigpuddle/dot-engine-core';
import type { GalleryShape, ShapeBuildParams } from './types.js';

export const sphereShape: GalleryShape = {
  name: 'sphere',
  label: 'Sphere',
  category: 'shape',
  description: 'Simple sphere',
  icon: '○',
  build(params: ShapeBuildParams) {
    const radius = 0.4 + params.energy * 0.3;
    return coreSphere(radius);
  },
};

export const torusShape: GalleryShape = {
  name: 'torus',
  label: 'Torus',
  category: 'shape',
  description: 'Ring shape',
  icon: '◎',
  build(params: ShapeBuildParams) {
    const majorR = 0.4 + params.energy * 0.2;
    const minorR = 0.08 + params.organic * 0.12;
    return coreTorus(majorR, minorR);
  },
};

export const boxShape: GalleryShape = {
  name: 'box',
  label: 'Box',
  category: 'shape',
  description: 'Rounded box',
  icon: '□',
  build(params: ShapeBuildParams) {
    const s = 0.3 + params.energy * 0.2;
    const edgeRadius = params.organic * 0.1;
    return coreBox([s, s, s], edgeRadius);
  },
};

export const capsuleShape: GalleryShape = {
  name: 'capsule',
  label: 'Capsule',
  category: 'shape',
  description: 'Rounded cylinder',
  icon: '⬭',
  build(params: ShapeBuildParams) {
    const radius = 0.15 + params.organic * 0.1;
    const height = 0.4 + params.energy * 0.4;
    return coreCapsule(radius, height);
  },
};

export const planeShape: GalleryShape = {
  name: 'plane',
  label: 'Plane',
  category: 'shape',
  description: 'Flat surface',
  icon: '▬',
  build() {
    return corePlane([0, 1, 0], 0);
  },
};

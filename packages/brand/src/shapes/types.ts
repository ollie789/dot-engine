import type { SdfNode } from '@bigpuddle/dot-engine-core';

export interface ShapeBuildParams {
  energy: number;
  organic: number;
  density: number;
  aspectRatio?: number;
}

export interface GalleryShape {
  name: string;
  label: string;
  category: 'pattern' | 'shape';
  description: string;
  icon: string;
  build(params: ShapeBuildParams): SdfNode;
}

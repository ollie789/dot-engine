import { field } from './nodes/field.js';
import { shape } from './nodes/shape.js';
import { grid } from './nodes/grid.js';
import { animate } from './nodes/animate.js';
import { color } from './nodes/color.js';
import { displace, simplex3D, flowField3D } from './nodes/displace.js';
import { sphere, box, torus } from './sdf/primitives.js';
import { smoothUnion } from './sdf/boolean.js';
import { translate } from './sdf/transforms.js';
import type { FieldRoot, FieldChildNode, SdfNode, NoiseConfig, ColorMode } from './nodes/types.js';

export interface PresetConfig {
  shape: SdfNode;
  grid?: { type: 'uniform'; resolution: [number, number, number] };
  color?: { primary: string; accent: string; mode?: ColorMode };
  displace?: Array<{ noise: NoiseConfig; amount?: number }>;
  animate?: { speed: number };
}

export function definePreset(config: PresetConfig): FieldRoot {
  const children: FieldChildNode[] = [
    shape(config.shape),
    grid(config.grid ?? { type: 'uniform', resolution: [30, 30, 30] }),
  ];
  if (config.color) children.push(color(config.color));
  if (config.displace) {
    for (const d of config.displace) {
      children.push(displace(d.noise, { amount: d.amount }));
    }
  }
  if (config.animate) children.push(animate(config.animate));
  return field(...children);
}

export const presets = {
  crystal: definePreset({
    shape: smoothUnion(box([0.4, 0.4, 0.4], 0.05), sphere(0.35), 0.15),
    color: { primary: '#88ccff', accent: '#ffffff', mode: 'depth' },
    animate: { speed: 0.1 },
  }),

  organic: definePreset({
    shape: smoothUnion(sphere(0.6), translate(torus(0.4, 0.15), [0, 0.2, 0]), 0.3),
    color: { primary: '#2D7A4A', accent: '#E07A5F', mode: 'depth' },
    displace: [
      { noise: simplex3D({ scale: 3, speed: 0.2 }), amount: 0.1 },
      { noise: flowField3D({ scale: 2, speed: 0.3 }), amount: 0.06 },
    ],
    animate: { speed: 0.4 },
  }),

  minimal: definePreset({
    shape: sphere(0.7),
    color: { primary: '#e0e0e0', accent: '#808080', mode: 'depth' },
    animate: { speed: 0.05 },
  }),
} as const;

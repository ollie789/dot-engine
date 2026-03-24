import { field, shape, grid, animate, color, displace, attract } from '@bigpuddle/dot-engine-core';
import type { FieldChildNode, FieldRoot } from '@bigpuddle/dot-engine-core';
import type { Brand, DataPoint, ContextOptions } from './types.js';
import type { MappedParams } from './personality.js';

export function buildDataField(
  brand: Brand,
  params: MappedParams,
  dataPoints: DataPoint[],
  options?: ContextOptions,
): FieldRoot {
  const res = params.gridResolution;
  const speed = brand.config.motion.speed * params.animateSpeed * 0.5;
  const children: FieldChildNode[] = [
    shape(brand.logo.sdfNode),
    grid({ type: 'uniform', resolution: [res, res, res] }),
    color({ primary: brand.config.colors.primary, accent: brand.config.colors.accent, mode: 'depth' }),
    animate({ speed }),
  ];

  // Add attract displacements for each data point (max 16)
  const points = dataPoints.slice(0, 16);
  for (const dp of points) {
    // Scale position from [0,1] to world bounds [-1, 1]
    const worldPos: [number, number, number] = [
      (dp.position[0] - 0.5) * 2,
      (dp.position[1] - 0.5) * 2,
      (dp.position[2] - 0.5) * 2,
    ];
    children.push(
      displace(
        attract(worldPos, { strength: dp.value * 0.3, falloff: 'inverse' }),
        { amount: dp.value * params.displacementAmount },
      ),
    );
  }

  return field(...children);
}

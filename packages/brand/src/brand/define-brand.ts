import { field, shape, grid, animate, color } from '@dot-engine/core';
import type { FieldChildNode } from '@dot-engine/core';
import { importLogo } from '../logo/import.js';
import { mapPersonality } from './personality.js';
import { motionToDisplacements } from './motion.js';
import type { BrandConfig, Brand } from './types.js';

export async function defineBrand(config: BrandConfig): Promise<Brand> {
  const logo = await importLogo(config.logo);
  const params = mapPersonality(config.personality);

  return {
    config,
    logo,
    field() {
      const res = params.gridResolution;
      const children: FieldChildNode[] = [
        shape(logo.sdfNode),
        grid({ type: 'uniform', resolution: [res, res, res] }),
        color({ primary: config.colors.primary, accent: config.colors.accent, mode: 'depth' }),
        ...motionToDisplacements(config.motion.style, config.motion.speed * params.animateSpeed, params.displacementAmount, params.useFlowField),
        animate({ speed: config.motion.speed * params.animateSpeed }),
      ];
      return field(...children);
    },
  };
}

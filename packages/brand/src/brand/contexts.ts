import { field, shape, grid, animate, color } from '@dot-engine/core';
import type { FieldChildNode, FieldRoot } from '@dot-engine/core';
import type { Brand, ContextOptions } from './types.js';
import type { MappedParams } from './personality.js';
import { motionToDisplacements } from './motion.js';

export function buildContextField(
  brand: Brand,
  context: string,
  params: MappedParams,
  options?: ContextOptions,
): FieldRoot {
  switch (context) {
    case 'logo': return buildLogoField(brand, params);
    case 'hero': return buildHeroField(brand, params);
    case 'loading': return buildLoadingField(brand, params);
    case 'banner': return buildBannerField(brand, params, options);
    default: return buildLogoField(brand, params);
  }
}

export function buildLogoField(brand: Brand, params: MappedParams): FieldRoot {
  const res = params.gridResolution;
  const speed = brand.config.motion.speed * params.animateSpeed;
  const children: FieldChildNode[] = [
    shape(brand.logo.sdfNode),
    grid({ type: 'uniform', resolution: [res, res, res] }),
    color({ primary: brand.config.colors.primary, accent: brand.config.colors.accent, mode: 'depth' }),
    ...motionToDisplacements(brand.config.motion.style, speed, params.displacementAmount, params.useFlowField),
    animate({ speed }),
  ];
  return field(...children);
}

export function buildHeroField(brand: Brand, params: MappedParams): FieldRoot {
  const res = Math.min(Math.round(params.gridResolution * 1.2), 60);
  const speed = brand.config.motion.speed * params.animateSpeed * 0.5;
  const children: FieldChildNode[] = [
    shape(brand.logo.sdfNode),
    grid({ type: 'uniform', resolution: [res, res, res] }),
    color({ primary: brand.config.colors.primary, accent: brand.config.colors.accent, mode: 'depth' }),
    ...motionToDisplacements(brand.config.motion.style, speed, params.displacementAmount * 1.5, params.useFlowField),
    animate({ speed }),
  ];
  return field(...children);
}

export function buildLoadingField(brand: Brand, params: MappedParams): FieldRoot {
  const res = Math.max(Math.round(params.gridResolution * 0.6), 15);
  const speed = brand.config.motion.speed * params.animateSpeed * 1.5;
  const children: FieldChildNode[] = [
    shape(brand.logo.sdfNode),
    grid({ type: 'uniform', resolution: [res, res, res] }),
    color({ primary: brand.config.colors.primary, accent: brand.config.colors.accent, mode: 'depth' }),
    // Only breathing displacement for loading — override to 'breathe'
    ...motionToDisplacements('breathe', speed, params.displacementAmount, false),
    animate({ speed }),
  ];
  return field(...children);
}

export function buildBannerField(brand: Brand, params: MappedParams, options?: ContextOptions): FieldRoot {
  const res = params.gridResolution;
  // Scale X resolution higher if width is provided (wide aspect)
  const xRes = options?.width ? Math.min(Math.round(res * (options.width / 400)), 80) : res;
  const speed = brand.config.motion.speed * params.animateSpeed;
  const children: FieldChildNode[] = [
    shape(brand.logo.sdfNode),
    grid({ type: 'uniform', resolution: [xRes, res, res] }),
    color({ primary: brand.config.colors.primary, accent: brand.config.colors.accent, mode: 'depth' }),
    ...motionToDisplacements(brand.config.motion.style, speed, params.displacementAmount, params.useFlowField),
    animate({ speed }),
  ];
  return field(...children);
}

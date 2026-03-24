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
    case 'logo': return buildLogoField(brand, params, options);
    case 'hero': return buildHeroField(brand, params, options);
    case 'loading': return buildLoadingField(brand, params);
    case 'banner': return buildBannerField(brand, params, options);
    default: return buildLogoField(brand, params, options);
  }
}

export function buildLogoField(brand: Brand, params: MappedParams, options?: ContextOptions): FieldRoot {
  const speed = brand.config.motion.speed * params.animateSpeed;
  const aspect = brand.logo.aspectRatio;

  // Text needs high dot density to be readable.
  // Scale resolution so there are enough dots along the narrowest axis.
  // Base: personality density drives a minimum of 30-80 dots on the short axis.
  const shortAxisDots = Math.round(30 + params.gridResolution * 0.8);
  const rx = Math.round(shortAxisDots * Math.max(1, aspect));
  const ry = shortAxisDots;
  const rz = Math.max(4, Math.round(shortAxisDots * 0.15)); // very thin Z for flat logos

  // Bounds match the aspect ratio — centered at origin
  let bx = Math.max(1, aspect);
  const by = 1;
  const bz = 0.3;

  // Adapt grid bounds to canvas aspect ratio so dots fill the visible area
  if (options?.canvasAspect && options.canvasAspect > 0) {
    const gridAspect = bx / by;
    if (options.canvasAspect > gridAspect) {
      // Canvas is wider than grid — extend X
      bx = by * options.canvasAspect;
    }
  }

  const children: FieldChildNode[] = [
    shape(brand.logo.sdfNode),
    grid({ type: 'uniform', resolution: [rx, ry, rz], bounds: [bx * 2, by * 2, bz * 2] }),
    color({ primary: brand.config.colors.primary, accent: brand.config.colors.accent, mode: 'depth' }),
    ...motionToDisplacements(brand.config.motion.style, speed, params.displacementAmount * 0.5, params.useFlowField),
    animate({ speed }),
  ];
  return field(...children);
}

export function buildHeroField(brand: Brand, params: MappedParams, options?: ContextOptions): FieldRoot {
  const speed = brand.config.motion.speed * params.animateSpeed * 0.5;
  const aspect = brand.logo.aspectRatio;
  const shortAxisDots = Math.round(40 + params.gridResolution * 0.8);
  const rx = Math.round(shortAxisDots * Math.max(1, aspect));
  const ry = shortAxisDots;
  const rz = Math.max(6, Math.round(shortAxisDots * 0.2));
  let bx = Math.max(1, aspect);

  // Adapt grid bounds to canvas aspect ratio
  if (options?.canvasAspect && options.canvasAspect > 0) {
    const gridAspect = bx / 1;
    if (options.canvasAspect > gridAspect) {
      bx = options.canvasAspect;
    }
  }

  const children: FieldChildNode[] = [
    shape(brand.logo.sdfNode),
    grid({ type: 'uniform', resolution: [rx, ry, rz], bounds: [bx * 2, 2, 0.5] }),
    color({ primary: brand.config.colors.primary, accent: brand.config.colors.accent, mode: 'depth' }),
    ...motionToDisplacements(brand.config.motion.style, speed, params.displacementAmount * 0.8, params.useFlowField),
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
  const speed = brand.config.motion.speed * params.animateSpeed;
  const aspect = brand.logo.aspectRatio;
  // Banners are extra wide — boost X resolution
  const shortAxisDots = Math.round(25 + params.gridResolution * 0.6);
  const bannerAspect = Math.max(aspect, 3); // banners are at least 3:1
  const rx = Math.round(shortAxisDots * bannerAspect);
  const ry = shortAxisDots;
  const rz = Math.max(3, Math.round(shortAxisDots * 0.1));
  const children: FieldChildNode[] = [
    shape(brand.logo.sdfNode),
    grid({ type: 'uniform', resolution: [rx, ry, rz], bounds: [bannerAspect * 2, 2, 0.3] }),
    color({ primary: brand.config.colors.primary, accent: brand.config.colors.accent, mode: 'depth' }),
    ...motionToDisplacements(brand.config.motion.style, speed, params.displacementAmount * 0.4, params.useFlowField),
    animate({ speed }),
  ];
  return field(...children);
}

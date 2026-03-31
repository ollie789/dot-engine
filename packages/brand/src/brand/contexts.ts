import { field, shape, grid, animate, color, size, opacity, twist, bend, mirror } from '@bigpuddle/dot-engine-core';
import type { FieldChildNode, FieldRoot, SdfNode } from '@bigpuddle/dot-engine-core';
import type { Brand, ContextOptions, BrandContext } from './types.js';
import type { MappedParams } from './personality.js';
import { motionToDisplacements } from './motion.js';
import { getShape } from '../shapes/gallery.js';

function applyTransforms(sdf: SdfNode, options?: ContextOptions): SdfNode {
  let result = sdf;
  if (options?.twist) result = twist(result, options.twist);
  if (options?.bend) result = bend(result, options.bend);
  if (options?.mirrorX) result = mirror(result, 'x');
  if (options?.mirrorY) result = mirror(result, 'y');
  return result;
}

function resolveShape(
  brand: Brand,
  context: BrandContext,
  params: MappedParams,
  options?: ContextOptions,
): SdfNode {
  const override = brand.config.contextShapes?.[context];
  if (!override) {
    return applyTransforms(brand.logo.sdfNode!, options);
  }
  if (typeof override === 'string') {
    const galleryShape = getShape(override);
    if (!galleryShape) return applyTransforms(brand.logo.sdfNode!, options);
    const sdfNode = galleryShape.build({
      energy: brand.config.personality.energy,
      organic: brand.config.personality.organic,
      density: brand.config.personality.density,
      aspectRatio: options?.canvasAspect,
    });
    return applyTransforms(sdfNode, options);
  }
  return applyTransforms(override, options);
}

export function buildContextField(
  brand: Brand,
  context: BrandContext,
  params: MappedParams,
  options?: ContextOptions,
): FieldRoot {
  switch (context) {
    case 'logo': return buildLogoField(brand, params, options);
    case 'hero': return buildHeroField(brand, params, options);
    case 'loading': return buildLoadingField(brand, params, options);
    case 'banner': return buildBannerField(brand, params, options);
    default: return buildLogoField(brand, params, options);
  }
}

export function buildLogoField(brand: Brand, params: MappedParams, options?: ContextOptions): FieldRoot {
  // If the brand has a pre-built field, use it directly for logo context
  if (brand.logo.prebuiltField) {
    return brand.logo.prebuiltField;
  }

  const speed = brand.config.motion.speed * params.animateSpeed;
  const aspect = brand.logo.aspectRatio;

  // Text needs high dot density to be readable.
  // Scale resolution so there are enough dots along the narrowest axis.
  // Base: personality density drives a minimum of 30-80 dots on the short axis.
  const shortAxisDots = Math.round(30 + params.gridResolution * 0.8);
  let rx = Math.round(shortAxisDots * Math.max(1, aspect));
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
      const stretch = options.canvasAspect / gridAspect;
      bx = by * options.canvasAspect;
      rx = Math.round(rx * stretch);
    }
  }

  const sdfNode = applyTransforms(brand.logo.sdfNode!, options);
  const children: FieldChildNode[] = [
    shape(sdfNode),
    grid({ type: 'uniform', resolution: [rx, ry, rz], bounds: [bx * 2, by * 2, bz * 2] }),
    color({ primary: brand.config.colors.primary, accent: brand.config.colors.accent, mode: options?.colorMode ?? 'depth' }),
    ...motionToDisplacements(brand.config.motion.style, speed, params.displacementAmount * 0.5, params.useFlowField),
    animate({ speed }),
  ];
  if (options?.dotSizeMin !== undefined || options?.dotSizeMax !== undefined) {
    children.push(size({ min: options.dotSizeMin ?? 0.002, max: options.dotSizeMax ?? 0.02 }));
  }
  if (options?.opacityMin !== undefined || options?.opacityMax !== undefined) {
    children.push(opacity({ min: options.opacityMin ?? 0.3, max: options.opacityMax ?? 1.0, mode: options.opacityMode }));
  }
  const edgeSoftness = options?.edgeSoftness ?? params.edgeSoftness;
  return { ...field(...children), edgeSoftness };
}

export function buildHeroField(brand: Brand, params: MappedParams, options?: ContextOptions): FieldRoot {
  if (brand.logo.prebuiltField) {
    return brand.logo.prebuiltField;
  }

  const speed = brand.config.motion.speed * params.animateSpeed * 0.5;
  const aspect = brand.logo.aspectRatio;
  const shortAxisDots = Math.round(40 + params.gridResolution * 0.8);
  let rx = Math.round(shortAxisDots * Math.max(1, aspect));
  const ry = shortAxisDots;
  const rz = Math.max(6, Math.round(shortAxisDots * 0.2));
  let bx = Math.max(1, aspect);

  // Adapt grid bounds to canvas aspect ratio
  if (options?.canvasAspect && options.canvasAspect > 0) {
    const gridAspect = bx / 1;
    if (options.canvasAspect > gridAspect) {
      const stretch = options.canvasAspect / gridAspect;
      bx = options.canvasAspect;
      rx = Math.round(rx * stretch);
    }
  }

  const sdfNode = resolveShape(brand, 'hero', params, options);
  const children: FieldChildNode[] = [
    shape(sdfNode),
    grid({ type: 'uniform', resolution: [rx, ry, rz], bounds: [bx * 2, 2, 0.5] }),
    color({ primary: brand.config.colors.primary, accent: brand.config.colors.accent, mode: options?.colorMode ?? 'depth' }),
    ...motionToDisplacements(brand.config.motion.style, speed, params.displacementAmount * 0.8, params.useFlowField),
    animate({ speed }),
  ];
  if (options?.dotSizeMin !== undefined || options?.dotSizeMax !== undefined) {
    children.push(size({ min: options.dotSizeMin ?? 0.002, max: options.dotSizeMax ?? 0.02 }));
  }
  if (options?.opacityMin !== undefined || options?.opacityMax !== undefined) {
    children.push(opacity({ min: options.opacityMin ?? 0.3, max: options.opacityMax ?? 1.0, mode: options.opacityMode }));
  }
  const edgeSoftness = options?.edgeSoftness ?? params.edgeSoftness;
  return { ...field(...children), edgeSoftness };
}

export function buildLoadingField(brand: Brand, params: MappedParams, options?: ContextOptions): FieldRoot {
  if (brand.logo.prebuiltField) {
    return brand.logo.prebuiltField;
  }

  const res = Math.max(Math.round(params.gridResolution * 0.6), 15);
  const speed = brand.config.motion.speed * params.animateSpeed * 1.5;
  const children: FieldChildNode[] = [
    shape(resolveShape(brand, 'loading', params, options)),
    grid({ type: 'uniform', resolution: [res, res, res] }),
    color({ primary: brand.config.colors.primary, accent: brand.config.colors.accent, mode: options?.colorMode ?? 'depth' }),
    // Only breathing displacement for loading — override to 'breathe'
    ...motionToDisplacements('breathe', speed, params.displacementAmount, false),
    animate({ speed }),
  ];
  if (options?.opacityMin !== undefined || options?.opacityMax !== undefined) {
    children.push(opacity({ min: options.opacityMin ?? 0.3, max: options.opacityMax ?? 1.0, mode: options.opacityMode }));
  }
  return { ...field(...children), edgeSoftness: params.edgeSoftness };
}


export function buildBannerField(brand: Brand, params: MappedParams, options?: ContextOptions): FieldRoot {
  if (brand.logo.prebuiltField) {
    return brand.logo.prebuiltField;
  }

  const speed = brand.config.motion.speed * params.animateSpeed;
  const aspect = brand.logo.aspectRatio;
  // Banners are extra wide — boost X resolution
  const shortAxisDots = Math.round(25 + params.gridResolution * 0.6);
  let bannerAspect = Math.max(aspect, 3); // banners are at least 3:1

  // Adapt grid bounds to canvas aspect ratio
  if (options?.canvasAspect && options.canvasAspect > bannerAspect) {
    bannerAspect = options.canvasAspect;
  }

  const rx = Math.round(shortAxisDots * bannerAspect);
  const ry = shortAxisDots;
  const rz = Math.max(3, Math.round(shortAxisDots * 0.1));
  const sdfNode = resolveShape(brand, 'banner', params, options);
  const children: FieldChildNode[] = [
    shape(sdfNode),
    grid({ type: 'uniform', resolution: [rx, ry, rz], bounds: [bannerAspect * 2, 2, 0.3] }),
    color({ primary: brand.config.colors.primary, accent: brand.config.colors.accent, mode: options?.colorMode ?? 'depth' }),
    ...motionToDisplacements(brand.config.motion.style, speed, params.displacementAmount * 0.4, params.useFlowField),
    animate({ speed }),
  ];
  if (options?.dotSizeMin !== undefined || options?.dotSizeMax !== undefined) {
    children.push(size({ min: options.dotSizeMin ?? 0.002, max: options.dotSizeMax ?? 0.02 }));
  }
  if (options?.opacityMin !== undefined || options?.opacityMax !== undefined) {
    children.push(opacity({ min: options.opacityMin ?? 0.3, max: options.opacityMax ?? 1.0, mode: options.opacityMode }));
  }
  const edgeSoftness = options?.edgeSoftness ?? params.edgeSoftness;
  return { ...field(...children), edgeSoftness };
}

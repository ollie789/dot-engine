# Shape Gallery + Per-Context Shape Overrides

**Date:** 2026-03-31
**Cycle:** 1 of 2 (Cycle 2: Node Graph Composer — separate spec)

## Problem

Every context (logo, hero, banner, loading) uses the logo SDF as its shape. There's no way to use programmatic SDF primitives for banner/hero backgrounds — the configurator only offers text, file upload, or image. Banners and heroes need interesting dot-field silhouettes (wave patterns, grids, toruses) that aren't derived from a logo.

## Solution

1. **Shape gallery** in the brand package — ~8 simple SDF shapes (patterns + primitives) as factory functions that adapt to personality params
2. **Per-context shape overrides** — `BrandConfig.contextShapes` maps contexts to gallery shape names or raw SdfNodes
3. **Configurator UI** — hybrid toggle per context: off = logo shape (default), on = gallery picker

## Architecture: Shape-in-Brand

Gallery shapes live in `packages/brand/src/shapes/`. Each shape is a small factory function returning an `SdfNode` built from core primitives. The brand package already contains personality mapping and context builders, so shapes can adapt to energy/organic/density without cross-package coupling.

## Section 1: Shape Gallery Data Model

### Types

```ts
// packages/brand/src/shapes/types.ts
export interface GalleryShape {
  name: string;                    // unique ID: 'wave-field', 'torus', etc.
  label: string;                   // display: 'Wave Field'
  category: 'pattern' | 'shape';  // two categories
  description: string;
  icon: string;
  build(params: ShapeBuildParams): SdfNode;
}

export interface ShapeBuildParams {
  energy: number;
  organic: number;
  density: number;
  aspectRatio?: number;
}
```

### Registry

```ts
// packages/brand/src/shapes/gallery.ts
export const SHAPE_GALLERY: GalleryShape[] = [ ... ];

export function getShape(name: string): GalleryShape | undefined {
  return SHAPE_GALLERY.find(s => s.name === name);
}
```

Adding a new shape = adding a `GalleryShape` object to the array. No other changes needed.

### Starter Shapes (~8)

The dots do the visual work — shapes just provide interesting boundaries.

**Patterns (3):**
- **Wave Field** — `repeat(elongate(capsule))` with spacing from density. Horizontal ridges for wide banners.
- **Dot Matrix** — `repeat(sphere)` in a regular grid. Spacing and radius from density/energy.
- **Hex Grid** — `repeat(cylinder)` with hex-offset rows. Cell count from density.

**Shapes (5):**
- **Sphere** — `sphere(r)` where r scales with energy. The simplest centerpiece.
- **Torus** — `torus(majorR, minorR)` with organic controlling minor radius relative to major.
- **Box** — `box(halfExtents, edgeRadius)` with edge radius from organic (sharp to rounded).
- **Capsule** — `capsule(radius, height)` with height from energy.
- **Plane** — `plane([0,1,0], offset)` — flat plane for filling the frame. Good as a banner base.

Each `build()` function is 3-10 lines of core SDF calls. Personality params adjust dimensions/spacing/radius — no complex boolean trees.

## Section 2: Per-Context Shape Overrides

### BrandConfig Extension

```ts
// in BrandConfig (packages/brand/src/brand/types.ts)
contextShapes?: Partial<Record<BrandContext, string | SdfNode>>;
// string = gallery shape name
// SdfNode = raw custom shape (for Cycle 2 / SDK users)
```

### Shape Resolution

New helper in `packages/brand/src/brand/contexts.ts`:

```ts
function resolveShape(
  brand: Brand,
  context: BrandContext,
  params: MappedParams,
  options?: ContextOptions,
): SdfNode {
  const override = brand.config.contextShapes?.[context];
  if (!override) {
    // Default: use logo SDF with transforms
    return applyTransforms(brand.logo.sdfNode!, options);
  }
  if (typeof override === 'string') {
    // Gallery shape name — look up and build
    const shape = getShape(override);
    if (!shape) return applyTransforms(brand.logo.sdfNode!, options);
    const sdfNode = shape.build({
      energy: brand.config.personality.energy,
      organic: brand.config.personality.organic,
      density: brand.config.personality.density,
      aspectRatio: options?.canvasAspect,
    });
    return applyTransforms(sdfNode, options);
  }
  // Raw SdfNode
  return applyTransforms(override, options);
}
```

All four context builders (`buildLogoField`, `buildHeroField`, `buildBannerField`, `buildLoadingField`) replace their direct `brand.logo.sdfNode!` usage with `resolveShape(brand, context, params, options)`.

**Exception:** `buildLogoField` always uses the logo SDF — no override. Logo context is the brand identity; overrides apply to hero/banner/loading only.

### Brand Export

`SHAPE_GALLERY`, `getShape`, `GalleryShape`, and `ShapeBuildParams` are exported from `@bigpuddle/dot-engine-brand` so the configurator can render the gallery picker.

## Section 3: Configurator UI

### State in App.tsx

```ts
const [contextShapes, setContextShapes] = useState<
  Partial<Record<BrandContext, string | null>>
>({});
```

Passed into `defineBrand({ contextShapes })`. The `defineBrand` effect's dependency array includes `contextShapes`.

### LeftPanel — Shape Override Section

A new collapsible section appears in LeftPanel **only when `activeContext` is not `'logo'`**:

```
Shape Override  [toggle]
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│Wave │ │DotMx│ │ Hex │ │Sphere│ ...
└─────┘ └─────┘ └─────┘ └─────┘
```

- Toggle OFF (default) = section collapsed, context uses logo shape
- Toggle ON = reveals gallery grid, user clicks a shape card
- Selected shape gets active border (same `mini-pill active` pattern as vibe cards)
- Selection is per-context: switching context tabs in TopBar preserves each context's override

### Props Threading

`LeftPanel` receives:
- `activeContext: BrandContext` (already available)
- `contextShapes: Partial<Record<BrandContext, string | null>>`
- `setContextShapes: (shapes: ...) => void`

When the user toggles the override off, set `contextShapes[activeContext] = null`. When they select a gallery shape, set `contextShapes[activeContext] = shape.name`.

### Canvas3D

No changes needed — `Canvas3D` already renders whatever `brand.field(context, options)` returns. The shape override is resolved inside the brand's context builders.

## Section 4: Testing

Extends existing test files plus one new file for gallery shapes:

**`packages/brand/__tests__/contexts.test.ts`** (~8 new tests):
- `resolveShape` returns logo SDF when no override set
- `resolveShape` returns gallery shape SDF when override is a string
- `resolveShape` returns raw SdfNode when override is an SdfNode
- `resolveShape` falls back to logo SDF for unknown gallery name
- `buildBannerField` uses overridden shape
- `buildHeroField` uses overridden shape
- `buildLogoField` always uses logo SDF (never overridden)

**`packages/brand/__tests__/gallery.test.ts`** (new file, ~5 tests):
- Each gallery shape's `build()` returns a valid SdfNode with a recognized `type`
- `getShape()` returns the correct shape by name
- `getShape()` returns undefined for unknown names
- All gallery shapes compile without error via `compileField(field(shape(galleryShape.build(...))))`

## Out of Scope

- Node graph composer (Cycle 2)
- Custom shape serialization / save-to-gallery
- Animated shape morphing between contexts
- Shape parameter sliders in the configurator (shapes adapt via personality only)

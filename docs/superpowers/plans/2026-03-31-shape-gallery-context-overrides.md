# Shape Gallery + Per-Context Overrides — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gallery of ~8 simple SDF shapes to the brand package, enable per-context shape overrides in BrandConfig, and expose shape selection in the configurator UI for non-logo contexts.

**Architecture:** Gallery shapes are factory functions in `packages/brand/src/shapes/` that return `SdfNode` instances from core primitives. `BrandConfig.contextShapes` maps contexts to shape names or raw SdfNodes. Context builders call `resolveShape()` which checks overrides before falling back to the logo SDF. The configurator adds a toggle + gallery picker in LeftPanel for non-logo contexts.

**Tech Stack:** TypeScript, React, Three.js/R3F, Vite, Vitest

**Spec:** `docs/superpowers/specs/2026-03-31-shape-gallery-context-overrides-design.md`

---

## File Map

### New Files
- `packages/brand/src/shapes/types.ts` — `GalleryShape` and `ShapeBuildParams` interfaces
- `packages/brand/src/shapes/gallery.ts` — shape registry, `SHAPE_GALLERY` array, `getShape()` lookup
- `packages/brand/src/shapes/patterns.ts` — wave-field, dot-matrix, hex-grid shape definitions
- `packages/brand/src/shapes/primitives.ts` — sphere, torus, box, capsule, plane shape definitions
- `packages/brand/__tests__/gallery.test.ts` — gallery shape tests

### Modified Files
- `packages/brand/src/brand/types.ts` — add `contextShapes` to `BrandConfig`
- `packages/brand/src/brand/contexts.ts` — add `resolveShape()`, update context builders
- `packages/brand/src/index.ts` — export gallery types and functions
- `packages/brand/__tests__/contexts.test.ts` — add shape override tests
- `packages/configurator/src/App.tsx` — add `contextShapes` state, pass to `defineBrand` and `LeftPanel`
- `packages/configurator/src/components/LeftPanel.tsx` — add shape override toggle + gallery picker UI

---

### Task 1: Shape Types and Registry

**Files:**
- Create: `packages/brand/src/shapes/types.ts`
- Create: `packages/brand/src/shapes/gallery.ts`
- Create: `packages/brand/__tests__/gallery.test.ts`

- [ ] **Step 1: Write gallery test scaffolding**

Create `packages/brand/__tests__/gallery.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { _resetIds } from '../../core/src/nodes/types.js';
import { SHAPE_GALLERY, getShape } from '../src/shapes/gallery.js';
import type { GalleryShape } from '../src/shapes/types.js';

beforeEach(() => {
  _resetIds();
});

describe('SHAPE_GALLERY', () => {
  it('contains at least 8 shapes', () => {
    expect(SHAPE_GALLERY.length).toBeGreaterThanOrEqual(8);
  });

  it('every shape has required fields', () => {
    for (const shape of SHAPE_GALLERY) {
      expect(shape.name).toBeTruthy();
      expect(shape.label).toBeTruthy();
      expect(shape.category).toMatch(/^(pattern|shape)$/);
      expect(shape.description).toBeTruthy();
      expect(shape.icon).toBeTruthy();
      expect(typeof shape.build).toBe('function');
    }
  });

  it('all shape names are unique', () => {
    const names = SHAPE_GALLERY.map(s => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every shape build() returns a valid SdfNode', () => {
    const params = { energy: 0.5, organic: 0.5, density: 0.5 };
    for (const shape of SHAPE_GALLERY) {
      const node = shape.build(params);
      expect(node).toBeDefined();
      expect(node.type).toBeTruthy();
      expect(node.id).toBeTruthy();
    }
  });
});

describe('getShape()', () => {
  it('returns a shape by name', () => {
    const first = SHAPE_GALLERY[0];
    const found = getShape(first.name);
    expect(found).toBe(first);
  });

  it('returns undefined for unknown name', () => {
    expect(getShape('nonexistent-shape')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/brand/__tests__/gallery.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create types.ts**

Create `packages/brand/src/shapes/types.ts`:

```ts
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
```

- [ ] **Step 4: Create empty gallery.ts**

Create `packages/brand/src/shapes/gallery.ts`:

```ts
import type { GalleryShape } from './types.js';

export const SHAPE_GALLERY: GalleryShape[] = [];

export function getShape(name: string): GalleryShape | undefined {
  return SHAPE_GALLERY.find(s => s.name === name);
}
```

- [ ] **Step 5: Run test — getShape tests pass, SHAPE_GALLERY size test fails**

Run: `pnpm vitest run packages/brand/__tests__/gallery.test.ts`
Expected: 2 pass (getShape tests), others fail (gallery is empty)

- [ ] **Step 6: Commit scaffolding**

```bash
git add packages/brand/src/shapes/types.ts packages/brand/src/shapes/gallery.ts packages/brand/__tests__/gallery.test.ts
git commit -m "feat(brand): add shape gallery types and empty registry"
```

---

### Task 2: Pattern Shapes (Wave Field, Dot Matrix, Hex Grid)

**Files:**
- Create: `packages/brand/src/shapes/patterns.ts`
- Modify: `packages/brand/src/shapes/gallery.ts`

- [ ] **Step 1: Create patterns.ts**

Create `packages/brand/src/shapes/patterns.ts`:

```ts
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
```

- [ ] **Step 2: Register patterns in gallery.ts**

Replace `packages/brand/src/shapes/gallery.ts`:

```ts
import type { GalleryShape } from './types.js';
import { waveField, dotMatrix, hexGrid } from './patterns.js';

export const SHAPE_GALLERY: GalleryShape[] = [
  waveField,
  dotMatrix,
  hexGrid,
];

export function getShape(name: string): GalleryShape | undefined {
  return SHAPE_GALLERY.find(s => s.name === name);
}
```

- [ ] **Step 3: Run gallery tests — size test still fails (3 < 8), but shape validity passes**

Run: `pnpm vitest run packages/brand/__tests__/gallery.test.ts`
Expected: "contains at least 8 shapes" fails, other tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/brand/src/shapes/patterns.ts packages/brand/src/shapes/gallery.ts
git commit -m "feat(brand): add wave-field, dot-matrix, hex-grid pattern shapes"
```

---

### Task 3: Primitive Shapes (Sphere, Torus, Box, Capsule, Plane)

**Files:**
- Create: `packages/brand/src/shapes/primitives.ts`
- Modify: `packages/brand/src/shapes/gallery.ts`

- [ ] **Step 1: Create primitives.ts**

Create `packages/brand/src/shapes/primitives.ts`:

```ts
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
```

- [ ] **Step 2: Register primitives in gallery.ts**

Replace `packages/brand/src/shapes/gallery.ts`:

```ts
import type { GalleryShape } from './types.js';
import { waveField, dotMatrix, hexGrid } from './patterns.js';
import { sphereShape, torusShape, boxShape, capsuleShape, planeShape } from './primitives.js';

export const SHAPE_GALLERY: GalleryShape[] = [
  waveField,
  dotMatrix,
  hexGrid,
  sphereShape,
  torusShape,
  boxShape,
  capsuleShape,
  planeShape,
];

export function getShape(name: string): GalleryShape | undefined {
  return SHAPE_GALLERY.find(s => s.name === name);
}
```

- [ ] **Step 3: Run gallery tests — all pass**

Run: `pnpm vitest run packages/brand/__tests__/gallery.test.ts`
Expected: All 6 tests PASS (8 shapes >= 8)

- [ ] **Step 4: Commit**

```bash
git add packages/brand/src/shapes/primitives.ts packages/brand/src/shapes/gallery.ts
git commit -m "feat(brand): add sphere, torus, box, capsule, plane primitive shapes"
```

---

### Task 4: Export Gallery From Brand Package

**Files:**
- Modify: `packages/brand/src/index.ts`

- [ ] **Step 1: Add gallery exports**

In `packages/brand/src/index.ts`, add at the end:

```ts
export { SHAPE_GALLERY, getShape } from './shapes/gallery.js';
export type { GalleryShape, ShapeBuildParams } from './shapes/types.js';
```

- [ ] **Step 2: Run full test suite**

Run: `pnpm vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/brand/src/index.ts
git commit -m "feat(brand): export shape gallery from brand package"
```

---

### Task 5: Per-Context Shape Resolution in Context Builders

**Files:**
- Modify: `packages/brand/src/brand/types.ts`
- Modify: `packages/brand/src/brand/contexts.ts`
- Modify: `packages/brand/__tests__/contexts.test.ts`

- [ ] **Step 1: Write tests for shape override behavior**

Add these tests to `packages/brand/__tests__/contexts.test.ts`. First add import at the top:

```ts
import { getShape, SHAPE_GALLERY } from '../src/shapes/gallery.js';
```

Then add this new describe block at the end of the file:

```ts
describe('per-context shape overrides', () => {
  it('buildBannerField uses logo SDF when no override', () => {
    const brand = makeMockBrand();
    const params = makeMockParams();
    const result = buildBannerField(brand, params);
    const shapeNode = result.children.find(c => c.type === 'shape') as any;
    expect(shapeNode.sdf.type).toBe('textureSdf');
  });

  it('buildBannerField uses gallery shape when contextShapes override is set', () => {
    const brand = makeMockBrand();
    brand.config.contextShapes = { banner: 'sphere' };
    const params = makeMockParams();
    const result = buildBannerField(brand, params);
    const shapeNode = result.children.find(c => c.type === 'shape') as any;
    expect(shapeNode.sdf.type).toBe('sphere');
  });

  it('buildHeroField uses gallery shape when override is set', () => {
    const brand = makeMockBrand();
    brand.config.contextShapes = { hero: 'torus' };
    const params = makeMockParams();
    const result = buildHeroField(brand, params);
    const shapeNode = result.children.find(c => c.type === 'shape') as any;
    expect(shapeNode.sdf.type).toBe('torus');
  });

  it('buildLogoField always uses logo SDF even with override', () => {
    const brand = makeMockBrand();
    brand.config.contextShapes = { logo: 'sphere' };
    const params = makeMockParams();
    const result = buildLogoField(brand, params);
    const shapeNode = result.children.find(c => c.type === 'shape') as any;
    expect(shapeNode.sdf.type).toBe('textureSdf');
  });

  it('falls back to logo SDF for unknown gallery shape name', () => {
    const brand = makeMockBrand();
    brand.config.contextShapes = { banner: 'nonexistent-shape' };
    const params = makeMockParams();
    const result = buildBannerField(brand, params);
    const shapeNode = result.children.find(c => c.type === 'shape') as any;
    expect(shapeNode.sdf.type).toBe('textureSdf');
  });

  it('accepts raw SdfNode as override', async () => {
    const brand = makeMockBrand();
    const { sphere } = await import('../../core/src/sdf/primitives.js');
    brand.config.contextShapes = { banner: sphere(0.5) };
    const params = makeMockParams();
    const result = buildBannerField(brand, params);
    const shapeNode = result.children.find(c => c.type === 'shape') as any;
    expect(shapeNode.sdf.type).toBe('sphere');
  });

  it('different contexts can have different overrides', () => {
    const brand = makeMockBrand();
    brand.config.contextShapes = { banner: 'sphere', hero: 'torus' };
    const params = makeMockParams();
    const bannerShape = buildBannerField(brand, params).children.find(c => c.type === 'shape') as any;
    const heroShape = buildHeroField(brand, params).children.find(c => c.type === 'shape') as any;
    expect(bannerShape.sdf.type).toBe('sphere');
    expect(heroShape.sdf.type).toBe('torus');
  });
});
```

- [ ] **Step 2: Run tests to verify failures**

Run: `pnpm vitest run packages/brand/__tests__/contexts.test.ts`
Expected: New tests FAIL — `contextShapes` doesn't exist on BrandConfig, context builders don't resolve overrides

- [ ] **Step 3: Add contextShapes to BrandConfig**

In `packages/brand/src/brand/types.ts`, add import at top:

```ts
import type { SdfNode } from '@bigpuddle/dot-engine-core';
```

Add to the `BrandConfig` interface, after the `motion` field:

```ts
  contextShapes?: Partial<Record<BrandContext, string | SdfNode>>;
```

- [ ] **Step 4: Add resolveShape() and update context builders**

In `packages/brand/src/brand/contexts.ts`, add import at top:

```ts
import { getShape } from '../shapes/gallery.js';
import type { ShapeBuildParams } from '../shapes/types.js';
```

Add the `resolveShape` helper after the existing `applyTransforms` function:

```ts
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
```

Update `buildHeroField` — replace:

```ts
  const sdfNode = applyTransforms(brand.logo.sdfNode!, options);
```

With:

```ts
  const sdfNode = resolveShape(brand, 'hero', params, options);
```

Update `buildBannerField` — replace:

```ts
  const sdfNode = applyTransforms(brand.logo.sdfNode!, options);
```

With:

```ts
  const sdfNode = resolveShape(brand, 'banner', params, options);
```

Update `buildLoadingField` — replace the `shape(brand.logo.sdfNode!)` line. Find:

```ts
    shape(brand.logo.sdfNode!),
```

Replace with:

```ts
    shape(resolveShape(brand, 'loading', params, options)),
```

**Do NOT change `buildLogoField`** — it keeps using `brand.logo.sdfNode!` directly (logo context is never overridden).

- [ ] **Step 5: Run context tests**

Run: `pnpm vitest run packages/brand/__tests__/contexts.test.ts`
Expected: All tests PASS (existing + new)

- [ ] **Step 6: Run full test suite**

Run: `pnpm vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/brand/src/brand/types.ts packages/brand/src/brand/contexts.ts packages/brand/__tests__/contexts.test.ts
git commit -m "feat(brand): add per-context shape overrides via resolveShape()"
```

---

### Task 6: Configurator UI — Shape Override in LeftPanel

**Files:**
- Modify: `packages/configurator/src/App.tsx`
- Modify: `packages/configurator/src/components/LeftPanel.tsx`

- [ ] **Step 1: Add state and props in App.tsx**

In `packages/configurator/src/App.tsx`:

Add import:
```ts
import type { BrandContext } from '@bigpuddle/dot-engine-brand';
```

(Note: `BrandContext` may already be imported — check first. If not, add it.)

Add state after existing state declarations:
```ts
  const [contextShapes, setContextShapes] = useState<Partial<Record<BrandContext, string | null>>>({});
```

In the `defineBrand` effect, add `contextShapes` to the config. Find:
```ts
        const b = await defineBrand({
```

Add `contextShapes` to the object passed to `defineBrand`. After the `motion` field, add:
```ts
          contextShapes: Object.fromEntries(
            Object.entries(contextShapes).filter(([, v]) => v != null)
          ),
```

Add `contextShapes` to the effect dependency array — add it after `advancedSettings.motionSpeed`:
```ts
    contextShapes,
```

Pass new props to `LeftPanel`. Add after the existing `opacityMode` prop:
```tsx
          activeContext={activeContext}
          contextShapes={contextShapes}
          setContextShapes={setContextShapes}
```

- [ ] **Step 2: Add shape override section to LeftPanel**

In `packages/configurator/src/components/LeftPanel.tsx`:

Add import at top:
```ts
import { SHAPE_GALLERY, type GalleryShape } from '@bigpuddle/dot-engine-brand';
import type { BrandContext } from '@bigpuddle/dot-engine-brand';
```

Add to `LeftPanelProps` interface, after the `colorFromImage` props:
```ts
  // Shape override
  activeContext: BrandContext;
  contextShapes: Partial<Record<BrandContext, string | null>>;
  setContextShapes: (shapes: Partial<Record<BrandContext, string | null>>) => void;
```

Add to the destructured props:
```ts
  activeContext,
  contextShapes,
  setContextShapes,
```

Add the shape override section in the JSX. Place it after the Image Source section (after the closing `)}` of the `{hasImage && (` block), before the closing `</div>` of `left-panel`:

```tsx
      {/* Shape Override (non-logo contexts only) */}
      {activeContext !== 'logo' && (
        <div className="panel-section">
          <div className="section-title" style={{ color: 'var(--accent-green)' }}>
            Shape
          </div>
          <div className="toggle-row" style={{ marginBottom: 8 }}>
            <span className="panel-label">Custom shape</span>
            <button
              className={`panel-toggle${contextShapes[activeContext] != null ? ' active' : ''}`}
              onClick={() => {
                if (contextShapes[activeContext] != null) {
                  setContextShapes({ ...contextShapes, [activeContext]: null });
                } else {
                  setContextShapes({ ...contextShapes, [activeContext]: SHAPE_GALLERY[0].name });
                }
              }}
              aria-label="Shape override toggle"
            >
              {contextShapes[activeContext] != null ? 'ON' : 'OFF'}
            </button>
          </div>

          {contextShapes[activeContext] != null && (
            <>
              <div className="panel-label" style={{ marginBottom: 4 }}>
                {SHAPE_GALLERY.filter(s => s.category === 'pattern').length > 0 && 'Patterns'}
              </div>
              <div className="vibe-grid" style={{ marginBottom: 8 }}>
                {SHAPE_GALLERY.filter(s => s.category === 'pattern').map(shape => (
                  <button
                    key={shape.name}
                    className={`vibe-card${contextShapes[activeContext] === shape.name ? ' active' : ''}`}
                    onClick={() => setContextShapes({ ...contextShapes, [activeContext]: shape.name })}
                    title={shape.description}
                  >
                    <span className="vibe-icon">{shape.icon}</span>
                    <span className="vibe-name">{shape.label}</span>
                  </button>
                ))}
              </div>
              <div className="panel-label" style={{ marginBottom: 4 }}>Shapes</div>
              <div className="vibe-grid">
                {SHAPE_GALLERY.filter(s => s.category === 'shape').map(shape => (
                  <button
                    key={shape.name}
                    className={`vibe-card${contextShapes[activeContext] === shape.name ? ' active' : ''}`}
                    onClick={() => setContextShapes({ ...contextShapes, [activeContext]: shape.name })}
                    title={shape.description}
                  >
                    <span className="vibe-icon">{shape.icon}</span>
                    <span className="vibe-name">{shape.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
```

- [ ] **Step 3: Run full test suite**

Run: `pnpm vitest run`
Expected: All tests PASS

- [ ] **Step 4: Verify in the configurator**

Open http://localhost:3100/. Steps:
1. Click "hero" context tab in TopBar
2. Verify "Shape" section appears in left panel with toggle
3. Toggle ON — gallery grid appears
4. Click "Sphere" — hero renders a sphere dot field instead of text
5. Click "Wave Field" — hero renders repeating ridges
6. Switch to "banner" tab — toggle is OFF (independent per context)
7. Toggle ON, select "Dot Matrix" — banner renders sphere grid
8. Switch back to "logo" tab — no Shape section visible, logo renders normally
9. Switch back to "hero" — sphere selection is preserved

- [ ] **Step 5: Commit**

```bash
git add packages/configurator/src/App.tsx packages/configurator/src/components/LeftPanel.tsx
git commit -m "feat(configurator): add shape override toggle and gallery picker for non-logo contexts"
```

---

### Task 7: Final Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `pnpm vitest run`
Expected: All tests PASS, no regressions

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors across all packages

- [ ] **Step 3: Manual smoke test**

Open http://localhost:3100/ and verify:
1. **Logo context** — no Shape section in left panel, logo renders as text SDF
2. **Hero context** — Shape section visible, toggle OFF by default, hero uses logo shape
3. **Hero + shape override** — toggle ON, select Torus, hero renders torus dot field
4. **Banner + shape override** — switch to banner, toggle ON, select Wave Field, banner renders wave ridges
5. **Loading context** — toggle ON, select Dot Matrix, loading renders dot grid
6. **Context independence** — each context preserves its own shape selection
7. **Vibe changes** — changing vibes affects motion/color/displacement but shape override persists
8. **Toggle OFF** — turning off override restores logo SDF for that context
9. **All 8 gallery shapes** — click through each, verify they render without errors

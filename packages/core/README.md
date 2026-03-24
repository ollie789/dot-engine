# @dot-engine/core

Pure TypeScript DAG authoring API for dot-engine. Zero dependencies.

This package defines the node types and builder functions that describe a dot field as a
directed acyclic graph. The graph can be compiled to GLSL by `@dot-engine/renderer`, evaluated
on the CPU by `evaluateSdf`, or serialized to JSON for storage and transfer.

```bash
npm install @dot-engine/core
```

---

## Field composition

A field is assembled by calling `field()` with child nodes in declaration order.

```ts
import { field, shape, grid, animate, color, displace, simplex3D } from '@dot-engine/core';
import { sphere } from '@dot-engine/core';

const f = field(
  shape(sphere(0.7)),
  grid({ type: 'uniform', resolution: [40, 40, 40] }),
  color({ primary: '#4a9eff', accent: '#ff6b4a', mode: 'depth' }),
  displace(simplex3D({ scale: 3, speed: 0.2 }), { amount: 0.08 }),
  animate({ speed: 0.4 }),
);
```

### `field(...children: FieldChildNode[]): FieldRoot`

Creates the root node of a dot field.

### `shape(sdf: SdfNode): ShapeNode`

Wraps an SDF tree as the field's geometry source.

### `grid(options): GridNode`

Defines the dot sampling grid.

| Parameter | Type | Description |
|---|---|---|
| `type` | `'uniform'` | Grid type — currently only uniform is supported |
| `resolution` | `[number, number, number]` | Dot count along X, Y, Z |
| `bounds` | `[number, number, number]` | World-space extents (default `[2, 2, 2]`) |

### `animate(options: AnimateOptions): AnimateNode`

Controls animation time scaling.

| Parameter | Type | Description |
|---|---|---|
| `speed` | `number` | Time multiplier applied to `uTime` uniform |
| `reducedMotion` | `'static' \| 'reduced'` | Optional motion reduction hint |

### `displace(noise: NoiseConfig, opts?: { amount?: number }): DisplaceNode`

Adds a displacement layer. `amount` defaults to `1`. Multiple displace nodes stack additively.

---

## SDF Primitives

```ts
import {
  sphere, box, torus, cylinder, capsule, cone, plane, metaball,
} from '@dot-engine/core';
```

| Function | Signature | Description |
|---|---|---|
| `sphere` | `(radius: number)` | Sphere centered at origin |
| `box` | `(halfExtents: [x,y,z], edgeRadius?: number)` | Axis-aligned box, optional rounded edges |
| `torus` | `(majorR: number, minorR: number)` | Torus on the XZ plane |
| `cylinder` | `(radius: number, height: number)` | Capped cylinder along Y |
| `capsule` | `(radius: number, height: number)` | Capsule (cylinder + hemisphere caps) along Y |
| `cone` | `(radius: number, height: number)` | Cone along Y, tip up |
| `plane` | `(normal: [x,y,z], offset: number)` | Infinite plane |
| `metaball` | `(centers: {position,radius}[], threshold?: number)` | Implicit metaball field |

There are also two advanced primitives accessed via the type system:

- `TextureSdfNode` — SDF stored in a GPU texture, used internally by `@dot-engine/brand` for
  logo and text rendering.
- `CustomSdfNode` — injects raw GLSL into the compiled shader. **Do not use with untrusted
  input.**

```ts
// Rounded box
const rb = box([0.4, 0.2, 0.3], 0.05);

// Metaball cluster
const mb = metaball([
  { position: [0, 0, 0], radius: 0.5 },
  { position: [0.6, 0, 0], radius: 0.4 },
], 1.0);
```

---

## SDF Booleans

```ts
import {
  union, smoothUnion, subtract, smoothSubtract,
  intersect, smoothIntersect, onion,
} from '@dot-engine/core';
```

| Function | Signature | Description |
|---|---|---|
| `union` | `(a, b)` | Hard minimum of two SDFs |
| `smoothUnion` | `(a, b, k)` | Blended union with smoothing factor `k > 0` |
| `subtract` | `(a, b)` | Carve `b` out of `a` |
| `smoothSubtract` | `(a, b, k)` | Smooth carve |
| `intersect` | `(a, b)` | Keep only the overlap of `a` and `b` |
| `smoothIntersect` | `(a, b, k)` | Smooth intersection |
| `onion` | `(child, thickness)` | Shell at distance `thickness` from the surface |

```ts
// Crystal: smooth union of a box and sphere
const crystal = smoothUnion(box([0.4, 0.4, 0.4], 0.05), sphere(0.35), 0.15);

// Hollow sphere shell
const shell = onion(sphere(0.6), 0.05);
```

---

## SDF Transforms

```ts
import {
  translate, rotate, scale, twist, bend,
  repeat, mirror, elongate,
} from '@dot-engine/core';
```

All transforms wrap a child SDF node.

| Function | Signature | Description |
|---|---|---|
| `translate` | `(child, offset: [x,y,z])` | Translate in world space |
| `rotate` | `(child, angles: [x,y,z])` | Euler rotation in radians |
| `scale` | `(child, factor: number)` | Uniform scale |
| `twist` | `(child, amount: number)` | Twist around Y axis, radians per unit Y |
| `bend` | `(child, amount: number)` | Bend in the XY plane |
| `repeat` | `(child, spacing: [x,y,z])` | Infinite repetition along each axis |
| `mirror` | `(child, axis: 'x'|'y'|'z')` | Mirror across the given axis |
| `elongate` | `(child, amount: [x,y,z])` | Stretch the primitive along each axis |

```ts
import { translate, rotate, mirror } from '@dot-engine/core';

// Torus lifted and rotated
const t = rotate(translate(torus(0.4, 0.15), [0, 0.3, 0]), [Math.PI / 4, 0, 0]);

// Mirror a cone across X for symmetry
const sym = mirror(cone(0.3, 0.6), 'x');
```

---

## Displacement

```ts
import { displace, simplex3D, domainWarp3D, flowField3D, attract } from '@dot-engine/core';
```

Noise configs are passed to `displace()`:

### `simplex3D(opts): Simplex3DConfig`

| Parameter | Type | Description |
|---|---|---|
| `scale` | `number` | Spatial frequency of the noise |
| `speed` | `number` | How fast the noise evolves over time |

### `domainWarp3D(opts): DomainWarp3DConfig`

| Parameter | Type | Description |
|---|---|---|
| `octaves` | `number` | Number of noise octaves (effective scale multiplied by octaves) |
| `scale` | `number` | Base spatial frequency |
| `speed` | `number` | Optional time evolution speed |

### `flowField3D(opts): FlowField3DConfig`

Curl noise — divergence-free flow. Good for organic, swirling motion.

| Parameter | Type | Description |
|---|---|---|
| `scale` | `number` | Spatial frequency |
| `speed` | `number` | Time evolution speed |

### `attract(target, opts): AttractConfig`

Pulls dots toward a point in world space.

| Parameter | Type | Description |
|---|---|---|
| `target` | `[x,y,z]` | Attraction point in world space |
| `strength` | `number` | Pull magnitude |
| `falloff` | `'inverse' \| 'linear' \| 'exponential'` | Distance falloff model (default `'inverse'`) |

```ts
// Gentle organic flow
displace(simplex3D({ scale: 3, speed: 0.2 }), { amount: 0.08 })

// Domain warp with 3 octaves
displace(domainWarp3D({ octaves: 3, scale: 2, speed: 0.1 }), { amount: 0.12 })

// Attract toward a corner
displace(attract([1, 1, 0], { strength: 0.5, falloff: 'exponential' }))
```

---

## Color

```ts
import { color, gradient, noiseColor } from '@dot-engine/core';
```

### `color(opts): ColorNode`

| Parameter | Type | Description |
|---|---|---|
| `primary` | `string` | Hex color for the interior |
| `accent` | `string` | Hex color for the exterior / far field |
| `mode` | `'depth' \| 'position' \| 'noise' \| 'uniform'` | How color is interpolated (default `'depth'`) |

Color modes:

- `depth` — mix from primary to accent based on the SDF field value
- `position` — mix based on the Y world position of each dot
- `noise` — mix based on the field value (same as depth in current implementation)
- `uniform` — use only the primary color

### `gradient(opts): GradientColorNode`

Multi-stop gradient along a world axis.

| Parameter | Type | Description |
|---|---|---|
| `axis` | `'x' \| 'y' \| 'z'` | World axis to sample along |
| `stops` | `[string, number][]` | Array of `[hexColor, position]` pairs |

```ts
gradient({
  axis: 'y',
  stops: [['#001040', -1], ['#4a9eff', 0], ['#ffffff', 1]],
})
```

### `noiseColor(opts): NoiseColorNode`

Animated noise-driven palette cycling.

| Parameter | Type | Description |
|---|---|---|
| `palette` | `string[]` | Hex colors to cycle through |
| `scale` | `number` | Noise spatial frequency |
| `speed` | `number` | Animation speed |

---

## Size and Opacity

```ts
import { size, opacity } from '@dot-engine/core';
```

### `size(opts): SizeNode`

| Parameter | Type | Description |
|---|---|---|
| `min` | `number` | Minimum dot radius in world units |
| `max` | `number` | Maximum dot radius in world units |
| `mode` | `'depth' \| 'uniform'` | Size variation mode |

If no `SizeNode` is present the compiler auto-sizes dots to approximately 40% of the grid cell
spacing.

### `opacity(opts): OpacityNode`

| Parameter | Type | Description |
|---|---|---|
| `min` | `number` | Minimum opacity |
| `max` | `number` | Maximum opacity |
| `mode` | `'depth' \| 'edgeGlow' \| 'uniform'` | Opacity variation mode |

`edgeGlow` produces brighter dots near the SDF surface boundary.

---

## Particles

```ts
import { particles, pointEmitter, surfaceEmitter, burstEmitter } from '@dot-engine/core';
```

### `particles(opts): ParticleNode`

| Parameter | Type | Description |
|---|---|---|
| `emitter` | `ParticleEmitter` | Where and how fast particles spawn |
| `lifecycle` | `ParticleLifecycle` | Lifetime and fade parameters |
| `motion` | `ParticleMotion` | Velocity, gravity, drag, turbulence |
| `maxParticles` | `number` | Pool size ceiling |

**`ParticleEmitter`**

| Field | Type | Description |
|---|---|---|
| `type` | `'point' \| 'surface' \| 'volume'` | Spawn strategy |
| `position` | `[x,y,z]` | Origin (point emitter) |
| `rate` | `number` | Particles per second |
| `burst` | `number` | One-shot burst count |

**`ParticleLifecycle`**

| Field | Type | Description |
|---|---|---|
| `lifetime` | `number` | Seconds before a particle dies |
| `fadeIn` | `number` | Seconds to fade in |
| `fadeOut` | `number` | Seconds to fade out before death |

**`ParticleMotion`**

| Field | Type | Description |
|---|---|---|
| `velocity` | `[x,y,z]` | Base velocity direction |
| `speed` | `number` | Speed magnitude |
| `spread` | `number` | 0 = focused, 1 = omnidirectional |
| `gravity` | `[x,y,z]` | Constant acceleration |
| `drag` | `number` | Velocity damping per second |
| `turbulence` | `number` | Sinusoidal position jitter |

Convenience emitter builders:

```ts
pointEmitter([0, 0, 0], 20)      // 20 particles/sec from origin
surfaceEmitter(30)                // 30 particles/sec from random surface positions
burstEmitter([0, 0, 0], 200)     // one-time burst of 200 particles
```

---

## Presets

```ts
import { presets, definePreset } from '@dot-engine/core';

// Three built-in presets
const f = presets.crystal;   // smooth union of box + sphere, blue-white depth color
const f = presets.organic;   // sphere + torus, green-terracotta, simplex + flow displacement
const f = presets.minimal;   // plain sphere, grey, slow animation
```

### `definePreset(config: PresetConfig): FieldRoot`

Convenience wrapper that builds a complete field from a short config object.

| Field | Type | Description |
|---|---|---|
| `shape` | `SdfNode` | Root SDF node |
| `grid` | `{ type, resolution }` | Grid config (default 30³) |
| `color` | `{ primary, accent, mode? }` | Color config |
| `displace` | `{ noise, amount? }[]` | Array of displacement layers |
| `animate` | `{ speed }` | Animation speed |

---

## CPU Evaluator

```ts
import { evaluateSdf } from '@dot-engine/core';

const d = evaluateSdf(sphere(0.5), [0.3, 0, 0]);
// d < 0 means inside the sphere
```

`evaluateSdf(node: SdfNode, p: [x,y,z]): number`

Evaluates any SDF node tree on the CPU. Useful for testing, export, and debugging.

Limitations:

- `textureSdf` — GPU-only, throws at runtime
- `customSdf` — GLSL injection only, throws at runtime
- `fromField2D` — not implemented, throws at runtime

---

## Serialization

```ts
import { toJSON, fromJSON } from '@dot-engine/core';

const json = toJSON(myField);             // -> JSON string
const restored = fromJSON<FieldRoot>(json); // fresh node IDs assigned
```

`fromJSON` reassigns all node IDs to avoid collisions when multiple deserialized fields are
active simultaneously. The type parameter `T` is a cast — validate the shape yourself if
loading from untrusted sources.

---

## ImageField

```ts
import { imageField } from '@dot-engine/core';

// Used internally by @dot-engine/brand and @dot-engine/renderer
const node = imageField(textureId, { mode: 'brightness', threshold: 0.2, depth: 0.1 });
```

`ImageFieldNode` makes dots visible only where an image (or video frame) meets a brightness
or alpha threshold. The actual texture is bound at render time via `DotField`'s `imageTextures`
prop.

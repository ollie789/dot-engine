# @dot-engine/brand

Brand identity layer for dot-engine. Wraps the core DAG API with brand-level concepts:
logo import, personality mapping, motion styles, brand contexts, particles, and data
visualization.

```bash
npm install @dot-engine/brand
```

Peer dependencies: `@dot-engine/renderer`, `react`, `three`, `@react-three/fiber`.

---

## `defineBrand(config: BrandConfig): Promise<Brand>`

The main entry point. Returns a `Brand` object that can generate a `FieldRoot` for any
context with `brand.field()`.

```ts
import { defineBrand, text } from '@dot-engine/brand';

const brand = await defineBrand({
  name: 'Acme Corp',
  logo: text('ACME'),
  colors: {
    primary: '#4a9eff',
    accent: '#ff6b4a',
    background: '#06060a',
  },
  personality: { energy: 0.6, organic: 0.7, density: 0.5 },
  motion: { style: 'flow', speed: 0.4 },
});
```

### `BrandConfig`

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Optional brand name (metadata only) |
| `logo` | `LogoInput` | Logo source — see Logo import below |
| `colors.primary` | `string` | Primary hex color |
| `colors.accent` | `string` | Accent hex color |
| `colors.background` | `string` | Canvas background hex color |
| `personality` | `PersonalityTraits` | Energy, organic, density 0–1 each |
| `motion.style` | `MotionStyle` | `'flow' \| 'breathe' \| 'pulse' \| 'none'` |
| `motion.speed` | `number` | Base speed multiplier |

### `Brand`

The resolved brand object returned by `defineBrand`.

| Member | Type | Description |
|---|---|---|
| `config` | `BrandConfig` | Original config |
| `logo` | `ProcessedLogo` | Processed logo data (SDF texture, aspect ratio) |
| `field(context?, options?)` | `FieldRoot` | Generate a field for the given context |
| `particles(mode)` | `ParticleNode \| null` | Generate a particle node |

---

## Logo import

### `svg(source: string): SvgInput`

Import an SVG from a URL or inline SVG string.

```ts
import { svg } from '@dot-engine/brand';
logo: svg('/logo.svg')
logo: svg('<svg>...</svg>')
```

### `image(source: string): ImageInput`

Import a raster image from a URL.

```ts
import { image } from '@dot-engine/brand';
logo: image('/logo.png')
```

### `text(text: string, opts?): TextInput`

Render text as a logo using a 2D canvas.

```ts
import { text } from '@dot-engine/brand';
logo: text('ACME')
logo: text('ACME', { font: 'Georgia', weight: 700 })
```

| Option | Type | Default | Description |
|---|---|---|---|
| `font` | `string` | system sans-serif | Font family name |
| `weight` | `number` | `700` | Font weight |

### `importLogo(input: LogoInput, opts?): Promise<ProcessedLogo>`

Low-level logo import — used internally by `defineBrand`.

| Option | Type | Default | Description |
|---|---|---|---|
| `resolution` | `number` | `256` | SDF texture resolution |
| `depth` | `number` | `0.1` | SDF extrusion depth |

---

## Personality system

Three parameters in `[0, 1]` jointly control every physical parameter of the dot field:

| Trait | Effect |
|---|---|
| `energy` | Animation speed, displacement amount. Low = still and precise; high = fast and chaotic. |
| `organic` | Edge softness, whether curl (flow field) noise is used. Low = sharp, mechanical; high = soft, fluid. |
| `density` | Grid resolution. Low = sparse, visible dots; high = dense, fills the form. |

These map to:

| Derived param | Formula |
|---|---|
| `animateSpeed` | `lerp(0.05, 0.8, energy)` |
| `displacementAmount` | `lerp(0.02, 0.15, energy)` |
| `edgeSoftness` | `lerp(0.02, 0.1, organic)` |
| `useFlowField` | `organic > 0.5` |
| `gridResolution` | `round(lerp(20, 60, density))` |

---

## Motion styles

| Style | Displacement used | Character |
|---|---|---|
| `flow` | Simplex3D + optional FlowField3D (curl noise) | Smooth, continuous, organic |
| `breathe` | Slow simplex3D (0.5× amount, 0.2× speed) | Slow, gentle, inhale/exhale |
| `pulse` | Fast simplex3D (1.2× amount, 2× speed) | Sharp, rhythmic, electric |
| `none` | No displacement | Static, frozen |

The flow field is included only when `organic > 0.5` (controlled by `useFlowField`).

---

## Brand contexts

`brand.field(context, options?)` returns a `FieldRoot` tuned for the given display context.

| Context | Description |
|---|---|
| `logo` | Square or aspect-ratio-correct logo lockup. Thin Z depth. |
| `hero` | Full-bleed widescreen version. Deeper Z, slower motion. |
| `loading` | Compact, looping breathing animation. Forces `breathe` style. |
| `banner` | Very wide aspect (4:1+). Reduced displacement for readability. |
| `data` | Data visualization — add `DataPoint[]` via `options.data`. |
| `transition` | Cross-fade between two contexts. Use with `BrandMoment`. |

### `ContextOptions`

| Option | Type | Description |
|---|---|---|
| `width` | `number` | Output width hint |
| `height` | `number` | Output height hint |
| `canvasAspect` | `number` | Canvas width/height ratio for grid adaptation |
| `data` | `DataPoint[]` | Data points for `data` context |
| `from` | `BrandContext` | Source context for transition |
| `to` | `BrandContext` | Target context for transition |
| `progress` | `number` | Transition progress 0–1 |
| `twist` | `number` | SDF twist transform amount |
| `bend` | `number` | SDF bend transform amount |
| `mirrorX` | `boolean` | Mirror SDF across X axis |
| `mirrorY` | `boolean` | Mirror SDF across Y axis |
| `dotSizeMin` | `number` | Override minimum dot radius |
| `dotSizeMax` | `number` | Override maximum dot radius |
| `edgeSoftness` | `number` | Override edge softness |

```ts
// Hero context adapted to a 16:9 canvas
const heroField = brand.field('hero', { canvasAspect: 16 / 9 });

// Banner
const bannerField = brand.field('banner');

// Transition from logo to hero at 40%
const transField = brand.field('transition', {
  from: 'logo', to: 'hero', progress: 0.4
});
```

---

## `<BrandMoment>`

React component that renders a brand at a context. Handles the transition cross-fade internally.

```tsx
import { BrandMoment } from '@dot-engine/brand';

<BrandMoment
  brand={brand}
  context="logo"
  options={{ canvasAspect: 2 }}
  interactive={true}
/>
```

**Props** (`BrandMomentProps`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `brand` | `Brand` | required | Brand object from `defineBrand` |
| `context` | `BrandContext` | `'logo'` | Display context |
| `options` | `ContextOptions` | — | Context options |
| `lod` | `'auto' \| LodOverride` | `'auto'` | LOD tier |
| `className` | `string` | — | CSS class on the wrapper |
| `style` | `React.CSSProperties` | — | Inline styles |
| `interactive` | `boolean` | `true` | Enable OrbitControls |

For `context="transition"`, `BrandMoment` renders two overlaid `DotFieldCanvas` instances
and drives their opacity from `options.progress`.

---

## Particles

### `buildParticles(mode, config, params): ParticleNode | null`

Builds a `ParticleNode` tuned to the brand's personality.

```ts
const particleNode = brand.particles('rising');
// returns null for mode 'none'
```

### `ParticleMode`

| Mode | Description |
|---|---|
| `none` | No particles |
| `ambient` | Low-rate drift particles from origin, long lifetime |
| `burst` | One-shot burst of fast particles with gravity |
| `rising` | Continuous upward stream from the bottom |
| `edges` | Surface-emitting particles that drift outward |

### `particlePresets`

Pre-built particle nodes using neutral default brand parameters:

```ts
import { particlePresets } from '@dot-engine/brand';

particlePresets.ambientDrift  // ambient mode
particlePresets.burst         // burst mode
particlePresets.rising        // rising mode
particlePresets.edges         // edges mode
```

---

## Data visualization

The `data` context places `attract` displacement nodes at each data point, pulling the dot
field toward high-value regions.

### `DataPoint`

| Field | Type | Description |
|---|---|---|
| `position` | `[x,y,z]` | Normalized position in [0,1]³, mapped to world [-1,1]³ |
| `value` | `number` | Influence strength (0–1 recommended) |
| `radius` | `number` | Unused in current implementation (reserved) |
| `category` | `string` | Unused in current implementation (reserved) |

```ts
const dataField = brand.field('data', {
  data: [
    { position: [0.5, 0.8, 0.5], value: 0.9 },
    { position: [0.2, 0.3, 0.5], value: 0.4 },
    { position: [0.8, 0.6, 0.5], value: 0.7 },
  ],
});
```

Up to 16 data points are processed. Each creates an `attract` displacement with `falloff: 'inverse'`.

---

## Image field utilities

```ts
import { loadImageForField, grabVideoFrame } from '@dot-engine/brand';
```

### `loadImageForField(source, resolution?): Promise<ImageFieldData>`

Loads an image URL into a `Float32Array` of RGBA pixels. Browser-only (uses `HTMLImageElement`
and `CanvasRenderingContext2D`).

| Parameter | Type | Default | Description |
|---|---|---|---|
| `source` | `string` | required | Image URL |
| `resolution` | `number` | `256` | Output texture width in pixels |

### `grabVideoFrame(video, resolution?): ImageFieldData`

Captures one frame from an `HTMLVideoElement` into a `Float32Array`. Browser-only.

### `ImageFieldData`

| Field | Type | Description |
|---|---|---|
| `pixels` | `Float32Array` | RGBA data in [0,1] range |
| `width` | `number` | Pixel width |
| `height` | `number` | Pixel height |
| `textureId` | `string` | Unique ID for texture binding |

---

## Switching contexts

```tsx
import { useState } from 'react';
import { BrandMoment } from '@dot-engine/brand';

function BrandDisplay({ brand }) {
  const [ctx, setCtx] = useState('logo');

  return (
    <div style={{ width: 800, height: 400 }}>
      <BrandMoment brand={brand} context={ctx} />
      <button onClick={() => setCtx('hero')}>Hero</button>
      <button onClick={() => setCtx('loading')}>Loading</button>
    </div>
  );
}
```

For animated transitions, manage a `progress` state and pass `context="transition"`:

```tsx
<BrandMoment
  brand={brand}
  context="transition"
  options={{ from: 'logo', to: 'hero', progress }}
/>
```

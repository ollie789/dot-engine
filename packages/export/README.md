# @dot-engine/export

Static asset export for dot-engine. Outputs a dot field as an SVG or PNG file.

```bash
npm install @dot-engine/export
```

---

## `exportSVG(fieldRoot, options): SVGResult`

Evaluates the dot field entirely on the CPU and produces an SVG string of `<circle>` elements.
Works in any JavaScript environment — no GPU or browser required.

```ts
import { exportSVG } from '@dot-engine/export';
import { presets } from '@dot-engine/core';

const { svg, dotCount } = exportSVG(presets.organic, {
  width: 1200,
  height: 600,
  background: '#06060a',
  dotRadius: 4,
  camera: { position: [0, 0, 3], fov: 60 },
});

// Write svg string to a file, embed in HTML, etc.
console.log(`Exported ${dotCount} dots`);
```

### `ExportSVGOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | required | Output width in pixels |
| `height` | `number` | required | Output height in pixels |
| `background` | `string` | none | Optional background rect fill color |
| `dotRadius` | `number` | `3` | Base dot radius before perspective scaling |
| `camera.position` | `[x,y,z]` | `[0,0,3]` | Camera position looking toward origin |
| `camera.fov` | `number` | `60` | Camera vertical field-of-view in degrees |

### `SVGResult`

| Field | Type | Description |
|---|---|---|
| `svg` | `string` | Complete SVG markup |
| `dotCount` | `number` | Number of dots rendered |

### Notes

- Only dots with SDF value `< 0` (inside the shape) are included.
- Dots are depth-sorted back-to-front using the painter's algorithm.
- Dot color is mixed between `primary` and `accent` based on the absolute SDF value.
- Dot size scales with perspective depth (`projected.scale`).
- `textureSdf`, `customSdf`, and `fromField2D` nodes throw when `evaluateSdf` is called on
  them. SVG export works with all other SDF primitives, booleans, and transforms.
- `AnimateNode` and `DisplaceNode` are ignored — the export captures a static snapshot at
  `t = 0`.

---

## `exportPNG(fieldRoot, options): Promise<Blob>`

Renders the dot field to a PNG using an offscreen WebGL context. Browser-only.

```ts
import { exportPNG } from '@dot-engine/export';
import { presets } from '@dot-engine/core';

const blob = await exportPNG(presets.crystal, {
  width: 1920,
  height: 1080,
  background: '#06060a',
});

// Download in browser
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'logo.png';
a.click();
```

### `ExportPNGOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | required | Output width in pixels |
| `height` | `number` | required | Output height in pixels |
| `background` | `string` | `'#000000'` | Background color |

### Notes

- Requires a browser environment with WebGL2 support.
- Creates and immediately disposes an offscreen `THREE.WebGLRenderer`.
- Renders a single frame at `uTime = 0` (no animation).
- Returns a `Blob` of type `image/png`.
- `textureSdf` nodes require the corresponding `DataTexture` uniforms to be bound — the
  current implementation does not support binding external textures. For logo/brand exports
  use `@dot-engine/brand` and capture the canvas directly.

---

## Combining SVG export with brand

```ts
import { defineBrand, text } from '@dot-engine/brand';
import { exportSVG } from '@dot-engine/export';

const brand = await defineBrand({
  logo: text('ACME'),
  colors: { primary: '#4a9eff', accent: '#ff6b4a' },
  personality: { energy: 0.4, organic: 0.6, density: 0.6 },
  motion: { style: 'none', speed: 0 },
});

// Note: textureSdf (used by brand logos) is GPU-only.
// For SVG/CPU export, use a geometric SDF instead:
import { exportSVG } from '@dot-engine/export';
import { presets } from '@dot-engine/core';

const { svg } = exportSVG(presets.minimal, {
  width: 800,
  height: 400,
  background: '#06060a',
});
```

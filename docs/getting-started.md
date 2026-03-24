# Getting started

This guide walks through building a complete dot-engine integration from scratch, step by step.

---

## 1. Install packages

Install the packages you need. For a full brand integration:

```bash
npm install @dot-engine/core @dot-engine/renderer @dot-engine/brand
```

For asset export:

```bash
npm install @dot-engine/export
```

Peer dependencies:

```bash
npm install react react-dom three @react-three/fiber @react-three/drei
```

---

## 2. Define your first brand

Call `defineBrand()` with your logo as text, your brand colors, and personality parameters.
The function is async because it rasterizes the logo through a canvas pipeline.

```ts
// brand.ts
import { defineBrand, text } from '@dot-engine/brand';

export const brand = await defineBrand({
  name: 'Acme Corp',
  logo: text('ACME'),
  colors: {
    primary: '#4a9eff',
    accent: '#ff6b4a',
    background: '#06060a',
  },
  personality: {
    energy: 0.6,    // 0 = still and precise, 1 = fast and chaotic
    organic: 0.7,   // 0 = sharp and mechanical, 1 = soft and fluid
    density: 0.5,   // 0 = sparse visible dots, 1 = dense packed field
  },
  motion: {
    style: 'flow',  // 'flow' | 'breathe' | 'pulse' | 'none'
    speed: 0.4,
  },
});
```

> If you are in a React component tree, call `defineBrand` once at module scope or inside
> `useEffect`, then pass the resolved `Brand` object down as a prop or context value.

---

## 3. Render with BrandMoment

`BrandMoment` is the simplest way to display a brand. It renders the correct context field
inside a full-canvas WebGL scene.

```tsx
// App.tsx
import { brand } from './brand';
import { BrandMoment } from '@dot-engine/brand';

export function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <BrandMoment brand={brand} context="logo" />
    </div>
  );
}
```

The canvas fills its parent container. Give the parent explicit dimensions.

---

## 4. Switch contexts

Different contexts produce different field configurations from the same brand definition.
Pass `context` as a prop to `BrandMoment`:

```tsx
import { useState } from 'react';
import { BrandMoment } from '@dot-engine/brand';
import type { BrandContext } from '@dot-engine/brand';

const CONTEXTS: BrandContext[] = ['logo', 'hero', 'loading', 'banner'];

export function BrandExplorer({ brand }) {
  const [ctx, setCtx] = useState<BrandContext>('logo');

  return (
    <div>
      <div style={{ width: 800, height: 400 }}>
        <BrandMoment brand={brand} context={ctx} />
      </div>
      <div>
        {CONTEXTS.map(c => (
          <button key={c} onClick={() => setCtx(c)}>{c}</button>
        ))}
      </div>
    </div>
  );
}
```

For animated cross-fades, use `context="transition"` with a progress value:

```tsx
import { useState, useEffect } from 'react';
import { BrandMoment } from '@dot-engine/brand';

export function TransitionDemo({ brand }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= 1) { clearInterval(id); return 1; }
        return p + 0.01;
      });
    }, 16);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ width: 800, height: 450 }}>
      <BrandMoment
        brand={brand}
        context="transition"
        options={{ from: 'logo', to: 'hero', progress }}
      />
    </div>
  );
}
```

---

## 5. Add particles

Particles are rendered as a second instanced mesh alongside the dot field. Use `brand.particles()`
to generate a `ParticleNode` tuned to your brand, then render it with `<ParticleSystem>`.

```tsx
import { Canvas } from '@react-three/fiber';
import { DotField, ParticleSystem } from '@dot-engine/renderer';

export function BrandWithParticles({ brand }) {
  const field = brand.field('logo');
  const particleNode = brand.particles('rising'); // or 'ambient' | 'burst' | 'edges'

  return (
    <div style={{ width: 800, height: 400 }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <DotField
          field={field}
          colorPrimary={brand.config.colors.primary}
          colorAccent={brand.config.colors.accent}
        />
        {particleNode && (
          <ParticleSystem
            config={particleNode}
            color={brand.config.colors.accent}
            size={0.012}
          />
        )}
      </Canvas>
    </div>
  );
}
```

---

## 6. Upload an image

Replace `text()` with `image()` in your brand config to use a raster logo:

```ts
import { defineBrand, image } from '@dot-engine/brand';

const brand = await defineBrand({
  logo: image('/logo.png'),
  colors: { primary: '#ffffff', accent: '#aaaaaa', background: '#000000' },
  personality: { energy: 0.4, organic: 0.5, density: 0.6 },
  motion: { style: 'breathe', speed: 0.3 },
});
```

For SVG logos:

```ts
import { defineBrand, svg } from '@dot-engine/brand';

const brand = await defineBrand({
  logo: svg('/logo.svg'),
  // ...
});
```

The logo is rasterized to a signed distance field texture at import time. The SDF drives
which grid dots are visible — dots appear inside the logo shape.

---

## 7. Export assets

### SVG (CPU, any environment)

```ts
import { presets } from '@dot-engine/core';
import { exportSVG } from '@dot-engine/export';

const { svg, dotCount } = exportSVG(presets.minimal, {
  width: 1200,
  height: 600,
  background: '#06060a',
  dotRadius: 4,
});

// Node.js: write to file
import { writeFileSync } from 'fs';
writeFileSync('output.svg', svg);

// Browser: trigger download
const blob = new Blob([svg], { type: 'image/svg+xml' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = 'logo.svg'; a.click();
```

### PNG (browser only)

```ts
import { exportPNG } from '@dot-engine/export';
import { presets } from '@dot-engine/core';

const blob = await exportPNG(presets.crystal, {
  width: 1920,
  height: 1080,
  background: '#06060a',
});

const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = 'logo.png'; a.click();
```

### JSON serialization

```ts
import { toJSON, fromJSON } from '@dot-engine/core';
import type { FieldRoot } from '@dot-engine/core';

const json = toJSON(myField);
const restored = fromJSON<FieldRoot>(json); // fresh node IDs assigned
```

---

## 8. Customize with the configurator

The configurator is the fastest way to explore vibes and dial in parameters visually.

```bash
pnpm --filter @dot-engine/configurator dev
```

1. Select a vibe from the left panel (Minimal, Cosmic, Neon, Glitch, etc.)
2. Adjust the intensity slider to scale up or down the energy of the vibe
3. Pick a format preset (Logo 1:1, Hero 16:9, Story 9:16, etc.) to preview at the right aspect ratio
4. Open Advanced controls to fine-tune motion style, particle mode, dot size, twist, and bend
5. Export as PNG, SVG, or JSON

Once you have a look you like, copy the parameter values into your `defineBrand()` call.

---

## Next steps

- [Core package reference](../packages/core/README.md) — SDF primitives, booleans, transforms,
  displacement, color
- [Renderer package reference](../packages/renderer/README.md) — `DotField`, `DotFieldCanvas`,
  LOD, hooks
- [Brand package reference](../packages/brand/README.md) — `defineBrand`, contexts, particles,
  data viz
- [Export package reference](../packages/export/README.md) — SVG, PNG
- [Full API reference](api-reference.md)

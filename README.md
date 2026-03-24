# dot-engine

A 3D dot-field branding engine. Turn any logo, text, or image into a living, breathing dot field.

dot-engine compiles a declarative DAG of SDF primitives, displacement noise, and color nodes into
instanced WebGL shaders. You get thousands of animated 3D dots that respond to your brand's
personality, motion style, and context — logo lockup, hero section, loading indicator, banner,
data visualization — all from a single `defineBrand()` call.

---

## Quick start

```bash
npm install @dot-engine/core @dot-engine/renderer @dot-engine/brand
```

```tsx
import { defineBrand, BrandMoment, text } from '@dot-engine/brand';

const brand = await defineBrand({
  logo: text('ACME'),
  colors: { primary: '#4a9eff', accent: '#ff6b4a', background: '#06060a' },
  personality: { energy: 0.6, organic: 0.7, density: 0.5 },
  motion: { style: 'flow', speed: 0.4 },
});

export function App() {
  return (
    <div style={{ width: 800, height: 400 }}>
      <BrandMoment brand={brand} context="logo" />
    </div>
  );
}
```

---

## Packages

| Package | Description | Install |
|---|---|---|
| `@dot-engine/core` | Pure TypeScript DAG authoring API — zero dependencies | `npm i @dot-engine/core` |
| `@dot-engine/renderer` | React Three Fiber rendering layer, compiles DAG to GLSL | `npm i @dot-engine/renderer` |
| `@dot-engine/brand` | Brand identity layer — `defineBrand`, `BrandMoment`, contexts | `npm i @dot-engine/brand` |
| `@dot-engine/export` | Export to SVG or PNG | `npm i @dot-engine/export` |
| `@dot-engine/configurator` | Visual brand configurator (private, dev only) | — |

---

## Features

**Declarative SDF composition** — Build complex 3D shapes by combining sphere, box, torus,
cylinder, capsule, cone, metaball, and more with boolean operations (union, subtract, intersect)
and smooth blending variants.

**GLSL compilation** — The DAG compiles directly to vertex shader GLSL (or WGSL for WebGPU).
No intermediate representation, no runtime interpreter — the shape evaluates entirely on the GPU.

**Brand personality system** — Three parameters (`energy`, `organic`, `density`) drive animation
speed, displacement amount, edge softness, flow field usage, and grid resolution automatically.

**Motion styles** — `flow` (curl noise), `breathe` (slow simplex), `pulse` (fast simplex),
`none`. Each style generates appropriate displacement nodes.

**Brand contexts** — Render the same brand at any context: `logo`, `hero`, `loading`, `banner`,
`data`, `transition`. Each context tunes grid resolution, bounds, and motion intensity for the
use case.

**Particle system** — Five particle modes (`ambient`, `burst`, `rising`, `edges`, `none`)
built from the `ParticleNode` graph layer, rendered with a pooled instanced mesh.

**Image and video fields** — Map any image or live video through brightness or alpha into a
dot density field. Dots show where the image is bright or opaque.

**Data visualization** — Pass `DataPoint[]` to the `data` context and each point creates an
`attract` displacement node that pulls dots toward high-value regions.

**LOD system** — Automatic tier detection (high / medium / low) based on GPU capability.
Flow field nodes are stripped at medium and low tiers. Override with an explicit `LodOverride`.

**Serialization** — `toJSON` / `fromJSON` roundtrip for any node or field root. Safe to store
field descriptions in databases or pass over APIs (note: strip `customSdf` nodes from untrusted
sources before compilation).

**SVG export** — CPU-side SDF evaluation with perspective projection outputs a flat SVG of
circles. Works anywhere, no GPU required.

**PNG export** — Offscreen WebGL render to a `Blob`. Browser-only.

---

## What it looks like

A dot-engine render is a dense 3D cloud of small spherical dots. Dots exist only inside the
SDF surface — the shape is implicit. Displacement noise makes them breathe and flow. Color
transitions from the primary hue at the surface interior to the accent hue toward the edges.
The background is dark, usually near black, so the glowing dots read like bioluminescent
particles suspended in space.

At `context="logo"` the dot field resolves into readable letterforms or logo geometry.
At `context="hero"` it expands to fill a widescreen viewport with a looser, more atmospheric
version. At `context="loading"` it pulses with a breathing rhythm.

---

## Documentation

- [Getting started tutorial](docs/getting-started.md)
- [Full API reference](docs/api-reference.md)
- [Core package](packages/core/README.md)
- [Renderer package](packages/renderer/README.md)
- [Brand package](packages/brand/README.md)
- [Export package](packages/export/README.md)
- [Configurator](packages/configurator/README.md)

# @dot-engine/renderer

React Three Fiber rendering layer for dot-engine. Compiles a `FieldRoot` DAG to GLSL vertex and
fragment shaders and renders thousands of instanced 3D dots.

```bash
npm install @dot-engine/renderer
```

Peer dependencies: `react`, `react-dom`, `three`, `@react-three/fiber`.

---

## Components

### `<DotField>`

The core rendering primitive. Must be placed inside a React Three Fiber `<Canvas>`.

```tsx
import { Canvas } from '@react-three/fiber';
import { DotField } from '@dot-engine/renderer';
import { presets } from '@dot-engine/core';

export function Scene() {
  return (
    <Canvas>
      <DotField field={presets.organic} />
    </Canvas>
  );
}
```

**Props** (`DotFieldProps`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `field` | `FieldRoot` | required | Compiled field DAG |
| `colorPrimary` | `string` | `'#4a9eff'` | Hex primary color override |
| `colorAccent` | `string` | `'#ff6b4a'` | Hex accent color override |
| `lod` | `'auto' \| LodOverride` | `'auto'` | LOD tier selection |
| `backend` | `'auto' \| 'webgl2' \| 'webgpu'` | `'auto'` | Rendering backend |
| `pointerPosition` | `{ x: number; y: number }` | — | NDC pointer position for repulsion |
| `pointerStrength` | `number` | `0` | Pointer repulsion strength 0–1 |
| `textures` | `Record<string, { texture, depth, aspectRatio }>` | — | `DataTexture` bindings for `textureSdf` nodes, keyed by `textureId` |
| `imageTextures` | `Record<string, THREE.Texture>` | — | Texture bindings for `imageField` nodes, keyed by `textureId` |

Color props are passed as GLSL uniforms. They override the colors embedded in `ColorNode` —
if you want the field's own colors to show, omit these props or pass the same hex values.

---

### `<DotFieldCanvas>`

Batteries-included wrapper. Creates a `<Canvas>`, mounts a `<DotField>`, and optionally adds
`<OrbitControls>`.

```tsx
import { DotFieldCanvas } from '@dot-engine/renderer';
import { presets } from '@dot-engine/core';

export function App() {
  return (
    <div style={{ width: 800, height: 600 }}>
      <DotFieldCanvas
        field={presets.crystal}
        background="#06060a"
        controls={true}
      />
    </div>
  );
}
```

**Props** (`DotFieldCanvasProps`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `field` | `FieldRoot` | required | Field DAG to render |
| `colorPrimary` | `string` | — | Forwarded to `DotField` |
| `colorAccent` | `string` | — | Forwarded to `DotField` |
| `lod` | `'auto' \| LodOverride` | `'auto'` | Forwarded to `DotField` |
| `background` | `string` | `'#0a0a0a'` | Canvas background color |
| `className` | `string` | — | CSS class on the wrapper div |
| `style` | `React.CSSProperties` | — | Inline styles on the wrapper div |
| `controls` | `boolean` | `true` | Mount OrbitControls |
| `camera` | `{ position?, fov? }` | `[0,0,3], 50` | Initial camera |

---

### `<ParticleSystem>`

Renders a `ParticleNode` as a separate instanced mesh alongside a dot field.

```tsx
import { Canvas } from '@react-three/fiber';
import { DotField, ParticleSystem } from '@dot-engine/renderer';
import { presets } from '@dot-engine/core';
import { particlePresets } from '@dot-engine/brand';

export function Scene() {
  return (
    <Canvas>
      <DotField field={presets.organic} />
      <ParticleSystem config={particlePresets.rising} color="#4a9eff" size={0.015} />
    </Canvas>
  );
}
```

**Props** (`ParticleSystemProps`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `config` | `ParticleNode` | required | Particle emitter, lifecycle, and motion config |
| `color` | `string` | `'#4a9eff'` | Particle color |
| `size` | `number` | `0.015` | Base radius of each particle |

The system uses a CPU-side pooled Float32Array (`createParticlePool`, `updateParticlePool`)
updated every frame in a `useFrame` callback.

---

### `<VideoField>`

Renders a live video stream as a dot field. Dots appear where the video frame is bright
(brightness mode) or opaque (alpha mode).

```tsx
import { Canvas } from '@react-three/fiber';
import { VideoField } from '@dot-engine/renderer';
import { field, grid, animate } from '@dot-engine/core';

const baseField = field(
  grid({ type: 'uniform', resolution: [80, 60, 4] }),
  animate({ speed: 0.3 }),
);

export function Scene() {
  return (
    <Canvas>
      <VideoField src="/promo.mp4" field={baseField} colorPrimary="#00ff88" />
    </Canvas>
  );
}
```

**Props** (`VideoFieldProps`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | required | Video URL |
| `field` | `FieldRoot` | required | Base field (grid + animate, no shape needed) |
| `resolution` | `number` | `128` | Internal texture resolution |
| `colorPrimary` | `string` | — | Forwarded to `DotField` |
| `colorAccent` | `string` | — | Forwarded to `DotField` |
| `lod` | `'auto' \| LodOverride` | `'auto'` | LOD tier |

`VideoField` internally attaches a `THREE.VideoTexture` and an `imageField` node to the base
field. The video plays muted and looped.

---

## Shader compilation

### `compileField(root: FieldRoot): CompiledField`

Compiles a `FieldRoot` to GLSL vertex + fragment shader source strings.

```ts
import { compileField } from '@dot-engine/renderer';
import { presets } from '@dot-engine/core';

const { vertexShader, fragmentShader, resolution, bounds, totalDots, extraUniforms }
  = compileField(presets.crystal);
```

**`CompiledField`**

| Field | Type | Description |
|---|---|---|
| `vertexShader` | `string` | GLSL vertex shader source |
| `fragmentShader` | `string` | GLSL fragment shader source |
| `resolution` | `[number, number, number]` | Dot grid resolution |
| `bounds` | `[number, number, number]` | World-space extents |
| `totalDots` | `number` | `resolution[0] * resolution[1] * resolution[2]` |
| `extraUniforms` | `Record<string, ExtraUniform>` | Additional uniforms (texture SDF bindings) |

The field must contain a `ShapeNode` and a `GridNode` child or compilation throws.

### `compileFieldWgsl(root: FieldRoot): CompiledWgslField`

Compiles to WGSL (WebGPU Shading Language). The WebGPU runtime path is not yet fully
implemented — the compiled shaders are complete but `DotField` falls back to WebGL2.

---

## LOD system

`computeLodTier(frameMs, benchDots, override?): LodTier`

| LOD tier | Max dots | Dot geometry | Flow field |
|---|---|---|---|
| `high` | 300,000 | 80 triangles/dot (icosahedron level 2) | enabled |
| `medium` | 100,000 | 20 triangles/dot (icosahedron level 1) | disabled |
| `low` | 1,000+ | 8 triangles/dot (icosahedron level 0) | disabled |

`DotField` auto-detects tier at mount time using pixel ratio and `maxTextureSize`:
- High-DPI display (`pixelRatio >= 2`) with large textures (`>= 8192`) → `high`
- High-DPI display with smaller textures (`<= 4096`) → `low`
- Otherwise → `medium`

Manual override via the `lod` prop:

```tsx
<DotField
  field={f}
  lod={{ dots: 50000, quality: 'medium' }}
/>
```

**`LodOverride`**

| Field | Type | Description |
|---|---|---|
| `dots` | `number` | Maximum dot count |
| `quality` | `'high' \| 'medium' \| 'low'` | Geometry and shader complexity tier |

---

## Hooks

All hooks must be called inside a React Three Fiber `<Canvas>`.

### `usePointerInfluence(options?): PointerInfluence`

Tracks the pointer position over the canvas in NDC coordinates with exponential smoothing.

```tsx
import { usePointerInfluence } from '@dot-engine/renderer';

function Scene({ field }) {
  const pointer = usePointerInfluence({ smoothing: 0.85 });
  return (
    <DotField
      field={field}
      pointerPosition={pointer.position}
      pointerStrength={0.3}
    />
  );
}
```

**Options** (`PointerInfluenceOptions`)

| Option | Type | Default | Description |
|---|---|---|---|
| `smoothing` | `number` | `0.85` | Exponential smoothing factor 0–1 |
| `enabled` | `boolean` | `true` | Whether to track pointer events |

**Returns** (`PointerInfluence`)

| Field | Type | Description |
|---|---|---|
| `position` | `THREE.Vector2` | Smoothed NDC position, updated each frame |
| `isOver` | `React.RefObject<boolean>` | Whether pointer is over the canvas |

---

### `useScrollInfluence(options?): ScrollInfluence`

Tracks the scroll position of the window (or a custom element) as a normalized 0–1 progress
value with exponential smoothing.

```tsx
import { useScrollInfluence } from '@dot-engine/renderer';
import { useFrame } from '@react-three/fiber';

function Scene({ field }) {
  const scroll = useScrollInfluence({ smoothing: 0.9 });
  useFrame(() => {
    // use scroll.progress.current to drive uniforms
  });
  return <DotField field={field} />;
}
```

**Options** (`ScrollInfluenceOptions`)

| Option | Type | Default | Description |
|---|---|---|---|
| `target` | `HTMLElement \| null` | `window` | Element to track |
| `range` | `number` | document height | Pixel range that maps to 0–1 |
| `offset` | `number` | `0` | Pixel offset before scroll begins |
| `smoothing` | `number` | `0.9` | Exponential smoothing factor |
| `enabled` | `boolean` | `true` | Whether to listen for scroll events |

**Returns** (`ScrollInfluence`)

| Field | Type | Description |
|---|---|---|
| `progress` | `RefObject<number>` | Smoothed scroll progress 0–1 |
| `scrollY` | `RefObject<number>` | Raw scroll position in pixels |

---

### `useSpring3D(options?): Spring3D`

Critically-damped spring for smooth 3D position interpolation.

```tsx
import { useSpring3D } from '@dot-engine/renderer';

function Scene() {
  const spring = useSpring3D({ stiffness: 120, damping: 14 });

  const handleClick = (e) => {
    spring.setTarget(e.point.x, e.point.y, e.point.z);
  };

  // Use spring.position in a useFrame callback
  return <mesh onClick={handleClick} />;
}
```

**Options** (`Spring3DOptions`)

| Option | Type | Default | Description |
|---|---|---|---|
| `stiffness` | `number` | `120` | Spring stiffness constant |
| `damping` | `number` | `14` | Damping coefficient |
| `initial` | `[x,y,z]` | `[0,0,0]` | Initial position |
| `enabled` | `boolean` | `true` | Whether the spring simulates |

**Returns** (`Spring3D`)

| Field | Type | Description |
|---|---|---|
| `position` | `THREE.Vector3` | Current spring position, updated each frame |
| `velocity` | `THREE.Vector3` | Current velocity |
| `setTarget(x,y,z)` | `function` | Move the spring target |
| `snap(x,y,z)` | `function` | Teleport to position with zero velocity |

---

## Particle pool utilities

Low-level utilities used internally by `<ParticleSystem>`:

```ts
import {
  createParticlePool,
  updateParticlePool,
  getParticleAlpha,
  PARTICLE_STRIDE,
} from '@dot-engine/renderer';
```

| Export | Description |
|---|---|
| `PARTICLE_STRIDE` | `8` — floats per particle `[x,y,z, vx,vy,vz, age, lifetime]` |
| `createParticlePool(max)` | Allocates a `Float32Array` pool |
| `updateParticlePool(state, dt, config, max)` | Advances physics, emits and kills particles |
| `getParticleAlpha(pool, i, fadeIn, fadeOut)` | Computes fade-in/fade-out alpha for particle `i` |

# Particle, Logo Upload, and Vibe Fixes

**Date:** 2026-03-31
**Approach:** B — Integrated particle rework with logo fix and vibe tuning

## Problem Summary

Three categories of issues in the configurator:

1. **Logo file upload is broken** — the File button's `onChange` only calls `setLogoMode('file')` but never reads the file. `App.tsx`'s `defineBrand` effect always uses `text(name, ...)` regardless of `logoMode`.
2. **Particle effects are random and disconnected** — `surfaceEmitter` spawns in a random unit cube instead of along the SDF boundary. Turbulence uses each particle's own drifting position as noise input (incoherent jitter). Particles have no awareness of the dot field shape or displacement forces.
3. **Vibes are samey and partially disconnected** — several vibes cluster around similar parameter ranges. `particleMode` is never passed to `defineBrand`. `applyIntensity()` doesn't scale `organic`. Particle values were tuned against a broken particle system.

## Section 1: Logo File Upload Fix

### Files Changed

- `packages/configurator/src/components/LeftPanel.tsx`
- `packages/configurator/src/App.tsx`

### Design

**LeftPanel.tsx:**

Add a `handleFileChange` handler mirroring the existing `handleImageChange`:
- Read the selected file from the `<input>` element
- Detect file type from extension: `.svg` files use `svg(objectUrl)`, `.png`/`.jpg` files use `image(objectUrl)` from `@bigpuddle/dot-engine-brand`
- Call a new prop `onFileLoad(input: LogoInput)` to pass the logo input up to App
- Set `logoMode('file')`
- Revoke the object URL in a cleanup pattern (the URL must survive until `importLogo` completes, so revocation happens after brand creation, not immediately)

New prop on `LeftPanelProps`:
```ts
onFileLoad: (input: LogoInput) => void;
```

When `logoMode === 'file'`, show the loaded filename instead of font/weight controls.

**App.tsx:**

Add state:
```ts
const [fileLogoInput, setFileLogoInput] = useState<LogoInput | null>(null);
```

In the `defineBrand` effect, switch on `logoMode`:
- `'text'` -> `text(name, { font: logoFont, weight: fontWeight })` (unchanged)
- `'file'` -> `fileLogoInput` (if set, otherwise skip brand creation)
- `'image'` -> `text(name, ...)` (image path bypasses brand logo via Canvas3D injection, existing behavior)

Add `logoMode` and `fileLogoInput` to the effect's dependency array.

## Section 2: Surface-Aware Particle Spawning

### Files Changed

- `packages/renderer/src/particles/particlePool.ts`
- `packages/renderer/src/particles/ParticleSystem.tsx`
- `packages/configurator/src/components/Canvas3D.tsx`

### Design

**New type for SDF data passed to particles:**

```ts
export interface ParticleSdfData {
  texture: Float32Array;
  width: number;
  height: number;
  aspectRatio: number;
  depth: number;
}
```

Defined in `particlePool.ts` (renderer-internal, not exported from core).

**New function `sampleSdfSurface()` in `particlePool.ts`:**

Rejection sampling approach:
1. Pick random UV: `u = Math.random()`, `v = Math.random()`
2. Look up SDF value: `sdf[Math.floor(v * height) * width + Math.floor(u * width)]`
3. Accept if `|sdfValue| < threshold` (threshold ~0.02, near the zero-crossing = shape boundary)
4. Reject and retry (max 20 attempts). Fallback: pick the closest-to-zero sample seen.
5. Map accepted UV to 3D position: `x = (u - 0.5) * 2 * aspectRatio`, `y = (0.5 - v) * 2`, `z = random in [-depth/2, +depth/2]`

Similarly, `sampleSdfVolume()` for volume emitters: accept if `sdfValue < 0` (inside the shape).

**Update `spawnParticle()`:**

Add `sdfData?: ParticleSdfData` parameter:
- `emitter.type === 'surface'` + sdfData present -> `sampleSdfSurface()`
- `emitter.type === 'volume'` + sdfData present -> `sampleSdfVolume()`
- No sdfData -> current random cube fallback

**Update `updateParticlePool()`:**

Add `sdfData?: ParticleSdfData` parameter, threaded to `spawnParticle()`.

**ParticleSystem.tsx:**

New prop:
```ts
sdfData?: ParticleSdfData;
```

Passed into `updateParticlePool()` on each frame.

**Canvas3D.tsx:**

Build `ParticleSdfData` from `brand.logo` and pass to `ParticleSystem`:
```ts
const particleSdfData = useMemo(() => {
  if (!brand?.logo?.sdfTexture?.length) return undefined;
  const { sdfTexture, width, height, aspectRatio, sdfNode } = brand.logo;
  return {
    texture: sdfTexture,
    width,
    height,
    aspectRatio,
    depth: sdfNode?.type === 'textureSdf' ? sdfNode.depth : 0.3,
  };
}, [brand]);
```

## Section 3: Field-Reactive Particle Motion

### Files Changed

- `packages/renderer/src/particles/particlePool.ts`
- `packages/renderer/src/particles/ParticleSystem.tsx`
- `packages/configurator/src/components/Canvas3D.tsx`

### Design

**Replace turbulence block in `updateParticlePool()`** (lines 186-191):

Current (incoherent per-particle noise):
```ts
pool[si] += (Math.sin(pool[si] * 7 + t) * 0.5 + ...) * turbulence * dt;
```

New (curl noise):
```ts
function curlNoise3D(x: number, y: number, z: number, t: number, scale: number): [number, number, number] {
  const e = 0.01;
  const s = scale;
  // Potential field components using trig (cheap, no library)
  const px = (pz(x,y+e,z,t,s) - pz(x,y-e,z,t,s)) - (py(x,y,z+e,t,s) - py(x,y,z-e,t,s));
  const py_ = (px_(x,y,z+e,t,s) - px_(x,y,z-e,t,s)) - (pz(x+e,y,z,t,s) - pz(x-e,y,z,t,s));
  const pz_ = (py(x+e,y,z,t,s) - py(x-e,y,z,t,s)) - (px_(x,y+e,z,t,s) - px_(x,y-e,z,t,s));
  const inv = 1 / (2 * e);
  return [px * inv, py_ * inv, pz_ * inv];
}
```

Where `px_`, `py`, `pz` are simple trig potential functions:
```ts
function px_(x,y,z,t,s) { return Math.sin(y*s + t) * Math.cos(z*s*0.7 + t*0.6); }
function py(x,y,z,t,s)  { return Math.sin(z*s*0.8 + t*0.8) * Math.cos(x*s + t*0.5); }
function pz(x,y,z,t,s)  { return Math.sin(x*s*0.9 + t*0.7) * Math.cos(y*s*0.6 + t*0.9); }
```

This produces divergence-free flow — particles follow smooth swirling paths instead of jittering.

**New `ParticleFieldParams` type:**

```ts
export interface ParticleFieldParams {
  animateSpeed: number;
  displacementAmount: number;
  useFlowField: boolean;
}
```

**Update `updateParticlePool()` signature:**

```ts
export function updateParticlePool(
  state: ParticlePoolState,
  dt: number,
  config: ParticleNode,
  maxParticles: number,
  sdfData?: ParticleSdfData,
  fieldParams?: ParticleFieldParams,
  globalTime?: number,
): ParticleUpdateResult
```

Coupling logic:
- Noise scale: `fieldParams.useFlowField ? 2.5 : 4.0` (flow field = larger swirls, non-flow = tighter patterns)
- Noise scroll speed: `fieldParams.animateSpeed` (same rate as dot animation)
- Turbulence magnitude: `config.motion.turbulence * fieldParams.displacementAmount / 0.08` (normalize around default 0.08)
- When no `fieldParams` provided, fall back to current behavior with the curl noise but default scale/speed

**Global time:**

`ParticleSystem` accumulates elapsed time via `useRef` and passes it to `updateParticlePool()` instead of using per-particle `age * 3`. All particles sample the same noise field at the same moment.

**Canvas3D.tsx:**

Extract `fieldParams` from brand and pass to `ParticleSystem`:
```ts
const particleFieldParams = useMemo(() => {
  if (!brand) return undefined;
  // brand.config has personality, mapPersonality gives us the params
  // But we don't have direct access to MappedParams from Canvas3D.
  // Instead, pass the raw personality + motion speed and let ParticleSystem derive.
  return {
    animateSpeed: brand.config.motion.speed * brand.config.personality.energy,
    displacementAmount: 0.02 + 0.13 * brand.config.personality.energy,
    useFlowField: brand.config.personality.organic > 0.5,
  };
}, [brand]);
```

Note: This duplicates the `mapPersonality` calculation slightly but avoids exposing `MappedParams` from the brand package to the renderer. The values track the same inputs.

## Section 4: Particle Rendering Improvements

### Files Changed

- `packages/renderer/src/particles/ParticleSystem.tsx`

### Design

**Per-particle opacity:**

Current: `getParticleAlpha()` result only scales mesh size (line 41: `const s = size * alpha`). Material opacity is fixed at 0.4.

New:
- Add an `InstancedBufferAttribute` for per-instance opacity
- Each frame, write `getParticleAlpha() * 0.6` into the attribute (0.6 base instead of 0.4 — slightly more visible, fades to 0 at end of life)
- Use a custom `ShaderMaterial` (or `onBeforeCompile` patch) that reads the instance attribute for alpha
- Keep the size scaling but reduce it: `size * (0.5 + 0.5 * alpha)` — particles shrink slightly AND fade, instead of just shrinking to nothing

**Simpler alternative if custom shader is too heavy:** Use `meshBasicMaterial` with `vertexColors` and encode alpha into the color attribute's fourth channel. R3F/Three.js `InstancedMesh` doesn't natively support per-instance alpha via attributes without a custom shader, so we'll use a minimal `ShaderMaterial`:

```glsl
// vertex
attribute float instanceOpacity;
varying float vOpacity;
void main() {
  vOpacity = instanceOpacity;
  // standard instanced position transform
}

// fragment
varying float vOpacity;
uniform vec3 color;
void main() {
  gl_FragColor = vec4(color, vOpacity);
}
```

**Color:**

Add a `colorSecondary` prop to `ParticleSystem`. At spawn time, each particle is randomly assigned primary (30%) or accent (70%) color. Store color index in an additional per-instance attribute or use two separate `InstancedMesh` groups.

Simpler approach: use a single color (accent) for now but accept it as a prop. Color mixing can be a follow-up.

**Decision:** Start with per-particle opacity + single configurable color. Dual-color is a nice-to-have but not critical for this fix.

## Section 5: Vibe Tuning and Wiring

### Files Changed

- `packages/configurator/src/vibes.ts`
- `packages/configurator/src/App.tsx`

### Vibe Wiring

**`App.tsx`:** No structural change needed here. `particleMode` is already passed from `advancedSettings.particleMode` to `Canvas3D`, and `Canvas3D` calls `brand.particles(particleMode)`. The wiring works for the configurator. For export consistency, `particleMode` should be stored on the `Brand` object, but that's a separate concern outside this fix scope.

### `applyIntensity()` fix

Current: `organic: vibe.organic` (not scaled by intensity at all).

New: `organic: clamp(vibe.organic * (0.8 + intensity * 0.4), 0, 1)` — scales 0.8x to 1.2x. Subtle but makes intensity feel more impactful.

### Vibe Value Tuning

The 12 vibes need retuning against the now-functional particle system. Key principles:
- Each vibe should occupy a distinct region of the parameter space
- Vibes with particles should showcase the surface-aware spawning and curl noise
- Energy/density clusters need to be broken up
- Motion speeds should have wider range

Tuned values (changes only noted where significantly different from current):

| Vibe | energy | organic | density | motionStyle | motionSpeed | particleMode | Key changes |
|---|---|---|---|---|---|---|---|
| minimal | 0.1 | 0.15 | 0.35 | breathe | 0.08 | none | Lower energy/speed for truly minimal feel |
| elegant | 0.3 | 0.75 | 0.5 | flow | 0.18 | ambient | Slightly lower energy, higher organic |
| bold | 0.7 | 0.2 | 0.7 | pulse | 0.55 | edges | Higher energy+density, lower organic for sharp look |
| organic | 0.45 | 0.95 | 0.45 | flow | 0.3 | ambient | Max organic, lower density for airy feel |
| energetic | 0.9 | 0.5 | 0.6 | pulse | 0.8 | burst | Higher speed |
| cosmic | 0.3 | 0.85 | 0.25 | flow | 0.15 | rising | Lower density for sparse starfield feel |
| industrial | 0.35 | 0.05 | 0.8 | none | 0.05 | none | Highest density, near-zero organic, near-static |
| neon | 0.75 | 0.4 | 0.55 | pulse | 0.65 | edges | Higher energy+speed for electric feel |
| zen | 0.08 | 0.7 | 0.25 | breathe | 0.06 | ambient | Near-zero energy, very slow |
| glitch | 0.95 | 0.3 | 0.65 | pulse | 0.95 | burst | Max energy+speed |
| frost | 0.2 | 0.6 | 0.4 | breathe | 0.1 | rising | Unchanged mostly |
| ember | 0.6 | 0.75 | 0.45 | flow | 0.45 | rising | Higher energy, more distinct from organic |

Dot sizes, edge softness, twist/bend, mirror, and color values will also be adjusted per-vibe but the specific values are best tuned visually during implementation. The table above captures the structural parameter changes.

## Testing Strategy

- **Logo upload:** Manual test — pick an SVG and a PNG, verify they render as dot fields. Verify switching back to text mode works.
- **Surface spawning:** Visual verification that "edges" particles appear along the logo outline, not randomly in space. Could add a unit test for `sampleSdfSurface()` with a synthetic SDF (circle) to verify spawn positions are near the zero-crossing.
- **Curl noise:** Visual verification that particles follow smooth swirling paths. Unit test that `curlNoise3D` produces non-zero, smoothly varying vectors.
- **Field coupling:** Visual verification that high-energy vibes produce faster particle motion and low-energy vibes produce slower motion.
- **Per-particle opacity:** Visual verification that particles fade in/out instead of just shrinking.
- **Vibe tuning:** Manual comparison of all 12 vibes — each should feel visually distinct.
- **Existing tests:** Run `pnpm test` to ensure no regressions in the ~400 existing unit tests.

## Section 6: Dead Code Cleanup

### Files Changed

- `packages/core/src/presets.ts`
- `packages/core/src/index.ts`
- `packages/brand/src/brand/particle-presets.ts`

### Design

**`packages/core/src/presets.ts`:** Delete the file entirely. The three geometric presets (`crystal`, `organic`, `minimal`) are never used in the configurator or brand system. They were a low-level demo API that was superseded by the vibe system.

**`packages/core/src/index.ts`:** Remove the `export * from './presets.js'` line (or equivalent re-export).

**`packages/brand/src/brand/particle-presets.ts`:** Remove the static `particlePresets` record (lines 56-77) — the `_defaultConfig`, `_defaultParams`, and `particlePresets` export. These are frozen snapshots with hardcoded values that bypass the live brand config. The live path `brand.particles(mode)` -> `buildParticles()` is the correct API. Also remove the `ParticlePresetName` type alias since it just duplicates `ParticleMode`.

Check for any imports of `particlePresets` or `ParticlePresetName` across the codebase and update/remove them. The export package and any READMEs that reference `particlePresets.ambientDrift` etc. should be updated to point to `brand.particles(mode)` instead.

## Out of Scope

- GPU particle system — overkill for 60-100 particles
- Dual-color particles (primary/accent mixing) — nice-to-have follow-up
- `Brand` object storing `particleMode` for export — separate concern

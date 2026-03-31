# Particle, Logo Upload, and Vibe Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken logo file upload, make particles surface-aware with coherent curl noise motion, add per-particle opacity, retune all 12 vibes, and clean up dead code.

**Architecture:** CPU particle pool gains SDF data + field params for shape-aware spawning and curl noise turbulence. Logo upload wires File button through `importLogo` to `defineBrand`. ParticleSystem gets a custom ShaderMaterial for per-instance opacity. Vibe values are retuned and `applyIntensity` scales `organic`.

**Tech Stack:** TypeScript, React, Three.js, R3F, Vite, Vitest

**Spec:** `docs/superpowers/specs/2026-03-31-particle-logo-vibe-fixes-design.md`

---

## File Map

### New Files
- `packages/renderer/src/particles/curlNoise.ts` — curl noise implementation (pure math, no dependencies)
- `packages/renderer/src/particles/sdfSampler.ts` — SDF surface/volume rejection sampling
- `packages/renderer/__tests__/curl-noise.test.ts` — curl noise tests
- `packages/renderer/__tests__/sdf-sampler.test.ts` — SDF sampler tests

### Modified Files
- `packages/renderer/src/particles/particlePool.ts` — new params for SDF + field coupling, replace turbulence with curl noise, use global time
- `packages/renderer/src/particles/ParticleSystem.tsx` — accept sdfData + fieldParams props, custom ShaderMaterial for per-instance opacity, global time tracking
- `packages/renderer/src/index.ts` — export new types (`ParticleSdfData`, `ParticleFieldParams`)
- `packages/renderer/__tests__/particle-system.test.ts` — update tests for new `updateParticlePool` signature
- `packages/configurator/src/components/LeftPanel.tsx` — add `handleFileChange`, new `onFileLoad` prop
- `packages/configurator/src/App.tsx` — add `fileLogoInput` state, switch `defineBrand` on `logoMode`
- `packages/configurator/src/components/Canvas3D.tsx` — pass SDF data + field params to ParticleSystem
- `packages/configurator/src/vibes.ts` — retune all 12 vibes, fix `applyIntensity` to scale organic
- `packages/brand/src/brand/particle-presets.ts` — remove static `particlePresets` record + `ParticlePresetName`
- `packages/brand/src/index.ts` — remove `particlePresets` and `ParticlePresetName` exports
- `packages/core/src/presets.ts` — delete file
- `packages/core/src/index.ts` — remove presets re-export
- `packages/core/__tests__/presets.test.ts` — delete file

---

### Task 1: Curl Noise Module

**Files:**
- Create: `packages/renderer/src/particles/curlNoise.ts`
- Create: `packages/renderer/__tests__/curl-noise.test.ts`

- [ ] **Step 1: Write the curl noise tests**

Create `packages/renderer/__tests__/curl-noise.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { curlNoise3D } from '../src/particles/curlNoise.js';

describe('curlNoise3D', () => {
  it('returns a 3-element tuple', () => {
    const result = curlNoise3D(0, 0, 0, 0, 1);
    expect(result).toHaveLength(3);
  });

  it('produces non-zero output for non-degenerate input', () => {
    const [cx, cy, cz] = curlNoise3D(1, 2, 3, 1, 2);
    const mag = Math.sqrt(cx * cx + cy * cy + cz * cz);
    expect(mag).toBeGreaterThan(0.001);
  });

  it('varies smoothly — nearby inputs produce similar outputs', () => {
    const a = curlNoise3D(1, 1, 1, 0, 2);
    const b = curlNoise3D(1.001, 1, 1, 0, 2);
    const diff = Math.sqrt(
      (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
    );
    expect(diff).toBeLessThan(0.1);
  });

  it('produces different output at different times', () => {
    const a = curlNoise3D(1, 1, 1, 0, 2);
    const b = curlNoise3D(1, 1, 1, 5, 2);
    const diff = Math.sqrt(
      (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
    );
    expect(diff).toBeGreaterThan(0.01);
  });

  it('is approximately divergence-free', () => {
    // Numerical divergence: d(cx)/dx + d(cy)/dy + d(cz)/dz ≈ 0
    const e = 0.001;
    const x = 1, y = 2, z = 3, t = 1, s = 2;
    const cxp = curlNoise3D(x + e, y, z, t, s);
    const cxn = curlNoise3D(x - e, y, z, t, s);
    const cyp = curlNoise3D(x, y + e, z, t, s);
    const cyn = curlNoise3D(x, y - e, z, t, s);
    const czp = curlNoise3D(x, y, z + e, t, s);
    const czn = curlNoise3D(x, y, z - e, t, s);
    const div =
      (cxp[0] - cxn[0]) / (2 * e) +
      (cyp[1] - cyn[1]) / (2 * e) +
      (czp[2] - czn[2]) / (2 * e);
    expect(Math.abs(div)).toBeLessThan(0.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/renderer/__tests__/curl-noise.test.ts`
Expected: FAIL — module `curlNoise.js` not found

- [ ] **Step 3: Implement curl noise**

Create `packages/renderer/src/particles/curlNoise.ts`:

```ts
/**
 * Analytical curl noise using trig-based potential fields.
 * Divergence-free: particles follow smooth swirling paths.
 */

// Potential field components
function potX(x: number, y: number, z: number, t: number, s: number): number {
  return Math.sin(y * s + t) * Math.cos(z * s * 0.7 + t * 0.6);
}

function potY(x: number, y: number, z: number, t: number, s: number): number {
  return Math.sin(z * s * 0.8 + t * 0.8) * Math.cos(x * s + t * 0.5);
}

function potZ(x: number, y: number, z: number, t: number, s: number): number {
  return Math.sin(x * s * 0.9 + t * 0.7) * Math.cos(y * s * 0.6 + t * 0.9);
}

/**
 * Compute curl of the potential field at position (x, y, z) at time t.
 * @param scale — spatial frequency of the noise
 * @returns [cx, cy, cz] divergence-free velocity
 */
export function curlNoise3D(
  x: number,
  y: number,
  z: number,
  t: number,
  scale: number,
): [number, number, number] {
  const e = 0.01;

  // curl = (dPz/dy - dPy/dz, dPx/dz - dPz/dx, dPy/dx - dPx/dy)
  const dPz_dy = (potZ(x, y + e, z, t, scale) - potZ(x, y - e, z, t, scale));
  const dPy_dz = (potY(x, y, z + e, t, scale) - potY(x, y, z - e, t, scale));

  const dPx_dz = (potX(x, y, z + e, t, scale) - potX(x, y, z - e, t, scale));
  const dPz_dx = (potZ(x + e, y, z, t, scale) - potZ(x - e, y, z, t, scale));

  const dPy_dx = (potY(x + e, y, z, t, scale) - potY(x - e, y, z, t, scale));
  const dPx_dy = (potX(x, y + e, z, t, scale) - potX(x, y - e, z, t, scale));

  const inv = 1 / (2 * e);

  return [
    (dPz_dy - dPy_dz) * inv,
    (dPx_dz - dPz_dx) * inv,
    (dPy_dx - dPx_dy) * inv,
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/renderer/__tests__/curl-noise.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/particles/curlNoise.ts packages/renderer/__tests__/curl-noise.test.ts
git commit -m "feat(renderer): add curl noise module for coherent particle turbulence"
```

---

### Task 2: SDF Sampler Module

**Files:**
- Create: `packages/renderer/src/particles/sdfSampler.ts`
- Create: `packages/renderer/__tests__/sdf-sampler.test.ts`

- [ ] **Step 1: Write the SDF sampler tests**

Create `packages/renderer/__tests__/sdf-sampler.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  sampleSdfSurface,
  sampleSdfVolume,
  type ParticleSdfData,
} from '../src/particles/sdfSampler.js';

/**
 * Build a synthetic SDF: a circle of radius 0.3 centered at (0.5, 0.5) in UV space.
 * SDF values: negative inside, positive outside, zero at boundary.
 */
function makeCircleSdf(size: number): ParticleSdfData {
  const texture = new Float32Array(size * size);
  const cx = 0.5, cy = 0.5, r = 0.3;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const u = (col + 0.5) / size;
      const v = (row + 0.5) / size;
      const dist = Math.sqrt((u - cx) ** 2 + (v - cy) ** 2) - r;
      texture[row * size + col] = dist;
    }
  }
  return { texture, width: size, height: size, aspectRatio: 1, depth: 0.3 };
}

describe('sampleSdfSurface', () => {
  const sdf = makeCircleSdf(64);

  it('returns a 3-element position', () => {
    const pos = sampleSdfSurface(sdf);
    expect(pos).toHaveLength(3);
  });

  it('spawns near the SDF zero-crossing (shape boundary)', () => {
    // Sample many points and check they cluster near the circle boundary
    const distances: number[] = [];
    for (let i = 0; i < 100; i++) {
      const [x, y] = sampleSdfSurface(sdf);
      // Convert back to UV: x = (u - 0.5) * 2 * aspect, y = (0.5 - v) * 2
      const u = x / 2 + 0.5;
      const v = 0.5 - y / 2;
      const dist = Math.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2);
      distances.push(Math.abs(dist - 0.3)); // distance from circle boundary
    }
    const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
    expect(avgDist).toBeLessThan(0.05);
  });

  it('z position is within depth bounds', () => {
    for (let i = 0; i < 50; i++) {
      const [, , z] = sampleSdfSurface(sdf);
      expect(Math.abs(z)).toBeLessThanOrEqual(sdf.depth / 2 + 0.001);
    }
  });
});

describe('sampleSdfVolume', () => {
  const sdf = makeCircleSdf(64);

  it('returns a 3-element position', () => {
    const pos = sampleSdfVolume(sdf);
    expect(pos).toHaveLength(3);
  });

  it('spawns inside the shape (negative SDF region)', () => {
    for (let i = 0; i < 50; i++) {
      const [x, y] = sampleSdfVolume(sdf);
      const u = x / 2 + 0.5;
      const v = 0.5 - y / 2;
      const dist = Math.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2);
      // Should be inside or very near the circle (dist < 0.3 + small tolerance)
      expect(dist).toBeLessThan(0.35);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/renderer/__tests__/sdf-sampler.test.ts`
Expected: FAIL — module `sdfSampler.js` not found

- [ ] **Step 3: Implement SDF sampler**

Create `packages/renderer/src/particles/sdfSampler.ts`:

```ts
/**
 * SDF rejection sampling for surface-aware particle spawning.
 */

export interface ParticleSdfData {
  texture: Float32Array;
  width: number;
  height: number;
  aspectRatio: number;
  depth: number;
}

/**
 * Sample a position near the SDF zero-crossing (shape boundary).
 * Uses rejection sampling: pick random UV, accept if |sdf| < threshold.
 * Fallback: returns the closest-to-zero sample after maxAttempts.
 */
export function sampleSdfSurface(sdf: ParticleSdfData): [number, number, number] {
  const { texture, width, height, aspectRatio, depth } = sdf;
  const threshold = 0.02;
  const maxAttempts = 30;

  let bestU = 0.5, bestV = 0.5, bestAbsSdf = Infinity;

  for (let i = 0; i < maxAttempts; i++) {
    const u = Math.random();
    const v = Math.random();
    const col = Math.min(Math.floor(u * width), width - 1);
    const row = Math.min(Math.floor(v * height), height - 1);
    const sdfVal = texture[row * width + col];
    const absSdf = Math.abs(sdfVal);

    if (absSdf < threshold) {
      return uvToPosition(u, v, aspectRatio, depth);
    }

    if (absSdf < bestAbsSdf) {
      bestAbsSdf = absSdf;
      bestU = u;
      bestV = v;
    }
  }

  return uvToPosition(bestU, bestV, aspectRatio, depth);
}

/**
 * Sample a position inside the shape (where SDF < 0).
 * Uses rejection sampling. Fallback: returns the most-negative sample.
 */
export function sampleSdfVolume(sdf: ParticleSdfData): [number, number, number] {
  const { texture, width, height, aspectRatio, depth } = sdf;
  const maxAttempts = 30;

  let bestU = 0.5, bestV = 0.5, bestSdf = Infinity;

  for (let i = 0; i < maxAttempts; i++) {
    const u = Math.random();
    const v = Math.random();
    const col = Math.min(Math.floor(u * width), width - 1);
    const row = Math.min(Math.floor(v * height), height - 1);
    const sdfVal = texture[row * width + col];

    if (sdfVal < 0) {
      return uvToPosition(u, v, aspectRatio, depth);
    }

    if (sdfVal < bestSdf) {
      bestSdf = sdfVal;
      bestU = u;
      bestV = v;
    }
  }

  return uvToPosition(bestU, bestV, aspectRatio, depth);
}

function uvToPosition(
  u: number,
  v: number,
  aspectRatio: number,
  depth: number,
): [number, number, number] {
  const x = (u - 0.5) * 2 * aspectRatio;
  const y = (0.5 - v) * 2;
  const z = (Math.random() - 0.5) * depth;
  return [x, y, z];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/renderer/__tests__/sdf-sampler.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/particles/sdfSampler.ts packages/renderer/__tests__/sdf-sampler.test.ts
git commit -m "feat(renderer): add SDF rejection sampler for surface/volume particle spawning"
```

---

### Task 3: Integrate SDF Sampling + Curl Noise Into Particle Pool

**Files:**
- Modify: `packages/renderer/src/particles/particlePool.ts`
- Modify: `packages/renderer/__tests__/particle-system.test.ts`

- [ ] **Step 1: Write tests for the new particlePool behavior**

Add these tests to `packages/renderer/__tests__/particle-system.test.ts`:

```ts
import { surfaceEmitter } from '../../core/src/nodes/particles.js';
import type { ParticleSdfData } from '../src/particles/sdfSampler.js';

// Add after existing imports. Synthetic circle SDF for testing.
function makeCircleSdf(size: number): ParticleSdfData {
  const texture = new Float32Array(size * size);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const u = (col + 0.5) / size;
      const v = (row + 0.5) / size;
      texture[row * size + col] = Math.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) - 0.3;
    }
  }
  return { texture, width: size, height: size, aspectRatio: 1, depth: 0.3 };
}

describe('surface emitter with SDF data', () => {
  it('spawns particles near the SDF boundary', () => {
    const config = makeConfig({
      emitter: surfaceEmitter(100),
      lifecycle: { lifetime: 5 },
      motion: { speed: 0 },
    });
    const sdf = makeCircleSdf(64);
    const state = createParticlePool(50);
    updateParticlePool(state, 0.1, config, 50, sdf);
    expect(state.alive).toBeGreaterThan(0);

    // Check that spawned positions are near the circle boundary
    for (let i = 0; i < state.alive; i++) {
      const si = i * PARTICLE_STRIDE;
      const x = state.pool[si];
      const y = state.pool[si + 1];
      // Convert to UV
      const u = x / 2 + 0.5;
      const v = 0.5 - y / 2;
      const dist = Math.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2);
      expect(Math.abs(dist - 0.3)).toBeLessThan(0.1);
    }
  });
});

describe('surface emitter without SDF data (fallback)', () => {
  it('falls back to random cube spawn', () => {
    const config = makeConfig({
      emitter: surfaceEmitter(100),
      lifecycle: { lifetime: 5 },
      motion: { speed: 0 },
    });
    const state = createParticlePool(50);
    // No sdfData passed — should still spawn particles without crashing
    updateParticlePool(state, 0.1, config, 50);
    expect(state.alive).toBeGreaterThan(0);
  });
});

describe('global time in turbulence', () => {
  it('accepts globalTime parameter without crashing', () => {
    const config = makeConfig({
      emitter: burstEmitter(5),
      lifecycle: { lifetime: 5 },
      motion: { speed: 0.1, turbulence: 0.5 },
    });
    const state = createParticlePool(20);
    updateParticlePool(state, 0.016, config, 20);
    // Apply with global time
    updateParticlePool(state, 0.016, config, 20, undefined, undefined, 1.5);
    expect(state.alive).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify failures**

Run: `pnpm vitest run packages/renderer/__tests__/particle-system.test.ts`
Expected: New tests FAIL (surfaceEmitter import may work but SDF param not accepted, particles spawn in random cube not near boundary)

- [ ] **Step 3: Update particlePool.ts**

Replace the full content of `packages/renderer/src/particles/particlePool.ts`:

```ts
import type { ParticleNode, ParticleEmitter } from '@bigpuddle/dot-engine-core';
import { curlNoise3D } from './curlNoise.js';
import { sampleSdfSurface, sampleSdfVolume, type ParticleSdfData } from './sdfSampler.js';

export type { ParticleSdfData } from './sdfSampler.js';

export const PARTICLE_STRIDE = 8;
// Layout per particle (8 floats):
//   [0] x  [1] y  [2] z
//   [3] vx [4] vy [5] vz
//   [6] age
//   [7] lifetime

export interface ParticleFieldParams {
  animateSpeed: number;
  displacementAmount: number;
  useFlowField: boolean;
}

export interface ParticlePoolState {
  pool: Float32Array;
  alive: number;
  emitAccum: number;
  bursted: boolean;
}

export function createParticlePool(maxParticles: number): ParticlePoolState {
  return {
    pool: new Float32Array(maxParticles * PARTICLE_STRIDE),
    alive: 0,
    emitAccum: 0,
    bursted: false,
  };
}

function randomInSphereCone(
  velocity: [number, number, number],
  speed: number,
  spread: number,
  out: [number, number, number],
): void {
  const spd = speed;
  if (spread >= 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    out[0] = spd * Math.sin(phi) * Math.cos(theta);
    out[1] = spd * Math.sin(phi) * Math.sin(theta);
    out[2] = spd * Math.cos(phi);
    return;
  }

  if (spread <= 0) {
    const len = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2) || 1;
    out[0] = (velocity[0] / len) * spd;
    out[1] = (velocity[1] / len) * spd;
    out[2] = (velocity[2] / len) * spd;
    return;
  }

  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const rx = Math.sin(phi) * Math.cos(theta);
  const ry = Math.sin(phi) * Math.sin(theta);
  const rz = Math.cos(phi);

  const len = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2) || 1;
  const dx = velocity[0] / len;
  const dy = velocity[1] / len;
  const dz = velocity[2] / len;

  out[0] = (dx * (1 - spread) + rx * spread) * spd;
  out[1] = (dy * (1 - spread) + ry * spread) * spd;
  out[2] = (dz * (1 - spread) + rz * spread) * spd;
}

function spawnParticle(
  state: ParticlePoolState,
  maxParticles: number,
  config: ParticleNode,
  sdfData?: ParticleSdfData,
): void {
  if (state.alive >= maxParticles) return;

  const { emitter, lifecycle, motion } = config;
  const si = state.alive * PARTICLE_STRIDE;

  // Position
  if (emitter.type === 'point' && emitter.position) {
    state.pool[si] = emitter.position[0];
    state.pool[si + 1] = emitter.position[1];
    state.pool[si + 2] = emitter.position[2];
  } else if (emitter.type === 'surface' && sdfData) {
    const pos = sampleSdfSurface(sdfData);
    state.pool[si] = pos[0];
    state.pool[si + 1] = pos[1];
    state.pool[si + 2] = pos[2];
  } else if (emitter.type === 'volume' && sdfData) {
    const pos = sampleSdfVolume(sdfData);
    state.pool[si] = pos[0];
    state.pool[si + 1] = pos[1];
    state.pool[si + 2] = pos[2];
  } else {
    // Fallback: random in unit cube [-1, 1]
    state.pool[si] = (Math.random() - 0.5) * 2;
    state.pool[si + 1] = (Math.random() - 0.5) * 2;
    state.pool[si + 2] = (Math.random() - 0.5) * 2;
  }

  // Velocity
  const vel: [number, number, number] = motion.velocity ? [...motion.velocity] : [0, 1, 0];
  const speed = motion.speed ?? 1;
  const spread = motion.spread ?? 0;
  const vOut: [number, number, number] = [0, 0, 0];
  randomInSphereCone(vel, speed, spread, vOut);
  state.pool[si + 3] = vOut[0];
  state.pool[si + 4] = vOut[1];
  state.pool[si + 5] = vOut[2];

  // Age + lifetime
  state.pool[si + 6] = 0;
  state.pool[si + 7] = lifecycle.lifetime;

  state.alive++;
}

export interface ParticleUpdateResult {
  alive: number;
}

export function updateParticlePool(
  state: ParticlePoolState,
  dt: number,
  config: ParticleNode,
  maxParticles: number,
  sdfData?: ParticleSdfData,
  fieldParams?: ParticleFieldParams,
  globalTime?: number,
): ParticleUpdateResult {
  const { pool } = state;
  const { motion, lifecycle, emitter } = config;
  const gravity = motion.gravity ?? [0, 0, 0];
  const drag = motion.drag ?? 0;
  const turbulence = motion.turbulence ?? 0;

  // Emit new particles
  if (emitter.burst !== undefined && emitter.burst > 0 && !state.bursted) {
    const count = Math.min(emitter.burst, maxParticles);
    for (let i = 0; i < count; i++) {
      spawnParticle(state, maxParticles, config, sdfData);
    }
    state.bursted = true;
  } else if (emitter.rate > 0) {
    state.emitAccum += emitter.rate * dt;
    const toEmit = Math.floor(state.emitAccum);
    state.emitAccum -= toEmit;
    for (let i = 0; i < toEmit; i++) {
      spawnParticle(state, maxParticles, config, sdfData);
    }
  }

  // Derive curl noise parameters from field params
  const noiseScale = fieldParams?.useFlowField ? 2.5 : 4.0;
  const noiseSpeed = fieldParams?.animateSpeed ?? 0.5;
  const turbMag = fieldParams
    ? turbulence * (fieldParams.displacementAmount / 0.08)
    : turbulence;
  const t = globalTime ?? 0;

  // Update alive particles, swap-kill dead ones
  let i = 0;
  while (i < state.alive) {
    const si = i * PARTICLE_STRIDE;
    const lifetime = pool[si + 7];

    pool[si + 6] += dt;
    const age = pool[si + 6];

    if (age >= lifetime) {
      const last = (state.alive - 1) * PARTICLE_STRIDE;
      if (last !== si) {
        pool[si] = pool[last];
        pool[si + 1] = pool[last + 1];
        pool[si + 2] = pool[last + 2];
        pool[si + 3] = pool[last + 3];
        pool[si + 4] = pool[last + 4];
        pool[si + 5] = pool[last + 5];
        pool[si + 6] = pool[last + 6];
        pool[si + 7] = pool[last + 7];
      }
      state.alive--;
      continue;
    }

    // Velocity integration
    pool[si] += pool[si + 3] * dt;
    pool[si + 1] += pool[si + 4] * dt;
    pool[si + 2] += pool[si + 5] * dt;

    // Gravity
    pool[si + 3] += gravity[0] * dt;
    pool[si + 4] += gravity[1] * dt;
    pool[si + 5] += gravity[2] * dt;

    // Drag
    const dragFactor = Math.max(0, 1 - drag * dt);
    pool[si + 3] *= dragFactor;
    pool[si + 4] *= dragFactor;
    pool[si + 5] *= dragFactor;

    // Curl noise turbulence (replaces old incoherent per-particle noise)
    if (turbMag > 0) {
      const noiseT = t * noiseSpeed;
      const [cx, cy, cz] = curlNoise3D(
        pool[si], pool[si + 1], pool[si + 2],
        noiseT, noiseScale,
      );
      pool[si + 3] += cx * turbMag * dt;
      pool[si + 4] += cy * turbMag * dt;
      pool[si + 5] += cz * turbMag * dt;
    }

    i++;
  }

  return { alive: state.alive };
}

export function getParticleAlpha(
  pool: Float32Array,
  index: number,
  fadeIn: number,
  fadeOut: number,
): number {
  const si = index * PARTICLE_STRIDE;
  const age = pool[si + 6];
  const lifetime = pool[si + 7];
  const fadeInT = Math.min(age / Math.max(fadeIn, 0.001), 1);
  const fadeOutT = Math.min((lifetime - age) / Math.max(fadeOut, 0.001), 1);
  return fadeInT * fadeOutT;
}
```

- [ ] **Step 4: Run all particle tests**

Run: `pnpm vitest run packages/renderer/__tests__/particle-system.test.ts`
Expected: All tests PASS (existing + new)

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/particles/particlePool.ts packages/renderer/__tests__/particle-system.test.ts
git commit -m "feat(renderer): integrate SDF sampling + curl noise into particle pool"
```

---

### Task 4: ParticleSystem Rendering — SDF Data, Field Params, Per-Instance Opacity

**Files:**
- Modify: `packages/renderer/src/particles/ParticleSystem.tsx`
- Modify: `packages/renderer/src/index.ts`

- [ ] **Step 1: Rewrite ParticleSystem.tsx**

Replace the full content of `packages/renderer/src/particles/ParticleSystem.tsx`:

```tsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ParticleNode } from '@bigpuddle/dot-engine-core';
import {
  PARTICLE_STRIDE,
  createParticlePool,
  updateParticlePool,
  getParticleAlpha,
  type ParticlePoolState,
  type ParticleFieldParams,
} from './particlePool.js';
import type { ParticleSdfData } from './sdfSampler.js';

export type { ParticleSdfData } from './sdfSampler.js';
export type { ParticleFieldParams } from './particlePool.js';

export interface ParticleSystemProps {
  config: ParticleNode;
  color?: string;
  size?: number;
  sdfData?: ParticleSdfData;
  fieldParams?: ParticleFieldParams;
}

const PARTICLE_VERTEX = /* glsl */ `
  attribute float instanceOpacity;
  varying float vOpacity;
  void main() {
    vOpacity = instanceOpacity;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vOpacity;
  void main() {
    gl_FragColor = vec4(uColor, vOpacity);
  }
`;

export function ParticleSystem({
  config,
  color = '#4a9eff',
  size = 0.015,
  sdfData,
  fieldParams,
}: ParticleSystemProps) {
  const maxParticles = config.maxParticles ?? 1000;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const stateRef = useRef<ParticlePoolState>(createParticlePool(maxParticles));
  const globalTimeRef = useRef(0);
  const opacityRef = useRef(new Float32Array(maxParticles));
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Custom shader material for per-instance opacity
  const material = useMemo(() => {
    const colorObj = new THREE.Color(color);
    return new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      uniforms: { uColor: { value: colorObj } },
      transparent: true,
      depthWrite: false,
    });
  }, []);

  // Update color uniform when color prop changes
  useEffect(() => {
    material.uniforms.uColor.value.set(color);
  }, [color, material]);

  // Set up instanced opacity attribute
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const attr = new THREE.InstancedBufferAttribute(opacityRef.current, 1);
    attr.setUsage(THREE.DynamicDrawUsage);
    mesh.geometry.setAttribute('instanceOpacity', attr);
  }, [maxParticles]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.033);
    globalTimeRef.current += dt;
    const state = stateRef.current;
    const mesh = meshRef.current;
    if (!mesh) return;

    updateParticlePool(
      state, dt, config, maxParticles,
      sdfData, fieldParams, globalTimeRef.current,
    );

    const { pool, alive } = state;
    const fadeIn = config.lifecycle.fadeIn ?? 0.1;
    const fadeOut = config.lifecycle.fadeOut ?? 0.3;
    const opacityArr = opacityRef.current;

    for (let i = 0; i < alive; i++) {
      const si = i * PARTICLE_STRIDE;
      dummy.position.set(pool[si], pool[si + 1], pool[si + 2]);
      const alpha = getParticleAlpha(pool, i, fadeIn, fadeOut);
      // Shrink slightly + fade via opacity
      const s = size * (0.5 + 0.5 * alpha);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      opacityArr[i] = alpha * 0.6;
    }

    mesh.count = alive;
    mesh.instanceMatrix.needsUpdate = true;
    const opacityAttr = mesh.geometry.getAttribute('instanceOpacity') as THREE.InstancedBufferAttribute;
    if (opacityAttr) opacityAttr.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, maxParticles]} frustumCulled={false} material={material}>
      <icosahedronGeometry args={[1, 1]} />
    </instancedMesh>
  );
}
```

- [ ] **Step 2: Update renderer index.ts exports**

In `packages/renderer/src/index.ts`, update the ParticleSystem export to include the new types, and add the new module exports:

Replace:
```ts
export { ParticleSystem, type ParticleSystemProps } from './particles/ParticleSystem.js';
export {
  createParticlePool,
  updateParticlePool,
  getParticleAlpha,
  PARTICLE_STRIDE,
  type ParticlePoolState,
} from './particles/particlePool.js';
```

With:
```ts
export { ParticleSystem, type ParticleSystemProps, type ParticleSdfData, type ParticleFieldParams } from './particles/ParticleSystem.js';
export {
  createParticlePool,
  updateParticlePool,
  getParticleAlpha,
  PARTICLE_STRIDE,
  type ParticlePoolState,
} from './particles/particlePool.js';
```

- [ ] **Step 3: Run all renderer tests**

Run: `pnpm vitest run packages/renderer/__tests__/`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add packages/renderer/src/particles/ParticleSystem.tsx packages/renderer/src/index.ts
git commit -m "feat(renderer): add SDF data, field params, per-instance opacity to ParticleSystem"
```

---

### Task 5: Wire SDF Data + Field Params Through Canvas3D

**Files:**
- Modify: `packages/configurator/src/components/Canvas3D.tsx`

- [ ] **Step 1: Add SDF data + field params to Canvas3D**

In `packages/configurator/src/components/Canvas3D.tsx`:

Add import at top:
```ts
import type { ParticleSdfData, ParticleFieldParams } from '@bigpuddle/dot-engine-renderer';
```

In the `Scene` component, add these memos after the existing `particleConfig` memo (after line 184):

```ts
  const particleSdfData = useMemo((): ParticleSdfData | undefined => {
    if (!brand?.logo?.sdfTexture?.length) return undefined;
    const { sdfTexture, width, height, aspectRatio, sdfNode } = brand.logo;
    return {
      texture: sdfTexture,
      width,
      height,
      aspectRatio,
      depth: sdfNode && 'depth' in sdfNode ? sdfNode.depth : 0.3,
    };
  }, [brand]);

  const particleFieldParams = useMemo((): ParticleFieldParams | undefined => {
    if (!brand) return undefined;
    const { personality, motion } = brand.config;
    return {
      animateSpeed: motion.speed * personality.energy,
      displacementAmount: 0.02 + 0.13 * personality.energy,
      useFlowField: personality.organic > 0.5,
    };
  }, [brand]);
```

Update the `<ParticleSystem>` JSX (around line 202) to pass the new props:

Replace:
```tsx
      {particleConfig && (
        <ParticleSystem config={particleConfig} color={colorAccent} size={particleSize ?? 0.01} />
      )}
```

With:
```tsx
      {particleConfig && (
        <ParticleSystem
          config={particleConfig}
          color={colorAccent}
          size={particleSize ?? 0.01}
          sdfData={particleSdfData}
          fieldParams={particleFieldParams}
        />
      )}
```

- [ ] **Step 2: Verify the configurator still loads**

Run: `pnpm --filter @bigpuddle/dot-engine-configurator dev` (already running in background)
Open http://localhost:3100/ — verify the canvas renders, select a vibe with particles (e.g. "bold" or "neon" for edges mode), confirm particles appear near the logo outline instead of randomly scattered.

- [ ] **Step 3: Commit**

```bash
git add packages/configurator/src/components/Canvas3D.tsx
git commit -m "feat(configurator): wire SDF data + field params to ParticleSystem"
```

---

### Task 6: Fix Logo File Upload

**Files:**
- Modify: `packages/configurator/src/components/LeftPanel.tsx`
- Modify: `packages/configurator/src/App.tsx`

- [ ] **Step 1: Update LeftPanel — add handleFileChange and onFileLoad prop**

In `packages/configurator/src/components/LeftPanel.tsx`:

Add import:
```ts
import type { LogoInput } from '@bigpuddle/dot-engine-brand';
```

Add `onFileLoad` to `LeftPanelProps` interface (after the `onImageLoad` prop):
```ts
  onFileLoad: (input: LogoInput) => void;
```

Add it to the destructured props in the `LeftPanel` function signature (after `onImageLoad`):
```ts
  onFileLoad,
```

Add `handleFileChange` handler (after the `handleImageChange` function):
```ts
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'svg') {
      onFileLoad({ type: 'svg', source: url });
    } else {
      onFileLoad({ type: 'image', source: url });
    }
    setLogoMode('file');
    e.target.value = '';
  }
```

Replace the file input `onChange` (line 174):

Replace:
```tsx
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,.png,.jpg"
          style={{ display: 'none' }}
          onChange={() => setLogoMode('file')}
        />
```

With:
```tsx
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,.png,.jpg"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
```

When `logoMode === 'file'`, hide the font/weight controls. Replace the `{logoMode === 'text' && (` block (lines 185-209) with:
```tsx
        {logoMode === 'text' && (
          <>
            <div className="input-row" style={{ marginBottom: 8 }}>
              <span className="panel-label">Font</span>
              <select
                className="panel-select"
                value={logoFont}
                onChange={e => setLogoFont(e.target.value)}
                aria-label="Logo font"
              >
                {FONTS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <Slider
              label="Weight"
              value={fontWeight}
              onChange={v => setFontWeight(Math.round(v))}
              accent="var(--accent-blue)"
              min={100}
              max={900}
            />
          </>
        )}
```

(This block is unchanged — it already hides font controls when `logoMode !== 'text'`.)

- [ ] **Step 2: Update App.tsx — add fileLogoInput state and wire defineBrand**

In `packages/configurator/src/App.tsx`:

Add import for `LogoInput`:
```ts
import { defineBrand, text, type Brand, type BrandContext, type ImageFieldData, type LogoInput } from '@bigpuddle/dot-engine-brand';
```

Add state after existing state declarations (around line 22):
```ts
  const [fileLogoInput, setFileLogoInput] = useState<LogoInput | null>(null);
```

Update the `defineBrand` effect (lines 85-127). Replace the logo line:

Replace:
```ts
          logo: text(name, { font: logoFont, weight: fontWeight }),
```

With:
```ts
          logo: logoMode === 'file' && fileLogoInput
            ? fileLogoInput
            : text(name, { font: logoFont, weight: fontWeight }),
```

Add `logoMode` and `fileLogoInput` to the effect dependency array (lines 115-127):

Replace:
```ts
  }, [
    name,
    logoFont,
    fontWeight,
    colorPrimary,
    colorAccent,
    colorBackground,
    advancedSettings.energy,
    advancedSettings.organic,
    advancedSettings.density,
    advancedSettings.motionStyle,
    advancedSettings.motionSpeed,
  ]);
```

With:
```ts
  }, [
    name,
    logoMode,
    fileLogoInput,
    logoFont,
    fontWeight,
    colorPrimary,
    colorAccent,
    colorBackground,
    advancedSettings.energy,
    advancedSettings.organic,
    advancedSettings.density,
    advancedSettings.motionStyle,
    advancedSettings.motionSpeed,
  ]);
```

Pass `onFileLoad` to `LeftPanel` (around line 193 in the JSX):

Add after the `onImageLoad={setImageData}` line:
```tsx
          onFileLoad={setFileLogoInput}
```

- [ ] **Step 3: Verify logo upload works**

Open http://localhost:3100/. Click "File" button, select an SVG or PNG logo. Verify:
1. The dot field reshapes to match the uploaded logo
2. Switching back to "Text" mode restores the text-based SDF
3. No console errors

- [ ] **Step 4: Commit**

```bash
git add packages/configurator/src/components/LeftPanel.tsx packages/configurator/src/App.tsx
git commit -m "fix(configurator): wire logo file upload to importLogo and defineBrand"
```

---

### Task 7: Retune Vibes and Fix applyIntensity

**Files:**
- Modify: `packages/configurator/src/vibes.ts`

- [ ] **Step 1: Update vibes.ts**

Replace the full `VIBES` array and `applyIntensity` in `packages/configurator/src/vibes.ts`:

Replace the `applyIntensity` function:
```ts
export function applyIntensity(vibe: Vibe, intensity: number): VibeSettings {
  const scale = 0.3 + intensity * 1.4; // maps 0-1 to 0.3-1.7x
  return {
    energy: clamp(vibe.energy * scale, 0, 1),
    organic: clamp(vibe.organic * (0.8 + intensity * 0.4), 0, 1),
    density: clamp(vibe.density * (0.7 + intensity * 0.6), 0.2, 0.9),
    motionStyle: vibe.motionStyle,
    motionSpeed: clamp(vibe.motionSpeed * scale, 0.05, 1),
    particleMode: vibe.particleMode,
    dotSizeMin: vibe.dotSizeMin,
    dotSizeMax: clamp(vibe.dotSizeMax * (0.5 + intensity), 0.005, 0.05),
    edgeSoftness: clamp(vibe.edgeSoftness * scale, 0.01, 0.15),
    twist: vibe.twist * scale,
    bend: vibe.bend * scale,
    mirrorX: vibe.mirrorX,
    mirrorY: vibe.mirrorY,
  };
}
```

Replace the `VIBES` array with tuned values:

```ts
export const VIBES: Vibe[] = [
  {
    name: 'minimal',
    label: 'Minimal',
    description: 'Clean, precise, understated',
    icon: '○',
    energy: 0.1, organic: 0.15, density: 0.35,
    motionStyle: 'breathe', motionSpeed: 0.08,
    particleMode: 'none',
    dotSizeMin: 0.003, dotSizeMax: 0.015, edgeSoftness: 0.02,
    twist: 0, bend: 0, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#e0e0e0', suggestedAccent: '#808080',
  },
  {
    name: 'elegant',
    label: 'Elegant',
    description: 'Refined, flowing, luxurious',
    icon: '◇',
    energy: 0.3, organic: 0.75, density: 0.5,
    motionStyle: 'flow', motionSpeed: 0.18,
    particleMode: 'ambient',
    dotSizeMin: 0.002, dotSizeMax: 0.012, edgeSoftness: 0.06,
    twist: 0.15, bend: 0.1, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#c4a35a', suggestedAccent: '#2a1f3d',
  },
  {
    name: 'bold',
    label: 'Bold',
    description: 'Strong, confident, impactful',
    icon: '■',
    energy: 0.7, organic: 0.2, density: 0.7,
    motionStyle: 'pulse', motionSpeed: 0.55,
    particleMode: 'edges',
    dotSizeMin: 0.004, dotSizeMax: 0.025, edgeSoftness: 0.03,
    twist: 0, bend: 0, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#ff3b3b', suggestedAccent: '#1a1a2e',
  },
  {
    name: 'organic',
    label: 'Organic',
    description: 'Natural, alive, breathing',
    icon: '❋',
    energy: 0.45, organic: 0.95, density: 0.45,
    motionStyle: 'flow', motionSpeed: 0.3,
    particleMode: 'ambient',
    dotSizeMin: 0.002, dotSizeMax: 0.018, edgeSoftness: 0.09,
    twist: 0.1, bend: 0.15, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#2D7A4A', suggestedAccent: '#E07A5F',
  },
  {
    name: 'energetic',
    label: 'Energetic',
    description: 'Dynamic, fast, explosive',
    icon: '⚡',
    energy: 0.9, organic: 0.5, density: 0.6,
    motionStyle: 'pulse', motionSpeed: 0.8,
    particleMode: 'burst',
    dotSizeMin: 0.003, dotSizeMax: 0.02, edgeSoftness: 0.05,
    twist: 0.5, bend: 0.3, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#ff6b4a', suggestedAccent: '#4a9eff',
  },
  {
    name: 'cosmic',
    label: 'Cosmic',
    description: 'Ethereal, vast, mysterious',
    icon: '✦',
    energy: 0.3, organic: 0.85, density: 0.25,
    motionStyle: 'flow', motionSpeed: 0.15,
    particleMode: 'rising',
    dotSizeMin: 0.001, dotSizeMax: 0.01, edgeSoftness: 0.1,
    twist: 0.3, bend: 0.15, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#6b5bff', suggestedAccent: '#00e5ff',
  },
  {
    name: 'industrial',
    label: 'Industrial',
    description: 'Raw, mechanical, structured',
    icon: '⬡',
    energy: 0.35, organic: 0.05, density: 0.8,
    motionStyle: 'none', motionSpeed: 0.05,
    particleMode: 'none',
    dotSizeMin: 0.005, dotSizeMax: 0.02, edgeSoftness: 0.01,
    twist: 0, bend: 0, mirrorX: true, mirrorY: false,
    suggestedPrimary: '#aaaaaa', suggestedAccent: '#444444',
  },
  {
    name: 'neon',
    label: 'Neon',
    description: 'Electric, glowing, cyberpunk',
    icon: '◈',
    energy: 0.75, organic: 0.4, density: 0.55,
    motionStyle: 'pulse', motionSpeed: 0.65,
    particleMode: 'edges',
    dotSizeMin: 0.002, dotSizeMax: 0.015, edgeSoftness: 0.07,
    twist: 0.2, bend: 0, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#00ff88', suggestedAccent: '#ff00ff',
  },
  {
    name: 'zen',
    label: 'Zen',
    description: 'Calm, balanced, meditative',
    icon: '◎',
    energy: 0.08, organic: 0.7, density: 0.25,
    motionStyle: 'breathe', motionSpeed: 0.06,
    particleMode: 'ambient',
    dotSizeMin: 0.002, dotSizeMax: 0.012, edgeSoftness: 0.08,
    twist: 0, bend: 0, mirrorX: false, mirrorY: true,
    suggestedPrimary: '#8fbc8f', suggestedAccent: '#deb887',
  },
  {
    name: 'glitch',
    label: 'Glitch',
    description: 'Broken, distorted, chaotic',
    icon: '▓',
    energy: 0.95, organic: 0.3, density: 0.65,
    motionStyle: 'pulse', motionSpeed: 0.95,
    particleMode: 'burst',
    dotSizeMin: 0.003, dotSizeMax: 0.025, edgeSoftness: 0.02,
    twist: 1.5, bend: 0.8, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#00ff00', suggestedAccent: '#ff0000',
  },
  {
    name: 'frost',
    label: 'Frost',
    description: 'Cold, crystalline, delicate',
    icon: '❄',
    energy: 0.2, organic: 0.6, density: 0.4,
    motionStyle: 'breathe', motionSpeed: 0.1,
    particleMode: 'rising',
    dotSizeMin: 0.001, dotSizeMax: 0.008, edgeSoftness: 0.06,
    twist: 0.1, bend: 0.1, mirrorX: true, mirrorY: true,
    suggestedPrimary: '#a8d8ea', suggestedAccent: '#ffffff',
  },
  {
    name: 'ember',
    label: 'Ember',
    description: 'Warm, smoldering, intense',
    icon: '🔥',
    energy: 0.6, organic: 0.75, density: 0.45,
    motionStyle: 'flow', motionSpeed: 0.45,
    particleMode: 'rising',
    dotSizeMin: 0.002, dotSizeMax: 0.02, edgeSoftness: 0.07,
    twist: 0.15, bend: 0.3, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#ff4500', suggestedAccent: '#ffd700',
  },
];
```

- [ ] **Step 2: Run full test suite to check for regressions**

Run: `pnpm vitest run`
Expected: All tests PASS

- [ ] **Step 3: Verify vibes in the configurator**

Open http://localhost:3100/. Click through all 12 vibes, adjusting intensity. Verify:
1. Each vibe feels visually distinct
2. Intensity slider has noticeable effect on organic/density
3. Particle modes work as expected per vibe

- [ ] **Step 4: Commit**

```bash
git add packages/configurator/src/vibes.ts
git commit -m "feat(configurator): retune all 12 vibes and fix applyIntensity organic scaling"
```

---

### Task 8: Dead Code Cleanup

**Files:**
- Delete: `packages/core/src/presets.ts`
- Delete: `packages/core/__tests__/presets.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/brand/src/brand/particle-presets.ts`
- Modify: `packages/brand/src/index.ts`

- [ ] **Step 1: Remove core presets**

Delete `packages/core/src/presets.ts`.

Delete `packages/core/__tests__/presets.test.ts`.

In `packages/core/src/index.ts`, remove line 94:
```ts
export { definePreset, presets, type PresetConfig } from './presets.js';
```

- [ ] **Step 2: Remove static particlePresets record from brand**

In `packages/brand/src/brand/particle-presets.ts`, remove the `ParticlePresetName` type alias, `_defaultConfig`, `_defaultParams`, and `particlePresets` export. The file should become:

```ts
import { particles, pointEmitter, surfaceEmitter } from '@bigpuddle/dot-engine-core';
import type { ParticleNode } from '@bigpuddle/dot-engine-core';
import type { BrandConfig } from './types.js';
import type { MappedParams } from './personality.js';

export type ParticleMode = 'none' | 'ambient' | 'burst' | 'rising' | 'edges';

export function buildParticles(
  mode: ParticleMode,
  config: BrandConfig,
  params: MappedParams,
): ParticleNode | null {
  if (mode === 'none') return null;

  const speed = config.motion.speed * params.animateSpeed;
  const amount = params.displacementAmount;

  switch (mode) {
    case 'ambient':
      return particles({
        emitter: pointEmitter([0, 0, 0], 5 + params.animateSpeed * 10),
        lifecycle: { lifetime: 3 + (1 - params.animateSpeed) * 4, fadeIn: 0.5, fadeOut: 1.5 },
        motion: { speed: speed * 0.15, spread: 1, drag: 0.3, turbulence: amount * 1.5 },
        maxParticles: 80,
      });
    case 'burst':
      return particles({
        emitter: { type: 'point', position: [0, 0, 0], rate: 0, burst: 30 },
        lifecycle: { lifetime: 1.5 + speed, fadeIn: 0.05, fadeOut: 0.8 },
        motion: { speed: 0.5 + speed * 0.3, spread: 1, gravity: [0, -0.2, 0], drag: 0.1 },
        maxParticles: 50,
      });
    case 'rising':
      return particles({
        emitter: pointEmitter([0, -1, 0], 5 + params.animateSpeed * 8),
        lifecycle: { lifetime: 3, fadeIn: 0.3, fadeOut: 1 },
        motion: { velocity: [0, 1, 0], speed: 0.15 + speed * 0.2, spread: 0.3, turbulence: amount * 1 },
        maxParticles: 60,
      });
    case 'edges':
      return particles({
        emitter: surfaceEmitter(5 + params.animateSpeed * 10),
        lifecycle: { lifetime: 2 + (1 - params.animateSpeed) * 2, fadeIn: 0.2, fadeOut: 1.2 },
        motion: { speed: speed * 0.1, spread: 0.8, drag: 0.5, turbulence: amount * 1.5 },
        maxParticles: 60,
      });
    default:
      return null;
  }
}
```

- [ ] **Step 3: Update brand index.ts exports**

In `packages/brand/src/index.ts`, replace:
```ts
export { particlePresets, buildParticles } from './brand/particle-presets.js';
export type { ParticlePresetName, ParticleMode } from './brand/particle-presets.js';
```

With:
```ts
export { buildParticles } from './brand/particle-presets.js';
export type { ParticleMode } from './brand/particle-presets.js';
```

- [ ] **Step 4: Run full test suite**

Run: `pnpm vitest run`
Expected: All tests PASS. The deleted `presets.test.ts` no longer runs. No other tests import from `presets.ts` or `particlePresets`.

- [ ] **Step 5: Commit**

```bash
git add -u packages/core/src/presets.ts packages/core/__tests__/presets.test.ts packages/core/src/index.ts packages/brand/src/brand/particle-presets.ts packages/brand/src/index.ts
git commit -m "chore: remove dead core presets and static particlePresets record"
```

---

### Task 9: Final Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `pnpm vitest run`
Expected: All tests PASS, no regressions.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors across all packages.

- [ ] **Step 3: Manual smoke test in configurator**

Open http://localhost:3100/ and verify:
1. **Logo text mode** — default text SDF renders as dot field
2. **Logo file mode** — click File, upload SVG or PNG, dots reshape to uploaded logo
3. **Logo file → text switch** — switching back to Text restores text SDF
4. **Particles (edges)** — select Bold or Neon vibe, particles spawn along logo boundary, not randomly
5. **Particles (ambient)** — select Elegant or Organic, particles drift smoothly with curl noise
6. **Particles (rising)** — select Cosmic or Ember, particles rise from below with coherent flow
7. **Particles (burst)** — select Energetic or Glitch, burst particles explode outward
8. **Particle opacity** — particles fade in/out instead of just shrinking to nothing
9. **Intensity slider** — dragging intensity visibly changes energy, organic, density, dot sizes
10. **All 12 vibes** — click through each, confirm each feels distinct
11. **No console errors** — check browser dev tools

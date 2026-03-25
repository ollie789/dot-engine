import { describe, it, expect, beforeEach } from 'vitest';
import {
  createParticlePool,
  updateParticlePool,
  getParticleAlpha,
  PARTICLE_STRIDE,
} from '../src/particles/particlePool.js';
import { particles, pointEmitter, burstEmitter } from '../../core/src/nodes/particles.js';
import { _resetIds } from '../../core/src/nodes/types.js';

beforeEach(() => {
  _resetIds();
});

function makeConfig(overrides?: Partial<Parameters<typeof particles>[0]>) {
  return particles({
    emitter: pointEmitter([0, 0, 0], 10),
    lifecycle: { lifetime: 2, fadeIn: 0.1, fadeOut: 0.3 },
    motion: { speed: 1, spread: 0, velocity: [0, 1, 0] },
    maxParticles: 100,
    ...overrides,
  });
}

describe('createParticlePool', () => {
  it('starts with zero alive particles', () => {
    const state = createParticlePool(100);
    expect(state.alive).toBe(0);
  });

  it('allocates correct pool size', () => {
    const state = createParticlePool(50);
    expect(state.pool.length).toBe(50 * PARTICLE_STRIDE);
  });

  it('starts with bursted = false', () => {
    const state = createParticlePool(100);
    expect(state.bursted).toBe(false);
  });
});

describe('emitting particles', () => {
  it('emits particles based on rate * dt', () => {
    const config = makeConfig({ emitter: pointEmitter([0, 0, 0], 100) });
    const state = createParticlePool(200);
    updateParticlePool(state, 0.1, config, 200); // should emit ~10
    expect(state.alive).toBeGreaterThan(0);
    expect(state.alive).toBeLessThanOrEqual(200);
  });

  it('does not exceed maxParticles', () => {
    const config = makeConfig({ emitter: pointEmitter([0, 0, 0], 1000) });
    const state = createParticlePool(10);
    updateParticlePool(state, 1.0, config, 10);
    expect(state.alive).toBeLessThanOrEqual(10);
  });

  it('burst emitter spawns all particles at once on first frame', () => {
    const config = makeConfig({ emitter: burstEmitter(50) });
    const state = createParticlePool(200);
    updateParticlePool(state, 0.016, config, 200);
    expect(state.alive).toBe(50);
  });

  it('burst emitter does not spawn on subsequent frames', () => {
    const config = makeConfig({ emitter: burstEmitter(50) });
    const state = createParticlePool(200);
    updateParticlePool(state, 0.016, config, 200); // burst happens
    const aliveAfterBurst = state.alive;
    // All particles age but not die yet (lifetime=2, only 0.016s elapsed)
    updateParticlePool(state, 0.016, config, 200); // no new burst
    // alive should be same or slightly less (particles may not have died yet)
    expect(state.alive).toBeLessThanOrEqual(aliveAfterBurst);
    // No additional particles emitted
    expect(state.alive).toBe(aliveAfterBurst);
  });
});

describe('aging and killing particles', () => {
  it('kills particles when age >= lifetime', () => {
    // Use burst emitter so no new particles are emitted after the first frame
    const config = makeConfig({
      emitter: burstEmitter(20),
      lifecycle: { lifetime: 0.05, fadeIn: 0.01, fadeOut: 0.01 },
      motion: { speed: 0 },
    });
    const state = createParticlePool(200);
    // Burst: emits 20 particles
    updateParticlePool(state, 0.016, config, 200);
    const aliveAfterEmit = state.alive;
    expect(aliveAfterEmit).toBe(20);

    // Advance past lifetime (0.1s > 0.05s), no new particles since burst already fired
    updateParticlePool(state, 0.1, config, 200);
    expect(state.alive).toBeLessThan(aliveAfterEmit);
  });

  it('dead particles do not accumulate beyond maxParticles', () => {
    const config = makeConfig({
      emitter: pointEmitter([0, 0, 0], 1000),
      lifecycle: { lifetime: 0.01, fadeIn: 0.001, fadeOut: 0.001 },
    });
    const state = createParticlePool(20);
    for (let i = 0; i < 10; i++) {
      updateParticlePool(state, 0.016, config, 20);
    }
    expect(state.alive).toBeLessThanOrEqual(20);
  });
});

describe('gravity', () => {
  it('gravity changes velocity over time', () => {
    const config = makeConfig({
      emitter: burstEmitter(1),
      lifecycle: { lifetime: 10 },
      motion: { velocity: [0, 0, 0], speed: 0, spread: 0, gravity: [0, -9.8, 0] },
    });
    const state = createParticlePool(10);
    // Spawn particle
    updateParticlePool(state, 0.016, config, 10);
    expect(state.alive).toBe(1);

    const pool = state.pool;
    const vyBefore = pool[4]; // vy at index 1 (PARTICLE_STRIDE=8, offset 4)

    // Apply gravity for 1 second
    updateParticlePool(state, 1.0, config, 10);

    const vyAfter = pool[4];
    // vy should have decreased (become more negative) due to gravity
    expect(vyAfter).toBeLessThan(vyBefore);
  });
});

describe('drag', () => {
  it('drag reduces velocity toward zero', () => {
    const config = makeConfig({
      emitter: burstEmitter(1),
      lifecycle: { lifetime: 10 },
      motion: { velocity: [1, 0, 0], speed: 5, spread: 0, drag: 2 },
    });
    const state = createParticlePool(10);
    updateParticlePool(state, 0.016, config, 10); // spawn

    const pool = state.pool;
    const vxBefore = Math.abs(pool[3]);

    updateParticlePool(state, 0.5, config, 10); // significant drag
    const vxAfter = Math.abs(pool[3]);

    expect(vxAfter).toBeLessThan(vxBefore);
  });

  it('high drag does not invert velocity', () => {
    const config = makeConfig({
      emitter: burstEmitter(1),
      lifecycle: { lifetime: 10 },
      motion: { velocity: [0, 1, 0], speed: 1, spread: 0, drag: 100 },
    });
    const state = createParticlePool(10);
    updateParticlePool(state, 0.016, config, 10); // spawn

    updateParticlePool(state, 1.0, config, 10); // extreme drag

    const vy = state.pool[4];
    expect(vy).toBeGreaterThanOrEqual(0);
  });
});

describe('getParticleAlpha', () => {
  it('alpha is 0 at age 0 when fadeIn > 0', () => {
    const pool = new Float32Array(PARTICLE_STRIDE);
    pool[6] = 0;       // age = 0
    pool[7] = 2;       // lifetime = 2
    const alpha = getParticleAlpha(pool, 0, 0.5, 0.5);
    expect(alpha).toBe(0);
  });

  it('alpha approaches 1 in the middle of lifetime', () => {
    const pool = new Float32Array(PARTICLE_STRIDE);
    pool[6] = 1;       // age = 1 (midpoint of lifetime=2)
    pool[7] = 2;
    // fadeIn=0.1 -> fully faded in, fadeOut=0.3 -> 1s left > 0.3, so also full
    const alpha = getParticleAlpha(pool, 0, 0.1, 0.3);
    expect(alpha).toBeCloseTo(1, 2);
  });

  it('alpha decreases near end of lifetime', () => {
    const pool = new Float32Array(PARTICLE_STRIDE);
    pool[6] = 1.9;     // age near end (lifetime=2, fadeOut=0.3 → 0.1s left)
    pool[7] = 2;
    const alpha = getParticleAlpha(pool, 0, 0.1, 0.3);
    expect(alpha).toBeLessThan(1);
  });
});

describe('PARTICLE_STRIDE', () => {
  it('is 8', () => {
    expect(PARTICLE_STRIDE).toBe(8);
  });
});

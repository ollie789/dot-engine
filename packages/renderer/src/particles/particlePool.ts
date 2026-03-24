import type { ParticleNode, ParticleEmitter } from '@bigpuddle/dot-engine-core';

export const PARTICLE_STRIDE = 8;
// Layout per particle (8 floats):
//   [0] x  [1] y  [2] z
//   [3] vx [4] vy [5] vz
//   [6] age
//   [7] lifetime

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
    // Fully omnidirectional
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    out[0] = spd * Math.sin(phi) * Math.cos(theta);
    out[1] = spd * Math.sin(phi) * Math.sin(theta);
    out[2] = spd * Math.cos(phi);
    return;
  }

  if (spread <= 0) {
    // Focused along velocity direction
    const len = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2) || 1;
    out[0] = (velocity[0] / len) * spd;
    out[1] = (velocity[1] / len) * spd;
    out[2] = (velocity[2] / len) * spd;
    return;
  }

  // Cone blend: mix between focused and omnidirectional
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
): void {
  if (state.alive >= maxParticles) return;

  const { emitter, lifecycle, motion } = config;
  const si = state.alive * PARTICLE_STRIDE;

  // Position
  if (emitter.type === 'point' && emitter.position) {
    state.pool[si] = emitter.position[0];
    state.pool[si + 1] = emitter.position[1];
    state.pool[si + 2] = emitter.position[2];
  } else {
    // surface / volume: use random in unit cube [-1, 1]
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
  /** Number of alive particles after update */
  alive: number;
}

export function updateParticlePool(
  state: ParticlePoolState,
  dt: number,
  config: ParticleNode,
  maxParticles: number,
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
      spawnParticle(state, maxParticles, config);
    }
    state.bursted = true;
  } else if (emitter.rate > 0) {
    state.emitAccum += emitter.rate * dt;
    const toEmit = Math.floor(state.emitAccum);
    state.emitAccum -= toEmit;
    for (let i = 0; i < toEmit; i++) {
      spawnParticle(state, maxParticles, config);
    }
  }

  // Update alive particles, swap-kill dead ones
  let i = 0;
  while (i < state.alive) {
    const si = i * PARTICLE_STRIDE;
    const lifetime = pool[si + 7];

    // Age first
    pool[si + 6] += dt;
    const age = pool[si + 6];

    // Kill if past lifetime (swap with last alive, decrement, re-check slot)
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
      // Don't increment i — re-check this slot (which now holds swapped particle)
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
    const dragFactor = 1 - drag * dt;
    pool[si + 3] *= dragFactor;
    pool[si + 4] *= dragFactor;
    pool[si + 5] *= dragFactor;

    // Turbulence
    if (turbulence > 0) {
      const t = age * 3;
      pool[si] += (Math.sin(pool[si] * 7 + t) * 0.5 + Math.cos(pool[si + 1] * 5 + t * 1.3) * 0.3) * turbulence * dt;
      pool[si + 1] += (Math.sin(pool[si + 1] * 6 + t * 0.7) * 0.4 + Math.cos(pool[si + 2] * 8 + t * 1.1) * 0.3) * turbulence * dt;
      pool[si + 2] += (Math.cos(pool[si] * 5 + t * 0.9) * 0.4 + Math.sin(pool[si + 2] * 7 + t * 1.5) * 0.3) * turbulence * dt;
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

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
        emitter: pointEmitter([0, 0, 0], 8 + params.animateSpeed * 15),
        lifecycle: { lifetime: 3 + (1 - params.animateSpeed) * 3, fadeIn: 0.3, fadeOut: 1.0 },
        motion: { speed: 0.1 + speed * 0.3, spread: 1, drag: 0.15, turbulence: 0.3 + amount * 2 },
        maxParticles: 100,
      });
    case 'burst':
      return particles({
        emitter: { type: 'point', position: [0, 0, 0], rate: 0, burst: 40 },
        lifecycle: { lifetime: 1.2 + speed * 0.8, fadeIn: 0.03, fadeOut: 0.6 },
        motion: { speed: 0.8 + speed * 0.5, spread: 1, gravity: [0, -0.3, 0], drag: 0.05, turbulence: 0.1 },
        maxParticles: 60,
      });
    case 'rising':
      return particles({
        emitter: pointEmitter([0, -1.2, 0], 8 + params.animateSpeed * 12),
        lifecycle: { lifetime: 2.5, fadeIn: 0.2, fadeOut: 0.8 },
        motion: { velocity: [0, 1, 0], speed: 0.25 + speed * 0.4, spread: 0.25, drag: 0.05, turbulence: 0.2 + amount * 1.5 },
        maxParticles: 80,
      });
    case 'edges':
      return particles({
        emitter: surfaceEmitter(10 + params.animateSpeed * 15),
        lifecycle: { lifetime: 1.5 + (1 - params.animateSpeed) * 1.5, fadeIn: 0.1, fadeOut: 0.8 },
        motion: { speed: 0.15 + speed * 0.3, spread: 0.6, drag: 0.2, turbulence: 0.3 + amount * 2 },
        maxParticles: 80,
      });
    default:
      return null;
  }
}

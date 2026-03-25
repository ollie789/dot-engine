import { particles, pointEmitter, surfaceEmitter } from '@bigpuddle/dot-engine-core';
import type { ParticleNode } from '@bigpuddle/dot-engine-core';
import type { BrandConfig } from './types.js';
import type { MappedParams } from './personality.js';

export type ParticleMode = 'none' | 'ambient' | 'burst' | 'rising' | 'edges';

// Legacy alias used in existing exports
export type ParticlePresetName = ParticleMode;

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
      // Particles emit from the surface area (spread around origin matching the logo bounds)
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

// Legacy static preset record — kept for backwards compatibility but now returns
// sensible defaults using neutral brand config and default personality params
const _defaultConfig: BrandConfig = {
  colors: { primary: '#4a9eff', accent: '#ff6b4a', background: '#06060a' },
  personality: { energy: 0.6, organic: 0.7, density: 0.5 },
  motion: { style: 'flow', speed: 0.4 },
  logo: { type: 'text', text: '' },
};
const _defaultParams: MappedParams = {
  animateSpeed: 0.5,
  displacementAmount: 0.08,
  edgeSoftness: 0.05,
  useFlowField: true,
  gridResolution: 40,
};

export const particlePresets: Record<string, ParticleNode> = {
  ambientDrift: buildParticles('ambient', _defaultConfig, _defaultParams)!,
  burst: buildParticles('burst', _defaultConfig, _defaultParams)!,
  rising: buildParticles('rising', _defaultConfig, _defaultParams)!,
  edges: buildParticles('edges', _defaultConfig, _defaultParams)!,
};

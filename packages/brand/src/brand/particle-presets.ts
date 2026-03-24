import { particles, pointEmitter, burstEmitter } from '@dot-engine/core';
import type { ParticleNode } from '@dot-engine/core';

export const particlePresets: Record<string, ParticleNode> = {
  ambientDrift: particles({
    emitter: pointEmitter([0, 0, 0], 20),
    lifecycle: { lifetime: 4, fadeIn: 0.5, fadeOut: 1.5 },
    motion: { speed: 0.1, spread: 1, drag: 0.3, turbulence: 0.5 },
  }),

  burst: particles({
    emitter: burstEmitter(200),
    lifecycle: { lifetime: 2, fadeIn: 0.05, fadeOut: 0.8 },
    motion: { speed: 2, spread: 1, gravity: [0, -0.5, 0], drag: 0.1 },
  }),

  rising: particles({
    emitter: pointEmitter([0, -1, 0], 30),
    lifecycle: { lifetime: 3, fadeIn: 0.3, fadeOut: 1 },
    motion: { velocity: [0, 1, 0], speed: 0.5, spread: 0.3, turbulence: 0.3 },
  }),
};

export type ParticlePresetName = keyof typeof particlePresets;

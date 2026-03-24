import type { ParticleEmitter, ParticleLifecycle, ParticleMotion, ParticleNode } from './types.js';
import { nodeId } from './types.js';

export function particles(config: {
  emitter: ParticleEmitter;
  lifecycle: ParticleLifecycle;
  motion: ParticleMotion;
  maxParticles?: number;
}): ParticleNode {
  return {
    id: nodeId(),
    type: 'particle',
    emitter: config.emitter,
    lifecycle: config.lifecycle,
    motion: config.motion,
    maxParticles: config.maxParticles,
  };
}

export function pointEmitter(position: [number, number, number], rate: number): ParticleEmitter {
  return {
    type: 'point',
    position,
    rate,
  };
}

export function surfaceEmitter(rate: number): ParticleEmitter {
  return {
    type: 'surface',
    rate,
  };
}

export function burstEmitter(count: number): ParticleEmitter {
  return {
    type: 'point',
    rate: 0,
    burst: count,
  };
}

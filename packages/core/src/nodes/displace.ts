import {
  nodeId,
  Simplex3DConfig,
  DomainWarp3DConfig,
  FlowField3DConfig,
  AttractConfig,
  NoiseConfig,
  DisplaceNode,
} from './types.js';

export function simplex3D(opts: { scale: number; speed: number }): Simplex3DConfig {
  return {
    type: 'simplex3D',
    scale: opts.scale,
    speed: opts.speed,
  };
}

export function domainWarp3D(opts: {
  octaves: number;
  scale: number;
  speed?: number;
}): DomainWarp3DConfig {
  return {
    type: 'domainWarp3D',
    octaves: opts.octaves,
    scale: opts.scale,
    ...(opts.speed !== undefined ? { speed: opts.speed } : {}),
  };
}

export function flowField3D(opts: { scale: number; speed: number }): FlowField3DConfig {
  return {
    type: 'flowField3D',
    scale: opts.scale,
    speed: opts.speed,
  };
}

export function attract(
  target: [number, number, number],
  opts: { strength: number; falloff?: 'inverse' | 'linear' | 'exponential' },
): AttractConfig {
  return {
    type: 'attract',
    target,
    strength: opts.strength,
    falloff: opts.falloff ?? 'inverse',
  };
}

export function displace(noise: NoiseConfig, opts?: { amount?: number }): DisplaceNode {
  return {
    id: nodeId(),
    type: 'displace',
    noise,
    amount: opts?.amount ?? 1,
  };
}

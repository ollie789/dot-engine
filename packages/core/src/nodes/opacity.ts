import { nodeId, OpacityNode } from './types.js';

export function opacity(opts: {
  min: number;
  max: number;
  mode?: 'depth' | 'edgeGlow' | 'uniform';
}): OpacityNode {
  return {
    id: nodeId(),
    type: 'opacity',
    min: opts.min,
    max: opts.max,
    mode: opts.mode ?? 'depth',
  };
}

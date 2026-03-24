import { nodeId, SizeNode } from './types.js';

export function size(opts: {
  min: number;
  max: number;
  mode?: 'depth' | 'uniform';
}): SizeNode {
  return {
    id: nodeId(),
    type: 'size',
    min: opts.min,
    max: opts.max,
    mode: opts.mode ?? 'depth',
  };
}

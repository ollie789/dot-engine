import { nodeId, AnimateNode } from './types.js';

export interface AnimateOptions {
  speed: number;
  reducedMotion?: 'static' | 'reduced';
}

export function animate(opts: AnimateOptions): AnimateNode {
  return {
    id: nodeId(),
    type: 'animate',
    speed: opts.speed,
    ...(opts.reducedMotion !== undefined ? { reducedMotion: opts.reducedMotion } : {}),
  };
}

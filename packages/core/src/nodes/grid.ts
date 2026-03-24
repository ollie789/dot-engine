import { nodeId, GridNode } from './types.js';

export interface GridOptions {
  type: 'uniform';
  resolution: [number, number, number];
  bounds?: [number, number, number];
}

export function grid(opts: GridOptions): GridNode {
  return {
    id: nodeId(),
    type: 'grid',
    gridType: opts.type,
    resolution: opts.resolution,
    ...(opts.bounds !== undefined ? { bounds: opts.bounds } : {}),
  };
}

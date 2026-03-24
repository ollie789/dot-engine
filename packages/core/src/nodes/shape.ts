import { nodeId, SdfNode, ShapeNode } from './types.js';

export function shape(sdf: SdfNode): ShapeNode {
  return { id: nodeId(), type: 'shape', sdf };
}

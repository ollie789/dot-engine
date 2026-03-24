import { nodeId, TextureSdfNode } from '../nodes/types.js';

export interface TextureSdfOptions {
  depth: number;
  aspectRatio: number;
}

export function textureSdf(textureId: string, options: TextureSdfOptions): TextureSdfNode {
  return {
    id: nodeId(),
    type: 'textureSdf',
    textureId,
    depth: options.depth,
    aspectRatio: options.aspectRatio,
  };
}

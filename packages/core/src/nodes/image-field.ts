import { nodeId } from './types.js';
import type { ImageFieldNode } from './types.js';

export function imageField(
  textureId: string,
  opts?: {
    mode?: 'brightness' | 'alpha';
    colorFromImage?: boolean;
    threshold?: number;
    depth?: number;
  },
): ImageFieldNode {
  return {
    id: nodeId(),
    type: 'imageField',
    textureId,
    mode: opts?.mode ?? 'brightness',
    colorFromImage: opts?.colorFromImage ?? false,
    threshold: opts?.threshold,
    depth: opts?.depth,
  };
}

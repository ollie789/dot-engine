import {
  nodeId,
  SdfNode,
  UnionNode,
  SmoothUnionNode,
  SubtractNode,
  SmoothSubtractNode,
  IntersectNode,
  SmoothIntersectNode,
  OnionNode,
} from '../nodes/types.js';

export function union(a: SdfNode, b: SdfNode): UnionNode {
  return { id: nodeId(), type: 'union', a, b };
}

export function smoothUnion(a: SdfNode, b: SdfNode, k: number): SmoothUnionNode {
  if (k <= 0) throw new Error('smoothUnion: k must be > 0 (got ' + k + ')');
  return { id: nodeId(), type: 'smoothUnion', a, b, k };
}

export function subtract(a: SdfNode, b: SdfNode): SubtractNode {
  return { id: nodeId(), type: 'subtract', a, b };
}

export function smoothSubtract(a: SdfNode, b: SdfNode, k: number): SmoothSubtractNode {
  if (k <= 0) throw new Error('smoothSubtract: k must be > 0 (got ' + k + ')');
  return { id: nodeId(), type: 'smoothSubtract', a, b, k };
}

export function intersect(a: SdfNode, b: SdfNode): IntersectNode {
  return { id: nodeId(), type: 'intersect', a, b };
}

export function smoothIntersect(a: SdfNode, b: SdfNode, k: number): SmoothIntersectNode {
  if (k <= 0) throw new Error('smoothIntersect: k must be > 0 (got ' + k + ')');
  return { id: nodeId(), type: 'smoothIntersect', a, b, k };
}

export function onion(child: SdfNode, thickness: number): OnionNode {
  return { id: nodeId(), type: 'onion', child, thickness };
}

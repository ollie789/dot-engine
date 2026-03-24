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
  return { id: nodeId(), type: 'smoothUnion', a, b, k };
}

export function subtract(a: SdfNode, b: SdfNode): SubtractNode {
  return { id: nodeId(), type: 'subtract', a, b };
}

export function smoothSubtract(a: SdfNode, b: SdfNode, k: number): SmoothSubtractNode {
  return { id: nodeId(), type: 'smoothSubtract', a, b, k };
}

export function intersect(a: SdfNode, b: SdfNode): IntersectNode {
  return { id: nodeId(), type: 'intersect', a, b };
}

export function smoothIntersect(a: SdfNode, b: SdfNode, k: number): SmoothIntersectNode {
  return { id: nodeId(), type: 'smoothIntersect', a, b, k };
}

export function onion(child: SdfNode, thickness: number): OnionNode {
  return { id: nodeId(), type: 'onion', child, thickness };
}

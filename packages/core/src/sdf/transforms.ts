import {
  nodeId,
  SdfNode,
  TranslateNode,
  RotateNode,
  ScaleNode,
} from '../nodes/types.js';

export function translate(
  child: SdfNode,
  offset: [number, number, number],
): TranslateNode {
  return { id: nodeId(), type: 'translate', child, offset };
}

export function rotate(
  child: SdfNode,
  angles: [number, number, number],
): RotateNode {
  return { id: nodeId(), type: 'rotate', child, angles };
}

export function scale(child: SdfNode, factor: number): ScaleNode {
  return { id: nodeId(), type: 'scale', child, factor };
}

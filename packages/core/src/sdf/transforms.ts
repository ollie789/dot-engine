import {
  nodeId,
  SdfNode,
  TranslateNode,
  RotateNode,
  ScaleNode,
  TwistNode,
  BendNode,
  RepeatNode,
  MirrorNode,
  ElongateNode,
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

export function twist(child: SdfNode, amount: number): TwistNode {
  return { id: nodeId(), type: 'twist', child, amount };
}

export function bend(child: SdfNode, amount: number): BendNode {
  return { id: nodeId(), type: 'bend', child, amount };
}

export function repeat(child: SdfNode, spacing: [number, number, number]): RepeatNode {
  return { id: nodeId(), type: 'repeat', child, spacing };
}

export function mirror(child: SdfNode, axis: 'x' | 'y' | 'z'): MirrorNode {
  return { id: nodeId(), type: 'mirror', child, axis };
}

export function elongate(child: SdfNode, amount: [number, number, number]): ElongateNode {
  return { id: nodeId(), type: 'elongate', child, amount };
}

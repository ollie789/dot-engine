import { displace, simplex3D, flowField3D } from '@dot-engine/core';
import type { DisplaceNode } from '@dot-engine/core';

export type MotionStyle = 'flow' | 'breathe' | 'pulse' | 'none';

export function motionToDisplacements(
  style: MotionStyle, speed: number, amount: number, useFlowField: boolean
): DisplaceNode[] {
  switch (style) {
    case 'flow': {
      const nodes = [displace(simplex3D({ scale: 3, speed: speed * 0.5 }), { amount })];
      if (useFlowField) nodes.push(displace(flowField3D({ scale: 2, speed: speed * 0.7 }), { amount: amount * 0.6 }));
      return nodes;
    }
    case 'breathe': return [displace(simplex3D({ scale: 2, speed: speed * 0.2 }), { amount: amount * 0.5 })];
    case 'pulse': return [displace(simplex3D({ scale: 4, speed: speed * 2 }), { amount: amount * 1.2 })];
    case 'none': return [];
  }
}

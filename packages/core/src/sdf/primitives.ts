import {
  nodeId,
  SphereNode,
  BoxNode,
  TorusNode,
  CylinderNode,
  CapsuleNode,
  ConeNode,
  PlaneNode,
  MetaballNode,
} from '../nodes/types.js';

export function sphere(radius: number): SphereNode {
  return { id: nodeId(), type: 'sphere', radius };
}

export function box(
  halfExtents: [number, number, number],
  edgeRadius?: number,
): BoxNode {
  return { id: nodeId(), type: 'box', halfExtents, ...(edgeRadius !== undefined ? { edgeRadius } : {}) };
}

export function torus(majorR: number, minorR: number): TorusNode {
  return { id: nodeId(), type: 'torus', majorR, minorR };
}

export function cylinder(radius: number, height: number): CylinderNode {
  return { id: nodeId(), type: 'cylinder', radius, height };
}

export function capsule(radius: number, height: number): CapsuleNode {
  return { id: nodeId(), type: 'capsule', radius, height };
}

export function cone(radius: number, height: number): ConeNode {
  return { id: nodeId(), type: 'cone', radius, height };
}

export function plane(normal: [number, number, number], offset: number): PlaneNode {
  return { id: nodeId(), type: 'plane', normal, offset };
}

export function metaball(
  centers: { position: [number, number, number]; radius: number }[],
  threshold?: number,
): MetaballNode {
  return { id: nodeId(), type: 'metaball', centers, threshold: threshold ?? 1.0 };
}

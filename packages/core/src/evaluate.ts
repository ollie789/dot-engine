import { SdfNode } from './nodes/types.js';

type Vec3 = [number, number, number];

// ---------------------------------------------------------------------------
// Vector helpers
// ---------------------------------------------------------------------------

function len2(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function len3(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

// ---------------------------------------------------------------------------
// Smooth-min (cubic polynomial variant from Inigo Quilez)
// ---------------------------------------------------------------------------

function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * h * k) / 6;
}

// ---------------------------------------------------------------------------
// Rotation helpers (Euler X/Y/Z)
// ---------------------------------------------------------------------------

function rotateX(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [p[0], c * p[1] - s * p[2], s * p[1] + c * p[2]];
}

function rotateY(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]];
}

function rotateZ(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]];
}

// ---------------------------------------------------------------------------
// Main evaluator
// ---------------------------------------------------------------------------

export function evaluateSdf(node: SdfNode, p: Vec3): number {
  switch (node.type) {
    // ---- Primitives --------------------------------------------------------

    case 'sphere': {
      return len3(p[0], p[1], p[2]) - node.radius;
    }

    case 'box': {
      const er = node.edgeRadius ?? 0;
      const [hx, hy, hz] = node.halfExtents;
      const qx = Math.abs(p[0]) - (hx - er);
      const qy = Math.abs(p[1]) - (hy - er);
      const qz = Math.abs(p[2]) - (hz - er);
      return (
        len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) +
        Math.min(Math.max(qx, qy, qz), 0) -
        er
      );
    }

    case 'torus': {
      const qx = len2(p[0], p[2]) - node.majorR;
      return len2(qx, p[1]) - node.minorR;
    }

    case 'cylinder': {
      const dR = len2(p[0], p[2]) - node.radius;
      const dV = Math.abs(p[1]) - node.height / 2;
      return (
        len2(Math.max(dR, 0), Math.max(dV, 0)) + Math.min(Math.max(dR, dV), 0)
      );
    }

    case 'capsule': {
      const halfH = node.height / 2;
      const clamped = Math.max(-halfH, Math.min(halfH, p[1]));
      const dx = p[0];
      const dy = p[1] - clamped;
      const dz = p[2];
      return len3(dx, dy, dz) - node.radius;
    }

    case 'cone': {
      const halfH = node.height / 2;
      const hyp = Math.sqrt(node.radius * node.radius + node.height * node.height);
      const sinA = node.radius / hyp;
      const cosA = node.height / hyp;
      // Shift so tip is at top: py = p.y - halfH
      const py = p[1] - halfH;
      const q = len2(p[0], p[2]);
      return Math.max(sinA * q + cosA * (-py), -py - node.height);
    }

    case 'plane': {
      const [nx, ny, nz] = node.normal;
      return p[0] * nx + p[1] * ny + p[2] * nz - node.offset;
    }

    case 'customSdf': {
      throw new Error('evaluateSdf: cannot evaluate GLSL customSdf in JavaScript');
    }

    case 'fromField2D': {
      throw new Error('evaluateSdf: fromField2D is not implemented in Phase 1');
    }

    // ---- Booleans ----------------------------------------------------------

    case 'union': {
      return Math.min(evaluateSdf(node.a, p), evaluateSdf(node.b, p));
    }

    case 'smoothUnion': {
      return smin(evaluateSdf(node.a, p), evaluateSdf(node.b, p), node.k);
    }

    case 'subtract': {
      return Math.max(evaluateSdf(node.a, p), -evaluateSdf(node.b, p));
    }

    case 'smoothSubtract': {
      const a = evaluateSdf(node.a, p);
      const b = evaluateSdf(node.b, p);
      const h = Math.max(node.k - Math.abs(a + b), 0) / node.k;
      return Math.max(a, -b) + (h * h * h * node.k) / 6;
    }

    case 'intersect': {
      return Math.max(evaluateSdf(node.a, p), evaluateSdf(node.b, p));
    }

    case 'smoothIntersect': {
      // -smin(-a, -b, k)
      const a = evaluateSdf(node.a, p);
      const b = evaluateSdf(node.b, p);
      const h = Math.max(node.k - Math.abs(a - b), 0) / node.k;
      return Math.max(a, b) + (h * h * h * node.k) / 6;
    }

    case 'onion': {
      return Math.abs(evaluateSdf(node.child, p)) - node.thickness;
    }

    // ---- Transforms --------------------------------------------------------

    case 'translate': {
      const tp: Vec3 = [
        p[0] - node.offset[0],
        p[1] - node.offset[1],
        p[2] - node.offset[2],
      ];
      return evaluateSdf(node.child, tp);
    }

    case 'rotate': {
      // Apply rotations in reverse order (Z, Y, X) with negated angles for inverse
      const [ax, ay, az] = node.angles;
      let rp: Vec3 = [...p];
      rp = rotateZ(rp, -az);
      rp = rotateY(rp, -ay);
      rp = rotateX(rp, -ax);
      return evaluateSdf(node.child, rp);
    }

    case 'scale': {
      const sp: Vec3 = [p[0] / node.factor, p[1] / node.factor, p[2] / node.factor];
      return evaluateSdf(node.child, sp) * node.factor;
    }

    default: {
      const _exhaustive: never = node;
      throw new Error(`evaluateSdf: unhandled node type: ${(_exhaustive as SdfNode).type}`);
    }
  }
}

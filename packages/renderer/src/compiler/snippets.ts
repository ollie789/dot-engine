import type { SdfNode } from '@dot-engine/core';

export interface GlslSnippet {
  fnName: string;
  code: string;
  deps: string[];
}

// Format a number for GLSL — always include a decimal point.
function f(n: number): string {
  const s = n.toString();
  return s.includes('.') ? s : s + '.0';
}

function emitNode(node: SdfNode, out: Map<string, GlslSnippet>): string {
  const fnName = `sdf_${node.id}`;

  // Already emitted
  if (out.has(fnName)) return fnName;

  const deps: string[] = [];
  let body: string;

  switch (node.type) {
    case 'sphere': {
      body = `  return length(p) - ${f(node.radius)};`;
      break;
    }

    case 'box': {
      const [hx, hy, hz] = node.halfExtents;
      const r = node.edgeRadius ?? 0;
      body = [
        `  vec3 q = abs(p) - vec3(${f(hx - r)}, ${f(hy - r)}, ${f(hz - r)});`,
        `  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - ${f(r)};`,
      ].join('\n');
      break;
    }

    case 'torus': {
      body = [
        `  vec2 q = vec2(length(p.xz) - ${f(node.majorR)}, p.y);`,
        `  return length(q) - ${f(node.minorR)};`,
      ].join('\n');
      break;
    }

    case 'cylinder': {
      const halfH = node.height / 2;
      body = [
        `  float dR = length(p.xz) - ${f(node.radius)};`,
        `  float dV = abs(p.y) - ${f(halfH)};`,
        `  return length(max(vec2(dR, dV), 0.0)) + min(max(dR, dV), 0.0);`,
      ].join('\n');
      break;
    }

    case 'capsule': {
      const halfH = node.height / 2;
      body = [
        `  float h = clamp(p.y, ${f(-halfH)}, ${f(halfH)});`,
        `  return length(p - vec3(0.0, h, 0.0)) - ${f(node.radius)};`,
      ].join('\n');
      break;
    }

    case 'cone': {
      // Apex at top, base at bottom. Shift so center is at origin.
      const halfH = node.height / 2;
      const sinA = node.radius / Math.sqrt(node.radius * node.radius + node.height * node.height);
      const cosA = node.height / Math.sqrt(node.radius * node.radius + node.height * node.height);
      body = [
        `  vec2 cq = vec2(${f(sinA)}, ${f(cosA)});`,
        `  vec2 w = vec2(length(p.xz), p.y + ${f(halfH)});`,
        `  float dotWQ = dot(w, cq);`,
        `  float dotWQN = dot(w, vec2(cq.y, -cq.x));`,
        `  float d1 = length(w - cq * clamp(dotWQ, 0.0, ${f(node.height)}));`,
        `  float d2 = length(w - vec2(${f(node.radius)}, 0.0) * clamp(w.x / ${f(node.radius)}, 0.0, 1.0));`,
        `  float s = (dotWQN > 0.0 || w.y > ${f(node.height)} || (dotWQ > ${f(node.height)} && w.x < ${f(node.radius)})) ? 1.0 : -1.0;`,
        `  return s * min(d1, d2);`,
      ].join('\n');
      break;
    }

    case 'plane': {
      const [nx, ny, nz] = node.normal;
      body = `  return dot(p, vec3(${f(nx)}, ${f(ny)}, ${f(nz)})) - ${f(node.offset)};`;
      break;
    }

    case 'customSdf': {
      body = node.glsl;
      break;
    }

    case 'fromField2D': {
      console.warn('fromField2D is not implemented in Phase 1 GLSL compiler; returning 1e10');
      body = `  return 1e10;`;
      break;
    }

    case 'textureSdf': {
      const tid = node.textureId;
      body = [
        `  vec2 uv = vec2(p.x * ${f(node.aspectRatio)}, -p.y) * 0.5 + 0.5;`,
        `  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 1.0;`,
        `  float d2d = texture2D(uLogoSDF_${tid}, uv).r;`,
        `  float dz = abs(p.z) - ${f(node.depth * 0.5)};`,
        `  return max(d2d, dz);`,
      ].join('\n');
      break;
    }

    // Boolean nodes
    case 'union': {
      const aFn = emitNode(node.a, out);
      const bFn = emitNode(node.b, out);
      deps.push(aFn, bFn);
      body = `  return min(${aFn}(p), ${bFn}(p));`;
      break;
    }

    case 'smoothUnion': {
      const aFn = emitNode(node.a, out);
      const bFn = emitNode(node.b, out);
      deps.push(aFn, bFn);
      body = `  return smin(${aFn}(p), ${bFn}(p), ${f(node.k)});`;
      break;
    }

    case 'subtract': {
      const aFn = emitNode(node.a, out);
      const bFn = emitNode(node.b, out);
      deps.push(aFn, bFn);
      body = `  return max(${aFn}(p), -${bFn}(p));`;
      break;
    }

    case 'smoothSubtract': {
      const aFn = emitNode(node.a, out);
      const bFn = emitNode(node.b, out);
      deps.push(aFn, bFn);
      body = `  return -smin(-${aFn}(p), ${bFn}(p), ${f(node.k)});`;
      break;
    }

    case 'intersect': {
      const aFn = emitNode(node.a, out);
      const bFn = emitNode(node.b, out);
      deps.push(aFn, bFn);
      body = `  return max(${aFn}(p), ${bFn}(p));`;
      break;
    }

    case 'smoothIntersect': {
      const aFn = emitNode(node.a, out);
      const bFn = emitNode(node.b, out);
      deps.push(aFn, bFn);
      body = `  return -smin(-${aFn}(p), -${bFn}(p), ${f(node.k)});`;
      break;
    }

    case 'onion': {
      const childFn = emitNode(node.child, out);
      deps.push(childFn);
      body = `  return abs(${childFn}(p)) - ${f(node.thickness)};`;
      break;
    }

    // Transform nodes
    case 'translate': {
      const childFn = emitNode(node.child, out);
      deps.push(childFn);
      const [ox, oy, oz] = node.offset;
      body = `  return ${childFn}(p - vec3(${f(ox)}, ${f(oy)}, ${f(oz)}));`;
      break;
    }

    case 'rotate': {
      const childFn = emitNode(node.child, out);
      deps.push(childFn);
      // Negate angles for inverse transform (rotate point back into object space)
      const [ax, ay, az] = node.angles.map((a) => -a);
      const cX = Math.cos(ax), sX = Math.sin(ax);
      const cY = Math.cos(ay), sY = Math.sin(ay);
      const cZ = Math.cos(az), sZ = Math.sin(az);
      // Combined rotation matrix: Rz * Ry * Rx (column-major for GLSL mat3)
      // We compose: first X, then Y, then Z rotation.
      // R = Rz(az) * Ry(ay) * Rx(ax)
      // Column 0
      const m00 = cY * cZ;
      const m10 = cZ * sX * sY - cX * sZ;
      const m20 = cX * cZ * sY + sX * sZ;
      // Column 1
      const m01 = cY * sZ;
      const m11 = cX * cZ + sX * sY * sZ;
      const m21 = cX * sY * sZ - cZ * sX;
      // Column 2
      const m02 = -sY;
      const m12 = cY * sX;
      const m22 = cX * cY;

      body = [
        `  mat3 m = mat3(`,
        `    ${f(m00)}, ${f(m10)}, ${f(m20)},`,
        `    ${f(m01)}, ${f(m11)}, ${f(m21)},`,
        `    ${f(m02)}, ${f(m12)}, ${f(m22)}`,
        `  );`,
        `  return ${childFn}(m * p);`,
      ].join('\n');
      break;
    }

    case 'scale': {
      const childFn = emitNode(node.child, out);
      deps.push(childFn);
      body = `  return ${childFn}(p / ${f(node.factor)}) * ${f(node.factor)};`;
      break;
    }

    default: {
      const _exhaustive: never = node;
      throw new Error(`Unknown node type: ${(_exhaustive as SdfNode).type}`);
    }
  }

  const code = `float ${fnName}(vec3 p) {\n${body}\n}`;
  out.set(fnName, { fnName, code, deps });
  return fnName;
}

/**
 * Returns the root function name and an ordered list of GlslSnippets.
 * Snippets are ordered so dependencies appear before their dependents.
 */
export function collectSnippets(node: SdfNode): { root: string; snippets: GlslSnippet[] } {
  const map = new Map<string, GlslSnippet>();
  const root = emitNode(node, map);
  return { root, snippets: Array.from(map.values()) };
}

/**
 * Convenience: returns all GLSL code for the node tree as a single string.
 */
export function glslForNode(node: SdfNode): string {
  const { snippets } = collectSnippets(node);
  return snippets.map((s) => s.code).join('\n\n');
}

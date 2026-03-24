import type { SdfNode } from '@bigpuddle/dot-engine-core';

export interface WgslSnippet {
  fnName: string;
  code: string;
  deps: string[];
}

// Format a number for WGSL — always include a decimal point.
function f(n: number): string {
  const s = n.toString();
  return s.includes('.') ? s : s + '.0';
}

function emitNode(node: SdfNode, out: Map<string, WgslSnippet>): string {
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
        `  let q = abs(p) - vec3f(${f(hx - r)}, ${f(hy - r)}, ${f(hz - r)});`,
        `  return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - ${f(r)};`,
      ].join('\n');
      break;
    }

    case 'torus': {
      body = [
        `  let q = vec2f(length(p.xz) - ${f(node.majorR)}, p.y);`,
        `  return length(q) - ${f(node.minorR)};`,
      ].join('\n');
      break;
    }

    case 'cylinder': {
      const halfH = node.height / 2;
      body = [
        `  let dR = length(p.xz) - ${f(node.radius)};`,
        `  let dV = abs(p.y) - ${f(halfH)};`,
        `  return length(max(vec2f(dR, dV), vec2f(0.0))) + min(max(dR, dV), 0.0);`,
      ].join('\n');
      break;
    }

    case 'capsule': {
      const halfH = node.height / 2;
      body = [
        `  let h = clamp(p.y, ${f(-halfH)}, ${f(halfH)});`,
        `  return length(p - vec3f(0.0, h, 0.0)) - ${f(node.radius)};`,
      ].join('\n');
      break;
    }

    case 'cone': {
      const halfH = node.height / 2;
      const sinA = node.radius / Math.sqrt(node.radius * node.radius + node.height * node.height);
      const cosA = node.height / Math.sqrt(node.radius * node.radius + node.height * node.height);
      body = [
        `  let cq = vec2f(${f(sinA)}, ${f(cosA)});`,
        `  let w = vec2f(length(p.xz), p.y + ${f(halfH)});`,
        `  let dotWQ = dot(w, cq);`,
        `  let dotWQN = dot(w, vec2f(cq.y, -cq.x));`,
        `  let d1 = length(w - cq * clamp(dotWQ, 0.0, ${f(node.height)}));`,
        `  let d2 = length(w - vec2f(${f(node.radius)}, 0.0) * clamp(w.x / ${f(node.radius)}, 0.0, 1.0));`,
        `  let s = select(-1.0, 1.0, dotWQN > 0.0 || w.y > ${f(node.height)} || (dotWQ > ${f(node.height)} && w.x < ${f(node.radius)}));`,
        `  return s * min(d1, d2);`,
      ].join('\n');
      break;
    }

    case 'plane': {
      const [nx, ny, nz] = node.normal;
      body = `  return dot(p, vec3f(${f(nx)}, ${f(ny)}, ${f(nz)})) - ${f(node.offset)};`;
      break;
    }

    case 'customSdf': {
      // Use the raw wgsl body (customSdf.glsl field reused as wgsl for custom shaders)
      body = node.glsl;
      break;
    }

    case 'fromField2D': {
      console.warn('fromField2D is not implemented in WGSL compiler; returning 1e10');
      body = `  return 1e10;`;
      break;
    }

    case 'textureSdf': {
      const tid = node.textureId;
      body = [
        `  let uv = vec2f(p.x * ${f(node.aspectRatio)}, -p.y) * 0.5 + 0.5;`,
        `  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { return 1.0; }`,
        `  let d2d = textureSample(uLogoSDF_${tid}, uLogoSampler_${tid}, uv).r;`,
        `  let dz = abs(p.z) - ${f(node.depth * 0.5)};`,
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
      body = `  return ${childFn}(p - vec3f(${f(ox)}, ${f(oy)}, ${f(oz)}));`;
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
      // Combined rotation matrix: Rz * Ry * Rx (column-major)
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

      // WGSL mat3x3f constructor takes column vectors
      body = [
        `  let m = mat3x3f(`,
        `    vec3f(${f(m00)}, ${f(m10)}, ${f(m20)}),`,
        `    vec3f(${f(m01)}, ${f(m11)}, ${f(m21)}),`,
        `    vec3f(${f(m02)}, ${f(m12)}, ${f(m22)})`,
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

    case 'twist': {
      const childFn = emitNode(node.child, out);
      deps.push(childFn);
      body = [
        `  let angle = p.y * ${f(node.amount)};`,
        `  let c = cos(angle); let s = sin(angle);`,
        `  let q = vec3f(c*p.x - s*p.z, p.y, s*p.x + c*p.z);`,
        `  return ${childFn}(q);`,
      ].join('\n');
      break;
    }

    case 'bend': {
      const childFn = emitNode(node.child, out);
      deps.push(childFn);
      body = [
        `  let c = cos(${f(node.amount)} * p.y);`,
        `  let s = sin(${f(node.amount)} * p.y);`,
        `  let q = vec3f(c*p.x - s*p.y, s*p.x + c*p.y, p.z);`,
        `  return ${childFn}(q);`,
      ].join('\n');
      break;
    }

    case 'repeat': {
      const childFn = emitNode(node.child, out);
      deps.push(childFn);
      const [sx, sy, sz] = node.spacing;
      body = [
        `  let sp = vec3f(${f(sx)}, ${f(sy)}, ${f(sz)});`,
        `  let q = (p + sp*0.5) % sp - sp*0.5;`,
        `  return ${childFn}(q);`,
      ].join('\n');
      break;
    }

    case 'mirror': {
      const childFn = emitNode(node.child, out);
      deps.push(childFn);
      body = [
        `  var q = p; q.${node.axis} = abs(q.${node.axis});`,
        `  return ${childFn}(q);`,
      ].join('\n');
      break;
    }

    case 'elongate': {
      const childFn = emitNode(node.child, out);
      deps.push(childFn);
      const [ax, ay, az] = node.amount;
      body = [
        `  let amt = vec3f(${f(ax)}, ${f(ay)}, ${f(az)});`,
        `  let q = p - clamp(p, -amt, amt);`,
        `  return ${childFn}(q);`,
      ].join('\n');
      break;
    }

    case 'metaball': {
      const lines: string[] = ['  var sum = 0.0;'];
      const maxCenters = Math.min(node.centers.length, 8);
      for (let i = 0; i < maxCenters; i++) {
        const c = node.centers[i];
        const [cx, cy, cz] = c.position;
        lines.push(
          `  { let d = p - vec3f(${f(cx)}, ${f(cy)}, ${f(cz)});`,
          `    let dist2 = dot(d, d) + 1e-10;`,
          `    sum += (${f(c.radius * c.radius)}) / dist2; }`,
        );
      }
      lines.push(`  return ${f(node.threshold)} - sum;`);
      body = lines.join('\n');
      break;
    }

    default: {
      const _exhaustive: never = node;
      throw new Error(`Unknown node type: ${(_exhaustive as SdfNode).type}`);
    }
  }

  const code = `fn ${fnName}(p: vec3f) -> f32 {\n${body}\n}`;
  out.set(fnName, { fnName, code, deps });
  return fnName;
}

/**
 * Returns the root function name and an ordered list of WgslSnippets.
 * Snippets are ordered so dependencies appear before their dependents.
 */
export function collectWgslSnippets(node: SdfNode): { root: string; snippets: WgslSnippet[] } {
  const map = new Map<string, WgslSnippet>();
  const root = emitNode(node, map);
  return { root, snippets: Array.from(map.values()) };
}

/**
 * Convenience: returns all WGSL code for the node tree as a single string.
 */
export function wgslForNode(node: SdfNode): string {
  const { snippets } = collectWgslSnippets(node);
  return snippets.map((s) => s.code).join('\n\n');
}

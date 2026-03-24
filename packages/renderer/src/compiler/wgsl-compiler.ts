import type {
  FieldRoot,
  ShapeNode,
  GridNode,
  DisplaceNode,
} from '@bigpuddle/dot-engine-core';
import { collectWgslSnippets } from './wgsl-snippets.js';
import { SIMPLEX3D_WGSL } from './noise3d.wgsl.js';
import { CURL3D_WGSL } from './curl3d.wgsl.js';

export interface CompiledWgslField {
  computeShader: string;
  renderVertexShader: string;
  renderFragmentShader: string;
  resolution: [number, number, number];
  bounds: [number, number, number];
  totalDots: number;
}

/** Format a number for WGSL — always include a decimal point. */
function f(n: number): string {
  const s = n.toString();
  return s.includes('.') ? s : s + '.0';
}

const SMIN_WGSL = `
fn smin(a: f32, b: f32, k: f32) -> f32 {
  let h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - (h * h * h * k) / 6.0;
}
`;

const COMPUTE_TEMPLATE = `struct DotOutput {
  position: vec3f,
  scale: f32,
  color: vec3f,
  alpha: f32,
}

struct Uniforms {
  time: f32,
  resolution: vec3f,
  bounds: vec3f,
  colorPrimary: vec3f,
  colorAccent: vec3f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read_write> dots: array<DotOutput>;

{{NOISE_FUNCTIONS}}

{{SDF_FUNCTIONS}}

fn indexToGrid(idx: u32, res: vec3f, bounds: vec3f) -> vec3f {
  let sliceSize = u32(res.x) * u32(res.y);
  let iz = idx / sliceSize;
  let rem = idx - iz * sliceSize;
  let iy = rem / u32(res.x);
  let ix = rem - iy * u32(res.x);
  let n = vec3f(f32(ix), f32(iy), f32(iz)) / max(res - vec3f(1.0), vec3f(1.0));
  return (n - vec3f(0.5)) * bounds;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let idx = id.x;
  let total = u32(uniforms.resolution.x) * u32(uniforms.resolution.y) * u32(uniforms.resolution.z);
  if (idx >= total) { return; }

  var pos = indexToGrid(idx, uniforms.resolution, uniforms.bounds);

{{DISPLACEMENT}}

  let d = {{SDF_ROOT}}(pos);
  let edgeSoftness = 0.05;
  let field = 1.0 - smoothstep(-edgeSoftness, edgeSoftness, d);

  // GPU culling: skip invisible dots
  if (field < 0.01) {
    dots[idx].scale = 0.0;
    return;
  }

  let color = mix(uniforms.colorPrimary, uniforms.colorAccent, field);

  dots[idx].position = pos;
  dots[idx].scale = field * 0.02;
  dots[idx].color = color;
  dots[idx].alpha = field * 0.9;
}
`;

// Simple passthrough vertex shader for reading the storage buffer
const RENDER_VERTEX_WGSL = `struct DotOutput {
  position: vec3f,
  scale: f32,
  color: vec3f,
  alpha: f32,
}

@group(0) @binding(0) var<storage, read> dots: array<DotOutput>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) alpha: f32,
}

@vertex
fn main(@builtin(instance_index) instanceIdx: u32, @builtin(vertex_index) vertexIdx: u32) -> VertexOutput {
  let dot = dots[instanceIdx];
  var out: VertexOutput;
  out.position = vec4f(dot.position, 1.0);
  out.color = dot.color;
  out.alpha = dot.alpha;
  return out;
}
`;

const RENDER_FRAGMENT_WGSL = `struct FragInput {
  @location(0) color: vec3f,
  @location(1) alpha: f32,
}

@fragment
fn main(in: FragInput) -> @location(0) vec4f {
  return vec4f(in.color, in.alpha);
}
`;

function emitWgslDisplacement(node: DisplaceNode): string {
  const noise = node.noise;
  const amount = f(node.amount);

  switch (noise.type) {
    case 'simplex3D': {
      const scale = f(noise.scale);
      const speed = f(noise.speed);
      return (
        `  pos += vec3f(\n` +
        `    snoise(pos * ${scale} + uniforms.time * ${speed}),\n` +
        `    snoise(pos * ${scale} + uniforms.time * ${speed} + 100.0),\n` +
        `    snoise(pos * ${scale} + uniforms.time * ${speed} + 200.0)\n` +
        `  ) * ${amount};`
      );
    }

    case 'domainWarp3D': {
      const effectiveScale = f(noise.scale * noise.octaves);
      const speed = f(noise.speed ?? 0);
      return (
        `  pos += vec3f(\n` +
        `    snoise(pos * ${effectiveScale} + uniforms.time * ${speed}),\n` +
        `    snoise(pos * ${effectiveScale} + uniforms.time * ${speed} + 100.0),\n` +
        `    snoise(pos * ${effectiveScale} + uniforms.time * ${speed} + 200.0)\n` +
        `  ) * ${amount};`
      );
    }

    case 'flowField3D': {
      const scale = f(noise.scale);
      const speed = f(noise.speed);
      return `  pos += curlNoise(pos * ${scale}, uniforms.time * ${speed}) * ${amount};`;
    }

    case 'attract': {
      const [tx, ty, tz] = noise.target;
      const strength = f(noise.strength);
      const target = `vec3f(${f(tx)}, ${f(ty)}, ${f(tz)})`;
      const dir = `normalize(${target} - pos)`;
      const dist = `length(${target} - pos)`;
      let falloffExpr: string;
      switch (noise.falloff) {
        case 'linear':
          falloffExpr = `${strength} * (1.0 - min(${dist} / 2.0, 1.0))`;
          break;
        case 'exponential':
          falloffExpr = `${strength} * exp(-${dist} * 2.0)`;
          break;
        case 'inverse':
        default:
          falloffExpr = `${strength} / max(${dist}, 0.01)`;
          break;
      }
      return `  pos += ${dir} * ${falloffExpr};`;
    }

    default: {
      const _exhaustive: never = noise;
      throw new Error(`Unknown noise type: ${(_exhaustive as DisplaceNode['noise']).type}`);
    }
  }
}

export function compileFieldWgsl(root: FieldRoot): CompiledWgslField {
  // Extract ShapeNode and GridNode from children
  const shapeNode = root.children.find((c): c is ShapeNode => c.type === 'shape');
  const gridNode = root.children.find((c): c is GridNode => c.type === 'grid');

  if (!shapeNode) {
    throw new Error('compileFieldWgsl: FieldRoot must contain a ShapeNode child');
  }
  if (!gridNode) {
    throw new Error('compileFieldWgsl: FieldRoot must contain a GridNode child');
  }

  // Extract DisplaceNodes in declaration order
  const displaceNodes = root.children.filter((c): c is DisplaceNode => c.type === 'displace');

  // Compile the SDF tree to WGSL snippets
  const { root: rootFn, snippets } = collectWgslSnippets(shapeNode.sdf);

  // Combine all WGSL snippet code
  const sdfCode = snippets.map((s) => s.code).join('\n\n');

  // Include smin helper if any snippet uses it
  const needsSmin = sdfCode.includes('smin(');
  const sdfFunctions = needsSmin ? `${SMIN_WGSL}\n${sdfCode}` : sdfCode;

  // Determine which noise helpers are needed
  const needsCurl = displaceNodes.some((d) => d.noise.type === 'flowField3D');
  const needsSimplex =
    displaceNodes.length > 0 &&
    displaceNodes.some((d) => d.noise.type !== 'attract');

  let noiseFunctions = '';
  if (needsSimplex) {
    noiseFunctions = SIMPLEX3D_WGSL;
    if (needsCurl) {
      noiseFunctions += '\n' + CURL3D_WGSL;
    }
  }

  // Build displacement lines
  const displacementLines = displaceNodes.map(emitWgslDisplacement).join('\n');

  // Assemble compute shader by replacing template placeholders
  const computeShader = COMPUTE_TEMPLATE
    .replace('{{NOISE_FUNCTIONS}}', noiseFunctions)
    .replace('{{SDF_FUNCTIONS}}', sdfFunctions)
    .replace('{{SDF_ROOT}}', rootFn)
    .replace('{{DISPLACEMENT}}', displacementLines);

  // Extract grid metadata
  const resolution = gridNode.resolution;
  const bounds: [number, number, number] = gridNode.bounds ?? [2, 2, 2];
  const totalDots = resolution[0] * resolution[1] * resolution[2];

  return {
    computeShader,
    renderVertexShader: RENDER_VERTEX_WGSL,
    renderFragmentShader: RENDER_FRAGMENT_WGSL,
    resolution,
    bounds,
    totalDots,
  };
}

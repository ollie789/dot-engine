import type {
  FieldRoot,
  ShapeNode,
  GridNode,
  DisplaceNode,
  ColorNode,
  GradientColorNode,
  NoiseColorNode,
  ColorFieldNode,
  OpacityNode,
  SdfNode,
} from '@dot-engine/core';
import { collectSnippets } from './snippets.js';
import { SMIN_GLSL } from './smin.glsl.js';
import { SIMPLEX3D_GLSL } from './noise3d.glsl.js';
import { CURL3D_GLSL } from './curl3d.glsl.js';
import { BASE_VERTEX } from '../shaders/base-vertex.js';
import { BASE_FRAGMENT } from '../shaders/base-fragment.js';

export interface ExtraUniform {
  type: 'sampler2D' | 'float';
  declaration: string;
}

export interface CompiledField {
  vertexShader: string;
  fragmentShader: string;
  resolution: [number, number, number];
  bounds: [number, number, number];
  totalDots: number;
  extraUniforms: Record<string, ExtraUniform>;
}

/** Format a number for GLSL — always include a decimal point. */
function f(n: number): string {
  const s = n.toString();
  return s.includes('.') ? s : s + '.0';
}

/** Convert a hex color string to GLSL float components (r, g, b). */
function hexToGlsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return `${f(r)}, ${f(g)}, ${f(b)}`;
}

function emitDisplacement(node: DisplaceNode): string {
  const noise = node.noise;
  const amount = f(node.amount);

  switch (noise.type) {
    case 'simplex3D': {
      const scale = f(noise.scale);
      const speed = f(noise.speed);
      return (
        `  displaced += vec3(` +
        `snoise(displaced * ${scale} + uTime * ${speed}), ` +
        `snoise(displaced * ${scale} + uTime * ${speed} + 100.0), ` +
        `snoise(displaced * ${scale} + uTime * ${speed} + 200.0)` +
        `) * ${amount};`
      );
    }

    case 'domainWarp3D': {
      // Effective scale = scale * octaves
      const effectiveScale = f(noise.scale * noise.octaves);
      const speed = f(noise.speed ?? 0);
      return (
        `  displaced += vec3(` +
        `snoise(displaced * ${effectiveScale} + uTime * ${speed}), ` +
        `snoise(displaced * ${effectiveScale} + uTime * ${speed} + 100.0), ` +
        `snoise(displaced * ${effectiveScale} + uTime * ${speed} + 200.0)` +
        `) * ${amount};`
      );
    }

    case 'flowField3D': {
      const scale = f(noise.scale);
      const speed = f(noise.speed);
      return `  displaced += curlNoise(displaced * ${scale}, uTime * ${speed}) * ${amount};`;
    }

    case 'attract': {
      const [tx, ty, tz] = noise.target;
      const strength = f(noise.strength);
      const target = `vec3(${f(tx)}, ${f(ty)}, ${f(tz)})`;
      const dir = `normalize(${target} - displaced)`;
      const dist = `length(${target} - displaced)`;
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
      return `  displaced += ${dir} * ${falloffExpr};`;
    }

    default: {
      const _exhaustive: never = noise;
      throw new Error(`Unknown noise type: ${(_exhaustive as DisplaceNode['noise']).type}`);
    }
  }
}

function compileGradient(node: GradientColorNode): string {
  const axis = `vPosition.${node.axis}`;
  if (node.stops.length === 0) return 'vec3 color = vec3(1.0);';
  if (node.stops.length === 1) return `vec3 color = vec3(${hexToGlsl(node.stops[0][0])});`;

  // Chain mix() calls for each consecutive pair of stops
  let expr = `vec3(${hexToGlsl(node.stops[0][0])})`;
  for (let i = 1; i < node.stops.length; i++) {
    const [col, pos] = node.stops[i];
    const prevPos = node.stops[i - 1][1];
    const t = `clamp((${axis} - ${f(prevPos)}) / ${f(pos - prevPos)}, 0.0, 1.0)`;
    expr = `mix(${expr}, vec3(${hexToGlsl(col)}), ${t})`;
  }
  return `vec3 color = ${expr};`;
}

function compileNoiseColor(node: NoiseColorNode): string {
  const scale = f(node.scale);
  const speed = f(node.speed);
  const palette = node.palette;

  if (palette.length === 0) return 'vec3 color = vec3(1.0);';
  if (palette.length === 1) return `vec3 color = vec3(${hexToGlsl(palette[0])});`;

  // Use noise to index into palette
  const noiseSample = `snoise(vPosition * ${scale} + uTime * ${speed}) * 0.5 + 0.5`;
  let expr = `vec3(${hexToGlsl(palette[0])})`;
  for (let i = 1; i < palette.length; i++) {
    const t = `clamp((${noiseSample} - ${f((i - 1) / (palette.length - 1))}) / ${f(1.0 / (palette.length - 1))}, 0.0, 1.0)`;
    expr = `mix(${expr}, vec3(${hexToGlsl(palette[i])}), ${t})`;
  }
  return `vec3 color = ${expr};`;
}

function compileColorLogic(colorNode: ColorFieldNode | undefined): string {
  if (!colorNode) {
    return 'vec3 color = mix(uColorPrimary, uColorAccent, vFieldValue);';
  }

  switch (colorNode.type) {
    case 'color': {
      const node = colorNode as ColorNode;
      switch (node.mode) {
        case 'depth':
          return 'vec3 color = mix(uColorPrimary, uColorAccent, vFieldValue);';
        case 'position':
          return 'vec3 color = mix(uColorPrimary, uColorAccent, vPosition.y);';
        case 'uniform':
          return 'vec3 color = uColorPrimary;';
        case 'noise':
          return 'vec3 color = mix(uColorPrimary, uColorAccent, vFieldValue);';
        default:
          return 'vec3 color = mix(uColorPrimary, uColorAccent, vFieldValue);';
      }
    }
    case 'gradientColor':
      return compileGradient(colorNode as GradientColorNode);
    case 'noiseColor':
      return compileNoiseColor(colorNode as NoiseColorNode);
    default: {
      const _exhaustive: never = colorNode;
      throw new Error(`Unknown color node type: ${(_exhaustive as ColorFieldNode).type}`);
    }
  }
}

function compileOpacityExpr(opacityNode: OpacityNode | undefined): string {
  if (!opacityNode) {
    return 'vFieldValue * 0.9';
  }

  const min = f(opacityNode.min);
  const max = f(opacityNode.max);

  switch (opacityNode.mode) {
    case 'depth':
      return `mix(${min}, ${max}, vFieldValue)`;
    case 'edgeGlow':
      return `mix(${min}, ${max}, 1.0 - abs(vFieldValue - 0.5) * 2.0)`;
    case 'uniform':
      return max;
    default: {
      const _exhaustive: never = opacityNode.mode;
      throw new Error(`Unknown opacity mode: ${_exhaustive}`);
    }
  }
}

function collectTextureUniforms(node: SdfNode, out: Record<string, ExtraUniform>): void {
  if (node.type === 'textureSdf') {
    const tid = node.textureId;
    if (!out[tid]) {
      out[tid] = {
        type: 'sampler2D',
        declaration: `uniform sampler2D uLogoSDF_${tid};\nuniform float uLogoDepth_${tid};\nuniform float uLogoAspect_${tid};`,
      };
    }
    return;
  }
  // Recurse into boolean children
  if ('a' in node) collectTextureUniforms((node as any).a, out);
  if ('b' in node) collectTextureUniforms((node as any).b, out);
  if ('child' in node) collectTextureUniforms((node as any).child, out);
}

export function compileField(root: FieldRoot): CompiledField {
  // Extract ShapeNode and GridNode from children
  const shapeNode = root.children.find((c): c is ShapeNode => c.type === 'shape');
  const gridNode = root.children.find((c): c is GridNode => c.type === 'grid');

  if (!shapeNode) {
    throw new Error('compileField: FieldRoot must contain a ShapeNode child');
  }
  if (!gridNode) {
    throw new Error('compileField: FieldRoot must contain a GridNode child');
  }

  // Extract DisplaceNodes in declaration order
  const displaceNodes = root.children.filter((c): c is DisplaceNode => c.type === 'displace');

  // Extract first color/opacity nodes
  const colorNode = root.children.find(
    (c): c is ColorFieldNode =>
      c.type === 'color' || c.type === 'gradientColor' || c.type === 'noiseColor',
  ) as ColorFieldNode | undefined;

  const opacityNode = root.children.find(
    (c): c is OpacityNode => c.type === 'opacity',
  ) as OpacityNode | undefined;

  // Collect texture uniforms from SDF tree
  const extraUniforms: Record<string, ExtraUniform> = {};
  collectTextureUniforms(shapeNode.sdf, extraUniforms);

  // Build extra uniform declarations string
  const extraUniformsCode = Object.values(extraUniforms)
    .map((u) => u.declaration)
    .join('\n');

  // Compile the SDF tree to GLSL snippets
  const { root: rootFn, snippets } = collectSnippets(shapeNode.sdf);

  // Combine all GLSL snippet code
  const sdfCode = snippets.map((s) => s.code).join('\n\n');

  // Include smin helper if any snippet uses it
  const needsSmin = sdfCode.includes('smin(');
  const sdfFunctions = needsSmin ? `${SMIN_GLSL}\n${sdfCode}` : sdfCode;

  // Determine which noise helpers are needed (vertex shader)
  const needsCurl = displaceNodes.some((d) => d.noise.type === 'flowField3D');
  const needsSimplex =
    displaceNodes.length > 0 &&
    displaceNodes.some((d) => d.noise.type !== 'attract');

  let noiseFunctions = '';
  if (needsSimplex) {
    noiseFunctions = SIMPLEX3D_GLSL;
    if (needsCurl) {
      noiseFunctions += '\n' + CURL3D_GLSL;
    }
  }

  // Build displacement lines
  const displacementLines = displaceNodes.map(emitDisplacement).join('\n');

  // Assemble vertex shader by replacing template placeholders
  const vertexShader = BASE_VERTEX
    .replace('{{EXTRA_UNIFORMS}}', extraUniformsCode)
    .replace('{{NOISE_FUNCTIONS}}', noiseFunctions)
    .replace('{{SDF_FUNCTIONS}}', sdfFunctions)
    .replace('{{SDF_ROOT}}', rootFn)
    .replace('{{DISPLACEMENT}}', displacementLines);

  // Fragment shader: generate color/opacity logic
  const colorLogic = compileColorLogic(colorNode);
  const opacityExpr = compileOpacityExpr(opacityNode);

  // Include simplex noise in fragment shader if noiseColor is used
  const needsFragSimplex = colorNode?.type === 'noiseColor';
  const fragmentFunctions = needsFragSimplex ? SIMPLEX3D_GLSL : '';

  const fragmentShader = BASE_FRAGMENT
    .replace('{{FRAGMENT_FUNCTIONS}}', fragmentFunctions)
    .replace('{{COLOR_LOGIC}}', colorLogic)
    .replace('{{OPACITY_EXPR}}', opacityExpr);

  // Extract grid metadata
  const resolution = gridNode.resolution;
  const bounds: [number, number, number] = gridNode.bounds ?? [2, 2, 2];
  const totalDots = resolution[0] * resolution[1] * resolution[2];

  return {
    vertexShader,
    fragmentShader,
    resolution,
    bounds,
    totalDots,
    extraUniforms,
  };
}

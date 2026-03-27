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
  SizeNode,
  SdfNode,
  ImageFieldNode,
} from '@bigpuddle/dot-engine-core';
import { collectSnippets } from './snippets.js';
import { SMIN_GLSL } from './smin.glsl.js';
import { SIMPLEX3D_GLSL } from './noise3d.glsl.js';
import { CURL3D_GLSL } from './curl3d.glsl.js';
import { BASE_VERTEX } from '../shaders/base-vertex.js';
import { BASE_FRAGMENT } from '../shaders/base-fragment.js';

function serializeSdf(node: SdfNode): string {
  return JSON.stringify(node, (key, value) => (key === 'id' ? undefined : value));
}

export function getShaderKey(root: FieldRoot): string {
  const shapeNode = root.children.find((c) => c.type === 'shape') as ShapeNode | undefined;
  const displaceNodes = root.children.filter((c) => c.type === 'displace') as DisplaceNode[];
  const colorNode = root.children.find(
    (c) => c.type === 'color' || c.type === 'gradientColor' || c.type === 'noiseColor',
  ) as ColorFieldNode | undefined;
  const opacityNode = root.children.find((c) => c.type === 'opacity') as OpacityNode | undefined;
  const sizeNode = root.children.find((c) => c.type === 'size') as SizeNode | undefined;
  const imageFieldNode = root.children.find((c) => c.type === 'imageField') as ImageFieldNode | undefined;

  const parts: string[] = [];

  if (shapeNode) parts.push('sdf:' + serializeSdf(shapeNode.sdf));

  for (const d of displaceNodes) {
    parts.push('disp:' + JSON.stringify(d.noise) + ':' + d.amount);
  }

  if (colorNode) parts.push('col:' + JSON.stringify(colorNode, (key, value) => (key === 'id' ? undefined : value)));

  if (opacityNode) parts.push('op:' + opacityNode.mode + ':' + opacityNode.min + ':' + opacityNode.max);

  if (sizeNode) parts.push('sz:' + sizeNode.mode + ':' + sizeNode.min + ':' + sizeNode.max);
  else parts.push('sz:auto');

  if (imageFieldNode) parts.push('img:' + imageFieldNode.mode + ':' + (imageFieldNode.threshold ?? 0.1) + ':' + !!imageFieldNode.colorFromImage);

  return parts.join('|');
}

interface CachedShader {
  vertexShader: string;
  fragmentShader: string;
  extraUniforms: Record<string, ExtraUniform>;
}

const shaderCache = new Map<string, CachedShader>();

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
  autoSize: number;
  edgeSoftness: number;
}

/** Format a number for GLSL — always include a decimal point. */
function f(n: number): string {
  const s = n.toString();
  return s.includes('.') ? s : s + '.0';
}

/** Convert a hex color string to GLSL float components (r, g, b). */
function hexToGlsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    throw new Error(`hexToGlsl: invalid hex color "${hex}"`);
  }
  return `${f(r / 255)}, ${f(g / 255)}, ${f(b / 255)}`;
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
      const scale = f(noise.scale);
      const speed = f(noise.speed ?? 0);
      const lines: string[] = [];
      lines.push(`  vec3 _warp = displaced;`);
      for (let i = 0; i < noise.octaves; i++) {
        lines.push(
          `  _warp += vec3(` +
          `snoise(_warp * ${scale} + uTime * ${speed}), ` +
          `snoise(_warp * ${scale} + uTime * ${speed} + 100.0), ` +
          `snoise(_warp * ${scale} + uTime * ${speed} + 200.0)` +
          `) * ${amount};`,
        );
      }
      lines.push(`  displaced = _warp;`);
      return lines.join('\n');
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
    const range = pos - prevPos;
    const t = range === 0
      ? '1.0'
      : `clamp((${axis} - ${f(prevPos)}) / ${f(range)}, 0.0, 1.0)`;
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

  const lines: string[] = [];
  lines.push(`float _noiseT = snoise(vPosition * ${scale} + uTime * ${speed}) * 0.5 + 0.5;`);
  let expr = `vec3(${hexToGlsl(palette[0])})`;
  for (let i = 1; i < palette.length; i++) {
    const t = `clamp((_noiseT - ${f((i - 1) / (palette.length - 1))}) / ${f(1.0 / (palette.length - 1))}, 0.0, 1.0)`;
    expr = `mix(${expr}, vec3(${hexToGlsl(palette[i])}), ${t})`;
  }
  lines.push(`vec3 color = ${expr};`);
  return lines.join('\n  ');
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

function compileSizeExpr(sizeNode: SizeNode | undefined): string {
  if (!sizeNode) {
    return 'uAutoSize';
  }
  const min = f(sizeNode.min);
  const max = f(sizeNode.max);
  switch (sizeNode.mode) {
    case 'depth':
      return `mix(${min}, ${max}, field)`;
    case 'uniform':
      return max;
    default: {
      const _exhaustive: never = sizeNode.mode;
      throw new Error(`Unknown size mode: ${_exhaustive}`);
    }
  }
}

function emitImageFieldVertex(node: ImageFieldNode): string {
  const mode = node.mode === 'alpha' ? '1' : '0';
  const threshold = f(node.threshold ?? 0.1);
  return [
    `  {`,
    `    float ASPECT = uBounds.x / uBounds.y;`,
    `    vec2 imgUv = vec2(displaced.x * ASPECT, -displaced.y) * 0.5 + 0.5;`,
    `    vec4 imgSample = vec4(0.0);`,
    `    float imgValue = 0.0;`,
    `    if (imgUv.x >= 0.0 && imgUv.x <= 1.0 && imgUv.y >= 0.0 && imgUv.y <= 1.0) {`,
    `      imgSample = texture2D(uImageField, imgUv);`,
    `      float rawValue = ${mode} == 0`,
    `        ? dot(imgSample.rgb, vec3(0.299, 0.587, 0.114))`,
    `        : imgSample.a;`,
    `      float gamma = 1.8;`,
    `      float mapped = pow(rawValue, 1.0 / gamma);`,
    `      imgValue = smoothstep(0.05, 0.95, mapped);`,
    `    }`,
    `    if (imgValue < ${threshold}) {`,
    `      gl_Position = vec4(0.0, 0.0, -999.0, 1.0);`,
    `      vFieldValue = 0.0;`,
    `      vImgUv = vec2(0.0);`,
    `      return;`,
    `    }`,
    `    imgScale = imgValue;`,
    `    vImgUv = imgUv;`,
    `  }`,
  ].join('\n');
}

function emitImageFieldColorLogic(): string {
  return [
    `  vec4 _imgColor = texture2D(uImageField, vImgUv);`,
    `  vec3 color = _imgColor.rgb;`,
  ].join('\n');
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

  // Extract grid metadata early (needed by size expr)
  const resolution = gridNode.resolution;
  const bounds: [number, number, number] = gridNode.bounds ?? [2, 2, 2];
  const totalDots = resolution[0] * resolution[1] * resolution[2];

  const shaderKey = getShaderKey(root);
  const cached = shaderCache.get(shaderKey);

  if (cached) {
    const avgRes = (resolution[0] + resolution[1] + resolution[2]) / 3;
    const avgBounds = (bounds[0] + bounds[1] + bounds[2]) / 3;
    const sizeNode = root.children.find((c) => c.type === 'size') as SizeNode | undefined;
    const autoSize = sizeNode ? 0 : Math.max(0.002, Math.min(0.05, (avgBounds / avgRes) * 0.4));
    const edgeSoftness = root.edgeSoftness ?? 0.05;

    return {
      ...cached,
      resolution,
      bounds,
      totalDots,
      autoSize,
      edgeSoftness,
    };
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

  const sizeNode = root.children.find(
    (c): c is SizeNode => c.type === 'size',
  ) as SizeNode | undefined;

  // Find image field node
  const imageFieldNode = root.children.find(
    (c): c is ImageFieldNode => c.type === 'imageField',
  ) as ImageFieldNode | undefined;

  // Collect texture uniforms from SDF tree
  const extraUniforms: Record<string, ExtraUniform> = {};
  collectTextureUniforms(shapeNode.sdf, extraUniforms);

  // Add image field uniform if present
  if (imageFieldNode) {
    extraUniforms['__imageField__'] = {
      type: 'sampler2D',
      declaration: 'uniform sampler2D uImageField;',
    };
  }

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

  // Compile size expression
  const sizeExpr = compileSizeExpr(sizeNode);

  // Emit image field GLSL code
  const imageFieldCode = imageFieldNode ? emitImageFieldVertex(imageFieldNode) : '';

  // Assemble vertex shader by replacing template placeholders
  const vertexShader = BASE_VERTEX
    .replace('{{EXTRA_UNIFORMS}}', extraUniformsCode)
    .replace('{{NOISE_FUNCTIONS}}', noiseFunctions)
    .replace('{{SDF_FUNCTIONS}}', sdfFunctions)
    .replaceAll('{{SDF_ROOT}}', rootFn)
    .replace('{{DISPLACEMENT}}', displacementLines)
    .replace('{{IMAGE_FIELD}}', imageFieldCode)
    .replace('{{SIZE_EXPR}}', sizeExpr);

  // Fragment shader: generate color/opacity logic
  const colorLogic =
    imageFieldNode?.colorFromImage
      ? emitImageFieldColorLogic()
      : compileColorLogic(colorNode);
  const opacityExpr = compileOpacityExpr(opacityNode);

  // Include simplex noise in fragment shader if noiseColor is used
  const needsFragSimplex = colorNode?.type === 'noiseColor';
  // Include image field sampler in fragment functions when colorFromImage is active
  const imageFragDecl =
    imageFieldNode?.colorFromImage
      ? 'uniform sampler2D uImageField;'
      : '';
  const fragmentFunctions = [
    needsFragSimplex ? SIMPLEX3D_GLSL : '',
    imageFragDecl,
  ]
    .filter(Boolean)
    .join('\n');

  const fragmentShader = BASE_FRAGMENT
    .replace('{{FRAGMENT_FUNCTIONS}}', fragmentFunctions)
    .replace('{{COLOR_LOGIC}}', colorLogic)
    .replace('{{OPACITY_EXPR}}', opacityExpr);

  // Compute auto-size value (used as uniform, not baked into shader)
  const avgRes = (resolution[0] + resolution[1] + resolution[2]) / 3;
  const avgBounds = (bounds[0] + bounds[1] + bounds[2]) / 3;
  const autoSize = sizeNode ? 0 : Math.max(0.002, Math.min(0.05, (avgBounds / avgRes) * 0.4));
  const edgeSoftness = root.edgeSoftness ?? 0.05;

  shaderCache.set(shaderKey, { vertexShader, fragmentShader, extraUniforms });

  return {
    vertexShader,
    fragmentShader,
    resolution,
    bounds,
    totalDots,
    extraUniforms,
    autoSize,
    edgeSoftness,
  };
}

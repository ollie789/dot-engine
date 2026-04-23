import type {
  FieldRoot,
  ShapeNode,
  GridNode,
  DisplaceNode,
  OpacityNode,
  SizeNode,
  SdfNode,
} from '@bigpuddle/dot-engine-core';
import { collectSnippets } from './snippets.js';
import { SMIN_GLSL } from './smin.glsl.js';
import { SIMPLEX3D_GLSL } from './noise3d.glsl.js';
import { CURL3D_GLSL } from './curl3d.glsl.js';
import { BASE_FRAGMENT } from '../shaders/base-fragment.js';
import type { ExtraUniform } from './compiler.js';

export interface CompiledMorphField {
  vertexShader: string;
  fragmentShader: string;
  resolution: [number, number, number];
  bounds: [number, number, number];
  totalDots: number;
  fromEdgeSoftness: number;
  toEdgeSoftness: number;
  /**
   * Texture uniforms required by the compiled shader — union of both
   * `from` and `to` SDF trees. Keyed by textureId. The MorphField
   * component uses this to declare uniform slots and bind textures.
   */
  extraUniforms: Record<string, ExtraUniform>;
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
  if ('a' in node) collectTextureUniforms((node as { a: SdfNode }).a, out);
  if ('b' in node) collectTextureUniforms((node as { b: SdfNode }).b, out);
  if ('child' in node) collectTextureUniforms((node as { child: SdfNode }).child, out);
}

function f(n: number): string {
  const s = n.toString();
  return s.includes('.') ? s : s + '.0';
}

/**
 * Rename all SDF function names in a set of snippets by applying a prefix.
 * Returns the renamed GLSL code and the renamed root function name.
 */
function renameSnippets(
  snippets: { fnName: string; code: string }[],
  root: string,
  prefix: string,
): { code: string; root: string } {
  // Collect all function names to rename
  const names = snippets.map(s => s.fnName);
  let code = snippets.map(s => s.code).join('\n\n');

  // Replace all occurrences of each function name with the prefixed version.
  // Process longer names first to avoid partial replacement issues.
  const sorted = [...names].sort((a, b) => b.length - a.length);
  let renamedRoot = root;
  for (const name of sorted) {
    const newName = `${prefix}${name}`;
    code = code.replaceAll(name, newName);
    if (name === root) renamedRoot = newName;
  }

  return { code, root: renamedRoot };
}

export function compileMorphField(from: FieldRoot, to: FieldRoot): CompiledMorphField {
  const fromShape = from.children.find((c): c is ShapeNode => c.type === 'shape');
  const toShape = to.children.find((c): c is ShapeNode => c.type === 'shape');
  const fromGrid = from.children.find((c): c is GridNode => c.type === 'grid');
  const toGrid = to.children.find((c): c is GridNode => c.type === 'grid');

  if (!fromShape || !toShape) throw new Error('compileMorphField: both fields must have a ShapeNode');
  if (!fromGrid || !toGrid) throw new Error('compileMorphField: both fields must have a GridNode');

  // Max grid resolution and bounds
  const resolution: [number, number, number] = [
    Math.max(fromGrid.resolution[0], toGrid.resolution[0]),
    Math.max(fromGrid.resolution[1], toGrid.resolution[1]),
    Math.max(fromGrid.resolution[2], toGrid.resolution[2]),
  ];
  const fromBounds = fromGrid.bounds ?? [2, 2, 2];
  const toBounds = toGrid.bounds ?? [2, 2, 2];
  const bounds: [number, number, number] = [
    Math.max(fromBounds[0], toBounds[0]),
    Math.max(fromBounds[1], toBounds[1]),
    Math.max(fromBounds[2], toBounds[2]),
  ];
  const totalDots = resolution[0] * resolution[1] * resolution[2];

  // Compile both SDF trees
  const fromSnippets = collectSnippets(fromShape.sdf);
  const toSnippets = collectSnippets(toShape.sdf);

  // Check for function name collisions between the two snippet sets
  const fromNames = new Set(fromSnippets.snippets.map(s => s.fnName));
  const toNames = toSnippets.snippets.map(s => s.fnName);
  const hasCollision = toNames.some(name => fromNames.has(name));

  let fromSdfCode: string;
  let fromRootFn: string;
  let toSdfCode: string;
  let toRootFn: string;

  if (hasCollision) {
    // Rename "to" functions with a prefix to avoid collisions
    const renamed = renameSnippets(toSnippets.snippets, toSnippets.root, 'to_');
    toSdfCode = renamed.code;
    toRootFn = renamed.root;
    fromSdfCode = fromSnippets.snippets.map(s => s.code).join('\n\n');
    fromRootFn = fromSnippets.root;
  } else {
    fromSdfCode = fromSnippets.snippets.map(s => s.code).join('\n\n');
    fromRootFn = fromSnippets.root;
    toSdfCode = toSnippets.snippets.map(s => s.code).join('\n\n');
    toRootFn = toSnippets.root;
  }

  const allSdfCode = fromSdfCode + '\n\n' + toSdfCode;
  const needsSmin = allSdfCode.includes('smin(');
  const sdfFunctions = needsSmin ? `${SMIN_GLSL}\n${allSdfCode}` : allSdfCode;

  // Collect sampler2D / depth / aspect uniforms referenced by any
  // textureSdf node in either tree. Renamed "to" snippets still use
  // the original texture IDs (the rename prefix is a function-name
  // concern), so we union the uniforms from both raw trees.
  const extraUniforms: Record<string, ExtraUniform> = {};
  collectTextureUniforms(fromShape.sdf, extraUniforms);
  collectTextureUniforms(toShape.sdf, extraUniforms);
  const extraUniformsCode = Object.values(extraUniforms)
    .map((u) => u.declaration)
    .join('\n');

  // Displacement from "to" field only
  const displaceNodes = to.children.filter((c): c is DisplaceNode => c.type === 'displace');
  const needsCurl = displaceNodes.some(d => d.noise.type === 'flowField3D');
  const needsSimplex = displaceNodes.length > 0 && displaceNodes.some(d => d.noise.type !== 'attract');

  let noiseFunctions = '';
  if (needsSimplex) {
    noiseFunctions = SIMPLEX3D_GLSL;
    if (needsCurl) noiseFunctions += '\n' + CURL3D_GLSL;
  }

  // Edge softness
  const fromEdgeSoftness = from.edgeSoftness ?? 0.05;
  const toEdgeSoftness = to.edgeSoftness ?? 0.05;

  // Size
  const sizeNode = to.children.find((c): c is SizeNode => c.type === 'size');
  const avgRes = (resolution[0] + resolution[1] + resolution[2]) / 3;
  const avgBounds = (bounds[0] + bounds[1] + bounds[2]) / 3;
  const autoSize = (avgBounds / avgRes) * 0.4;
  let sizeExpr: string;
  if (!sizeNode) {
    sizeExpr = f(Math.max(0.002, Math.min(0.05, autoSize)));
  } else if (sizeNode.mode === 'uniform') {
    sizeExpr = f(sizeNode.max);
  } else {
    sizeExpr = `mix(${f(sizeNode.min)}, ${f(sizeNode.max)}, field)`;
  }

  // Build the morph vertex shader
  const vertexShader = `
varying float vFieldValue;
varying float vDistance;
varying vec3 vPosition;
varying vec2 vImgUv;

uniform float uTime;
uniform vec3 uResolution;
uniform vec3 uBounds;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uMorphProgress;
uniform float uFromEdgeSoftness;
uniform float uToEdgeSoftness;

${extraUniformsCode}

${noiseFunctions}

${sdfFunctions}

vec3 indexToGrid(int idx, vec3 res, vec3 bounds) {
  int sliceSize = int(res.x) * int(res.y);
  int iz = idx / sliceSize;
  int rem = idx - iz * sliceSize;
  int iy = rem / int(res.x);
  int ix = rem - iy * int(res.x);
  vec3 n = vec3(float(ix), float(iy), float(iz)) / max(res - 1.0, 1.0);
  return (n - 0.5) * bounds;
}

void main() {
  vec3 gridPos = indexToGrid(gl_InstanceID, uResolution, uBounds);

  // Coarse check against both SDFs
  float dFromCoarse = ${fromRootFn}(gridPos);
  float dToCoarse = ${toRootFn}(gridPos);
  float dCoarse = mix(dFromCoarse, dToCoarse, uMorphProgress);
  if (dCoarse > 0.5) {
    gl_Position = vec4(0.0, 0.0, -999.0, 1.0);
    vFieldValue = 0.0;
    vDistance = dCoarse;
    return;
  }

  vec3 displaced = gridPos;

  // Morph SDF evaluation
  float dFrom = ${fromRootFn}(displaced);
  float dTo = ${toRootFn}(displaced);
  float d = mix(dFrom, dTo, uMorphProgress);

  float edgeSoftness = mix(uFromEdgeSoftness, uToEdgeSoftness, uMorphProgress);
  float field = 1.0 - smoothstep(-edgeSoftness, edgeSoftness, d);

  float dotScale = ${sizeExpr};
  vec3 scaledPos = position * field * dotScale;
  vec3 worldPos = displaced + scaledPos;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
  vFieldValue = field;
  vDistance = d;
  vImgUv = vec2(0.0);
  vPosition = (displaced / uBounds) + 0.5;
}
`;

  // Fragment shader
  const opacityNode = to.children.find((c): c is OpacityNode => c.type === 'opacity');
  let opacityExpr = 'vFieldValue * 0.9';
  if (opacityNode) {
    const min = f(opacityNode.min);
    const max = f(opacityNode.max);
    if (opacityNode.mode === 'uniform') opacityExpr = max;
    else if (opacityNode.mode === 'edgeGlow') opacityExpr = `mix(${min}, ${max}, 1.0 - abs(vFieldValue - 0.5) * 2.0)`;
    else opacityExpr = `mix(${min}, ${max}, vFieldValue)`;
  }

  const fragmentShader = BASE_FRAGMENT
    .replace('{{FRAGMENT_FUNCTIONS}}', '')
    .replace('{{COLOR_LOGIC}}', 'vec3 color = mix(uColorPrimary, uColorAccent, vFieldValue);')
    .replace('{{OPACITY_EXPR}}', opacityExpr);

  return {
    vertexShader,
    fragmentShader,
    resolution,
    bounds,
    totalDots,
    fromEdgeSoftness,
    toEdgeSoftness,
    extraUniforms,
  };
}

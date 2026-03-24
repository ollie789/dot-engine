import type { FieldRoot, ShapeNode, GridNode, DisplaceNode } from '@dot-engine/core';
import { collectSnippets } from './snippets.js';
import { SMIN_GLSL } from './smin.glsl.js';
import { SIMPLEX3D_GLSL } from './noise3d.glsl.js';
import { CURL3D_GLSL } from './curl3d.glsl.js';
import { BASE_VERTEX } from '../shaders/base-vertex.js';
import { BASE_FRAGMENT } from '../shaders/base-fragment.js';

export interface CompiledField {
  vertexShader: string;
  fragmentShader: string;
  resolution: [number, number, number];
  bounds: [number, number, number];
  totalDots: number;
}

/** Format a number for GLSL — always include a decimal point. */
function f(n: number): string {
  const s = n.toString();
  return s.includes('.') ? s : s + '.0';
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
      return (
        `  displaced += normalize(${target} - displaced) * ` +
        `${strength} / max(length(${target} - displaced), 0.01);`
      );
    }

    default: {
      const _exhaustive: never = noise;
      throw new Error(`Unknown noise type: ${(_exhaustive as DisplaceNode['noise']).type}`);
    }
  }
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

  // Compile the SDF tree to GLSL snippets
  const { root: rootFn, snippets } = collectSnippets(shapeNode.sdf);

  // Combine all GLSL snippet code
  const sdfCode = snippets.map((s) => s.code).join('\n\n');

  // Include smin helper if any snippet uses it
  const needsSmin = sdfCode.includes('smin(');
  const sdfFunctions = needsSmin ? `${SMIN_GLSL}\n${sdfCode}` : sdfCode;

  // Determine which noise helpers are needed
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
    .replace('{{NOISE_FUNCTIONS}}', noiseFunctions)
    .replace('{{SDF_FUNCTIONS}}', sdfFunctions)
    .replace('{{SDF_ROOT}}', rootFn)
    .replace('{{DISPLACEMENT}}', displacementLines);

  const fragmentShader = BASE_FRAGMENT;

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
  };
}

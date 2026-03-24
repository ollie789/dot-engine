import type { FieldRoot, ShapeNode, GridNode } from '@dot-engine/core';
import { collectSnippets } from './snippets.js';
import { SMIN_GLSL } from './smin.glsl.js';
import { BASE_VERTEX } from '../shaders/base-vertex.js';
import { BASE_FRAGMENT } from '../shaders/base-fragment.js';

export interface CompiledField {
  vertexShader: string;
  fragmentShader: string;
  resolution: [number, number, number];
  bounds: [number, number, number];
  totalDots: number;
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

  // Compile the SDF tree to GLSL snippets
  const { root: rootFn, snippets } = collectSnippets(shapeNode.sdf);

  // Combine all GLSL snippet code
  const sdfCode = snippets.map((s) => s.code).join('\n\n');

  // Include smin helper if any snippet uses it
  const needsSmin = sdfCode.includes('smin(');
  const sdfFunctions = needsSmin ? `${SMIN_GLSL}\n${sdfCode}` : sdfCode;

  // Assemble vertex shader by replacing template placeholders
  const vertexShader = BASE_VERTEX
    .replace('{{SDF_FUNCTIONS}}', sdfFunctions)
    .replace('{{SDF_ROOT}}', rootFn);

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

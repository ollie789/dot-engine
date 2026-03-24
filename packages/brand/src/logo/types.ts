import type { TextureSdfNode } from '@bigpuddle/dot-engine-core';

export interface SvgInput { type: 'svg'; source: string; }
export interface ImageInput { type: 'image'; source: string; }
export interface TextInput { type: 'text'; text: string; font?: string; weight?: number; }
export type LogoInput = SvgInput | ImageInput | TextInput;

export interface ProcessedLogo {
  sdfTexture: Float32Array;
  width: number;
  height: number;
  aspectRatio: number;
  textureId: string;
  sdfNode: TextureSdfNode;
}

export interface ImportOptions {
  resolution?: number;
  depth?: number;
}

export function svg(source: string): SvgInput { return { type: 'svg', source }; }
export function image(source: string): ImageInput { return { type: 'image', source }; }
export function text(text: string, opts?: { font?: string; weight?: number }): TextInput {
  return { type: 'text', text, font: opts?.font, weight: opts?.weight };
}

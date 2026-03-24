import type { TextureSdfNode, SdfNode, FieldRoot } from '@bigpuddle/dot-engine-core';

export interface SvgInput { type: 'svg'; source: string; }
export interface ImageInput { type: 'image'; source: string; }
export interface TextInput { type: 'text'; text: string; font?: string; weight?: number; }
export interface SdfInput {
  type: 'sdf';
  node: SdfNode;
  /** Optional pre-built field — if provided, contexts use this directly instead of wrapping in shape() */
  field?: FieldRoot;
}
export type LogoInput = SvgInput | ImageInput | TextInput | SdfInput;

export interface ProcessedLogo {
  sdfTexture: Float32Array;
  width: number;
  height: number;
  aspectRatio: number;
  textureId: string;
  sdfNode: TextureSdfNode | SdfNode;
  prebuiltField?: FieldRoot | null;
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

export function sdf(node: SdfNode): SdfInput {
  return { type: 'sdf', node };
}

/** Pass a complete pre-built field — contexts will use it directly */
export function customField(fieldRoot: FieldRoot): SdfInput {
  return { type: 'sdf', node: null as any, field: fieldRoot };
}

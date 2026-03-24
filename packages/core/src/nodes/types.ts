// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

export interface BaseNode {
  readonly id: string;
}

// ---------------------------------------------------------------------------
// SDF Primitive nodes
// ---------------------------------------------------------------------------

export interface SphereNode extends BaseNode {
  readonly type: 'sphere';
  readonly radius: number;
}

export interface BoxNode extends BaseNode {
  readonly type: 'box';
  readonly halfExtents: [number, number, number];
  readonly edgeRadius?: number;
}

export interface TorusNode extends BaseNode {
  readonly type: 'torus';
  readonly majorR: number;
  readonly minorR: number;
}

export interface CylinderNode extends BaseNode {
  readonly type: 'cylinder';
  readonly radius: number;
  readonly height: number;
}

export interface CapsuleNode extends BaseNode {
  readonly type: 'capsule';
  readonly radius: number;
  readonly height: number;
}

export interface ConeNode extends BaseNode {
  readonly type: 'cone';
  readonly radius: number;
  readonly height: number;
}

export interface PlaneNode extends BaseNode {
  readonly type: 'plane';
  readonly normal: [number, number, number];
  readonly offset: number;
}

/**
 * Custom SDF node — injects raw GLSL/WGSL into the compiled shader.
 *
 * WARNING: The `glsl` string is injected directly into the shader without
 * sanitization. Do NOT use with untrusted input. If loading field descriptions
 * from external sources (user uploads, URLs, APIs), strip or reject CustomSdfNode
 * entries before compilation.
 */
export interface CustomSdfNode extends BaseNode {
  readonly type: 'customSdf';
  readonly glsl: string;
}

export interface FromField2DNode extends BaseNode {
  readonly type: 'fromField2D';
  readonly fieldId: string;
}

export interface TextureSdfNode extends BaseNode {
  readonly type: 'textureSdf';
  readonly textureId: string;
  readonly depth: number;
  readonly aspectRatio: number;
}

// ---------------------------------------------------------------------------
// SDF Boolean nodes
// ---------------------------------------------------------------------------

export interface UnionNode extends BaseNode {
  readonly type: 'union';
  readonly a: SdfNode;
  readonly b: SdfNode;
}

export interface SmoothUnionNode extends BaseNode {
  readonly type: 'smoothUnion';
  readonly a: SdfNode;
  readonly b: SdfNode;
  readonly k: number;
}

export interface SubtractNode extends BaseNode {
  readonly type: 'subtract';
  readonly a: SdfNode;
  readonly b: SdfNode;
}

export interface SmoothSubtractNode extends BaseNode {
  readonly type: 'smoothSubtract';
  readonly a: SdfNode;
  readonly b: SdfNode;
  readonly k: number;
}

export interface IntersectNode extends BaseNode {
  readonly type: 'intersect';
  readonly a: SdfNode;
  readonly b: SdfNode;
}

export interface SmoothIntersectNode extends BaseNode {
  readonly type: 'smoothIntersect';
  readonly a: SdfNode;
  readonly b: SdfNode;
  readonly k: number;
}

export interface OnionNode extends BaseNode {
  readonly type: 'onion';
  readonly child: SdfNode;
  readonly thickness: number;
}

// ---------------------------------------------------------------------------
// SDF Transform nodes
// ---------------------------------------------------------------------------

export interface TranslateNode extends BaseNode {
  readonly type: 'translate';
  readonly child: SdfNode;
  readonly offset: [number, number, number];
}

export interface RotateNode extends BaseNode {
  readonly type: 'rotate';
  readonly child: SdfNode;
  readonly angles: [number, number, number];
}

export interface ScaleNode extends BaseNode {
  readonly type: 'scale';
  readonly child: SdfNode;
  readonly factor: number;
}

// ---------------------------------------------------------------------------
// Union types
// ---------------------------------------------------------------------------

export type SdfPrimitiveNode =
  | SphereNode
  | BoxNode
  | TorusNode
  | CylinderNode
  | CapsuleNode
  | ConeNode
  | PlaneNode
  | CustomSdfNode
  | FromField2DNode
  | TextureSdfNode;

export type SdfBooleanNode =
  | UnionNode
  | SmoothUnionNode
  | SubtractNode
  | SmoothSubtractNode
  | IntersectNode
  | SmoothIntersectNode
  | OnionNode;

export type SdfTransformNode = TranslateNode | RotateNode | ScaleNode;

export type SdfNode = SdfPrimitiveNode | SdfBooleanNode | SdfTransformNode;

// ---------------------------------------------------------------------------
// Field-level nodes
// ---------------------------------------------------------------------------

export interface ShapeNode extends BaseNode {
  readonly type: 'shape';
  readonly sdf: SdfNode;
}

export interface GridNode extends BaseNode {
  readonly type: 'grid';
  readonly gridType: 'uniform';
  readonly resolution: [number, number, number];
  readonly bounds?: [number, number, number];
}

export interface AnimateNode extends BaseNode {
  readonly type: 'animate';
  readonly speed: number;
  readonly reducedMotion?: 'static' | 'reduced';
}

// ---------------------------------------------------------------------------
// Noise configs for displacement
// ---------------------------------------------------------------------------

export interface Simplex3DConfig {
  readonly type: 'simplex3D';
  readonly scale: number;
  readonly speed: number;
}

export interface DomainWarp3DConfig {
  readonly type: 'domainWarp3D';
  readonly octaves: number;
  readonly scale: number;
  readonly speed?: number;
}

export interface FlowField3DConfig {
  readonly type: 'flowField3D';
  readonly scale: number;
  readonly speed: number;
}

export interface AttractConfig {
  readonly type: 'attract';
  readonly target: [number, number, number];
  readonly strength: number;
  readonly falloff: 'inverse' | 'linear' | 'exponential';
}

export type NoiseConfig = Simplex3DConfig | DomainWarp3DConfig | FlowField3DConfig | AttractConfig;

export interface DisplaceNode extends BaseNode {
  readonly type: 'displace';
  readonly noise: NoiseConfig;
  readonly amount: number;
}

// ---------------------------------------------------------------------------
// Color nodes
// ---------------------------------------------------------------------------

export type ColorMode = 'depth' | 'position' | 'noise' | 'uniform';

export interface ColorNode extends BaseNode {
  readonly type: 'color';
  readonly primary: string;
  readonly accent: string;
  readonly mode: ColorMode;
}

export interface GradientColorNode extends BaseNode {
  readonly type: 'gradientColor';
  readonly axis: 'x' | 'y' | 'z';
  readonly stops: readonly (readonly [string, number])[];
}

export interface NoiseColorNode extends BaseNode {
  readonly type: 'noiseColor';
  readonly palette: readonly string[];
  readonly scale: number;
  readonly speed: number;
}

export type ColorFieldNode = ColorNode | GradientColorNode | NoiseColorNode;

// ---------------------------------------------------------------------------
// Size / Opacity nodes
// ---------------------------------------------------------------------------

export interface SizeNode extends BaseNode {
  readonly type: 'size';
  readonly min: number;
  readonly max: number;
  readonly mode: 'depth' | 'uniform';
}

export interface OpacityNode extends BaseNode {
  readonly type: 'opacity';
  readonly min: number;
  readonly max: number;
  readonly mode: 'depth' | 'edgeGlow' | 'uniform';
}

// ---------------------------------------------------------------------------
// Field root
// ---------------------------------------------------------------------------

export type FieldChildNode =
  | ShapeNode
  | GridNode
  | AnimateNode
  | DisplaceNode
  | ColorFieldNode
  | SizeNode
  | OpacityNode;

export interface FieldRoot extends BaseNode {
  readonly type: 'field';
  readonly children: readonly FieldChildNode[];
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let _counter = 0;

export function nodeId(): string {
  return `node_${++_counter}`;
}

export function _resetIds(): void {
  _counter = 0;
}

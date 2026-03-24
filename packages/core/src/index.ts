// Node types
export type {
  ParticleEmitter,
  ParticleLifecycle,
  ParticleMotion,
  ParticleNode,
} from './nodes/types.js';
export { particles, pointEmitter, surfaceEmitter, burstEmitter } from './nodes/particles.js';

export type {
  BaseNode,
  SphereNode,
  BoxNode,
  TorusNode,
  CylinderNode,
  CapsuleNode,
  ConeNode,
  PlaneNode,
  CustomSdfNode,
  FromField2DNode,
  TextureSdfNode,
  UnionNode,
  SmoothUnionNode,
  SubtractNode,
  SmoothSubtractNode,
  IntersectNode,
  SmoothIntersectNode,
  OnionNode,
  TranslateNode,
  RotateNode,
  ScaleNode,
  SdfPrimitiveNode,
  SdfBooleanNode,
  SdfTransformNode,
  SdfNode,
  ShapeNode,
  GridNode,
  AnimateNode,
  Simplex3DConfig,
  DomainWarp3DConfig,
  FlowField3DConfig,
  AttractConfig,
  NoiseConfig,
  DisplaceNode,
  ColorMode,
  ColorNode,
  GradientColorNode,
  NoiseColorNode,
  ColorFieldNode,
  SizeNode,
  OpacityNode,
  FieldChildNode,
  FieldRoot,
} from './nodes/types.js';
export { nodeId, _resetIds } from './nodes/types.js';

// Field-level builders
export { field } from './nodes/field.js';
export { shape } from './nodes/shape.js';
export { grid } from './nodes/grid.js';
export type { GridOptions } from './nodes/grid.js';
export { animate } from './nodes/animate.js';
export type { AnimateOptions } from './nodes/animate.js';

// Displacement builders
export { simplex3D, domainWarp3D, flowField3D, attract, displace } from './nodes/displace.js';

// Color / size / opacity builders
export { color, gradient, noiseColor } from './nodes/color.js';
export { size } from './nodes/size.js';
export { opacity } from './nodes/opacity.js';

// SDF builders
export * from './sdf/index.js';

// CPU evaluator
export { evaluateSdf } from './evaluate.js';

// JSON serialization
export type { Serializable } from './serialize.js';
export { toJSON, fromJSON } from './serialize.js';

// Presets
export { definePreset, presets, type PresetConfig } from './presets.js';

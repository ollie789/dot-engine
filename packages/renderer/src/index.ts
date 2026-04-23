export { compileField, type CompiledField, type ExtraUniform } from './compiler/compiler.js';
export { compileFieldWgsl, type CompiledWgslField } from './compiler/wgsl-compiler.js';
export { compileMorphField, type CompiledMorphField } from './compiler/morph-compiler.js';
export { DotField, type DotFieldProps } from './components/DotField.js';
export { DotFieldCanvas, type DotFieldCanvasProps } from './components/DotFieldCanvas.js';
export { DotFieldErrorBoundary, type DotFieldErrorBoundaryProps } from './components/DotFieldErrorBoundary.js';
export { MorphField, type MorphFieldProps, type MorphFieldTexture } from './components/MorphField.js';
export { VideoField, type VideoFieldProps } from './components/VideoField.js';
export { computeLodTier, clampToCanvas, type LodTier, type LodOverride, type LodQuality } from './components/LodBenchmark.js';
export { usePointerInfluence, type PointerInfluenceOptions, type PointerInfluence } from './hooks/usePointerInfluence.js';
export { useScrollInfluence, type ScrollInfluenceOptions, type ScrollInfluence } from './hooks/useScrollInfluence.js';
export { useSpring3D, type Spring3DOptions, type Spring3D } from './hooks/useSpring3D.js';
export { useTransition, type TransitionOptions, type TransitionState } from './hooks/useTransition.js';
export { ParticleSystem, type ParticleSystemProps, type ParticleSdfData, type ParticleFieldParams } from './particles/ParticleSystem.js';
export {
  createParticlePool,
  updateParticlePool,
  getParticleAlpha,
  PARTICLE_STRIDE,
  type ParticlePoolState,
} from './particles/particlePool.js';
export { applyComputeResults, DOT_STRIDE } from './compute/computeBridge.js';
export { initWebGPUCompute, dispatchCompute, readResults, destroyCompute, type WebGPUComputeContext } from './compute/WebGPUCompute.js';

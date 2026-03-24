export { compileField, type CompiledField, type ExtraUniform } from './compiler/compiler.js';
export { compileFieldWgsl, type CompiledWgslField } from './compiler/wgsl-compiler.js';
export { DotField, type DotFieldProps } from './components/DotField.js';
export { DotFieldCanvas, type DotFieldCanvasProps } from './components/DotFieldCanvas.js';
export { VideoField, type VideoFieldProps } from './components/VideoField.js';
export { computeLodTier, type LodTier, type LodOverride, type LodQuality } from './components/LodBenchmark.js';
export { usePointerInfluence, type PointerInfluenceOptions, type PointerInfluence } from './hooks/usePointerInfluence.js';
export { useScrollInfluence, type ScrollInfluenceOptions, type ScrollInfluence } from './hooks/useScrollInfluence.js';
export { useSpring3D, type Spring3DOptions, type Spring3D } from './hooks/useSpring3D.js';
export { ParticleSystem, type ParticleSystemProps } from './particles/ParticleSystem.js';
export {
  createParticlePool,
  updateParticlePool,
  getParticleAlpha,
  PARTICLE_STRIDE,
  type ParticlePoolState,
} from './particles/particlePool.js';

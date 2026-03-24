import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { FieldRoot, AnimateNode, DisplaceNode, ImageFieldNode } from '@bigpuddle/dot-engine-core';
import { compileField } from '../compiler/compiler.js';
import { computeLodTier, type LodOverride, type LodTier } from './LodBenchmark.js';

export interface DotFieldProps {
  field: FieldRoot;
  colorPrimary?: string;
  colorAccent?: string;
  lod?: 'auto' | LodOverride;
  backend?: 'auto' | 'webgl2' | 'webgpu';
  /** Pointer position in NDC (-1 to 1). Use with usePointerInfluence hook. */
  pointerPosition?: { x: number; y: number };
  /** Pointer repulsion strength 0-1. Default 0. */
  pointerStrength?: number;
  /** Texture uniforms for TextureSdf nodes, keyed by textureId. */
  textures?: Record<string, { texture: THREE.DataTexture; depth: number; aspectRatio: number }>;
  /** Image field texture (for ImageFieldNode). Keyed by textureId, value is DataTexture or VideoTexture. */
  imageTextures?: Record<string, THREE.Texture>;
}

function hexToVec3(hex: string): THREE.Vector3 {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

function geometryForComplexity(dotComplexity: number): THREE.BufferGeometry {
  if (dotComplexity >= 8) return new THREE.IcosahedronGeometry(1, 2); // 80 tris — smooth sphere
  if (dotComplexity >= 2) return new THREE.IcosahedronGeometry(1, 1); // 20 tris — decent sphere
  return new THREE.IcosahedronGeometry(1, 0);                         // 8 tris — minimal sphere
}

export function DotField({
  field: fieldDesc,
  colorPrimary = '#4a9eff',
  colorAccent = '#ff6b4a',
  lod = 'auto',
  backend = 'auto',
  pointerPosition,
  pointerStrength,
  textures,
  imageTextures,
}: DotFieldProps) {
  // WebGPU detection and stub
  const useWebGpu =
    backend === 'webgpu' ||
    (backend === 'auto' &&
      typeof navigator !== 'undefined' &&
      'gpu' in navigator);

  if (useWebGpu) {
    console.warn(
      '[dot-engine] WebGPU backend: compute shader compiled but runtime not yet implemented. Falling back to WebGL2.',
    );
  }
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const { gl } = useThree();

  // Compute LOD tier
  const lodTier = useMemo((): LodTier => {
    if (lod !== 'auto') {
      return computeLodTier(0, 1, lod);
    }
    // GPU heuristic: use pixel ratio + max texture size
    const pixelRatio = gl.getPixelRatio();
    const isHighEnd = pixelRatio >= 2 && gl.capabilities.maxTextureSize >= 8192;
    const isMobile = pixelRatio >= 2 && gl.capabilities.maxTextureSize <= 4096;

    if (isHighEnd) {
      return computeLodTier(1, 10000); // fast GPU
    } else if (isMobile) {
      return computeLodTier(14, 10000); // slow/mobile GPU
    } else {
      return computeLodTier(5, 10000); // mid GPU
    }
  }, [lod, gl]);

  // When LOD says to skip flow field, strip flowField3D displacement nodes
  const effectiveField = useMemo(() => {
    if (lodTier.includeFlowField) return fieldDesc;
    // Strip flow field displacement nodes
    const filtered = fieldDesc.children.filter(
      (c) => !(c.type === 'displace' && (c as DisplaceNode).noise.type === 'flowField3D'),
    );
    return { ...fieldDesc, children: filtered };
  }, [fieldDesc, lodTier.includeFlowField]);

  const compiled = useMemo(() => compileField(effectiveField), [effectiveField]);

  // Extract AnimateNode speed from field children
  const animateSpeed = useMemo(() => {
    const animateNode = fieldDesc.children.find(
      (c): c is AnimateNode => c.type === 'animate',
    );
    return animateNode?.speed ?? 1.0;
  }, [fieldDesc]);

  const totalDots = useMemo(
    () => Math.min(compiled.totalDots, lodTier.maxDots),
    [compiled.totalDots, lodTier.maxDots],
  );

  // Find the ImageFieldNode (if any) in the field children
  const imageFieldNode = useMemo(
    () =>
      fieldDesc.children.find(
        (c): c is ImageFieldNode => c.type === 'imageField',
      ) as ImageFieldNode | undefined,
    [fieldDesc],
  );

  const material = useMemo(() => {
    const uniforms: Record<string, { value: unknown }> = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector3(...compiled.resolution) },
      uBounds: { value: new THREE.Vector3(...compiled.bounds) },
      uColorPrimary: { value: hexToVec3(colorPrimary) },
      uColorAccent: { value: hexToVec3(colorAccent) },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerStrength: { value: 0 },
    };

    if (textures && compiled.extraUniforms) {
      for (const [tid] of Object.entries(compiled.extraUniforms)) {
        if (tid === '__imageField__') continue;
        const tex = textures[tid];
        if (tex) {
          uniforms[`uLogoSDF_${tid}`] = { value: tex.texture };
          uniforms[`uLogoDepth_${tid}`] = { value: tex.depth };
          uniforms[`uLogoAspect_${tid}`] = { value: tex.aspectRatio };
        }
      }
    }

    // Bind image field texture if present
    if (imageFieldNode && imageTextures) {
      const imgTex = imageTextures[imageFieldNode.textureId];
      if (imgTex) {
        uniforms['uImageField'] = { value: imgTex };
      }
    }

    return new THREE.ShaderMaterial({
      vertexShader: compiled.vertexShader,
      fragmentShader: compiled.fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: true,
      depthTest: true,
    });
  }, [compiled, colorPrimary, colorAccent, textures, imageFieldNode, imageTextures]);

  const geometry = useMemo(
    () => geometryForComplexity(lodTier.dotComplexity),
    [lodTier.dotComplexity],
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime * animateSpeed;
    if (pointerPosition) {
      material.uniforms.uPointer.value.set(pointerPosition.x, pointerPosition.y);
    }
    material.uniforms.uPointerStrength.value = pointerStrength ?? 0;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, totalDots]}
      frustumCulled={false}
    />
  );
}

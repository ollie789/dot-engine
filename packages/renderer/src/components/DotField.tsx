import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { FieldRoot, AnimateNode, DisplaceNode, ImageFieldNode } from '@bigpuddle/dot-engine-core';
import { compileField } from '../compiler/compiler.js';
import { compileFieldWgsl } from '../compiler/wgsl-compiler.js';
import { initWebGPUCompute, dispatchCompute, readResults, destroyCompute, type WebGPUComputeContext } from '../compute/WebGPUCompute.js';
import { applyComputeResults } from '../compute/computeBridge.js';
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

// Pre-allocate all 3 geometry variants
function createGeometries(): [THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry] {
  return [
    new THREE.IcosahedronGeometry(1, 0), // low: 8 tris
    new THREE.IcosahedronGeometry(1, 1), // medium: 20 tris
    new THREE.IcosahedronGeometry(1, 2), // high: 80 tris
  ];
}

function geometryForComplexity(
  geos: [THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry],
  dotComplexity: number,
): THREE.BufferGeometry {
  if (dotComplexity >= 8) return geos[2];
  if (dotComplexity >= 2) return geos[1];
  return geos[0];
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
    (backend === 'auto' && typeof navigator !== 'undefined' && 'gpu' in navigator);

  const { gl, scene } = useThree();

  // Compute LOD tier
  const lodTier = useMemo((): LodTier => {
    if (lod !== 'auto') return computeLodTier(0, 1, lod);
    const pixelRatio = gl.getPixelRatio();
    const isHighEnd = pixelRatio >= 2 && gl.capabilities.maxTextureSize >= 8192;
    const isMobile = pixelRatio >= 2 && gl.capabilities.maxTextureSize <= 4096;
    if (isHighEnd) return computeLodTier(1, 10000);
    if (isMobile) return computeLodTier(14, 10000);
    return computeLodTier(5, 10000);
  }, [lod, gl]);

  // Strip flow field when LOD says to
  const effectiveField = useMemo(() => {
    if (lodTier.includeFlowField) return fieldDesc;
    const filtered = fieldDesc.children.filter(
      (c) => !(c.type === 'displace' && (c as DisplaceNode).noise.type === 'flowField3D'),
    );
    return { ...fieldDesc, children: filtered };
  }, [fieldDesc, lodTier.includeFlowField]);

  // Compile shader — only when field structure changes
  const compiled = useMemo(() => compileField(effectiveField), [effectiveField]);

  // Compile WGSL shader for WebGPU compute path
  const compiledWgsl = useMemo(() => {
    if (!useWebGpu) return null;
    try {
      return compileFieldWgsl(effectiveField);
    } catch {
      return null;
    }
  }, [effectiveField, useWebGpu]);

  const animateSpeed = useMemo(() => {
    const animateNode = fieldDesc.children.find((c): c is AnimateNode => c.type === 'animate');
    return animateNode?.speed ?? 1.0;
  }, [fieldDesc]);

  const totalDots = useMemo(
    () => Math.min(compiled.totalDots, lodTier.maxDots),
    [compiled.totalDots, lodTier.maxDots],
  );

  const imageFieldNode = useMemo(
    () =>
      fieldDesc.children.find(
        (c): c is ImageFieldNode => c.type === 'imageField',
      ) as ImageFieldNode | undefined,
    [fieldDesc],
  );

  // Max capacity for the mesh — never changes during component lifetime
  const maxCapacity = lodTier.maxDots;

  // Pre-allocate all 3 geometry variants
  const geometriesRef = useRef<[THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry] | null>(null);
  if (!geometriesRef.current) {
    geometriesRef.current = createGeometries();
  }

  // Material — ONLY depends on compiled (shader source)
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

    // Create texture uniform slots (will be filled dynamically)
    if (compiled.extraUniforms) {
      for (const [tid] of Object.entries(compiled.extraUniforms)) {
        if (tid === '__imageField__') {
          uniforms['uImageField'] = { value: null };
        } else {
          uniforms[`uLogoSDF_${tid}`] = { value: null };
          uniforms[`uLogoDepth_${tid}`] = { value: 0 };
          uniforms[`uLogoAspect_${tid}`] = { value: 1 };
        }
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
  }, [compiled]); // <-- ONLY compiled

  // Dispose material when it changes
  useEffect(() => {
    return () => { material.dispose(); };
  }, [material]);

  // Dispose geometries on unmount
  useEffect(() => {
    return () => {
      if (geometriesRef.current) {
        geometriesRef.current.forEach(g => g.dispose());
      }
    };
  }, []);

  // Create the instanced mesh ONCE with max capacity
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  useEffect(() => {
    const geo = geometryForComplexity(geometriesRef.current!, lodTier.dotComplexity);
    const mesh = new THREE.InstancedMesh(geo, material, maxCapacity);
    mesh.count = totalDots;
    mesh.frustumCulled = false;
    meshRef.current = mesh;
    scene.add(mesh);
    return () => {
      scene.remove(mesh);
      mesh.dispose();
      meshRef.current = null;
    };
  }, [scene, maxCapacity]); // Only recreate if scene or max capacity changes

  // Swap geometry when LOD complexity changes
  useEffect(() => {
    if (meshRef.current && geometriesRef.current) {
      meshRef.current.geometry = geometryForComplexity(geometriesRef.current, lodTier.dotComplexity);
    }
  }, [lodTier.dotComplexity]);

  // Swap material when shader recompiles
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.material = material;
    }
  }, [material]);

  // Update mesh.count when totalDots changes
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.count = totalDots;
    }
  }, [totalDots]);

  // Sync texture uniforms dynamically
  useEffect(() => {
    if (!compiled.extraUniforms) return;
    for (const [tid] of Object.entries(compiled.extraUniforms)) {
      if (tid === '__imageField__') {
        const imgTex = imageFieldNode && imageTextures ? imageTextures[imageFieldNode.textureId] : null;
        if (material.uniforms['uImageField']) {
          material.uniforms['uImageField'].value = imgTex ?? null;
        }
      } else if (textures) {
        const tex = textures[tid];
        if (tex && material.uniforms[`uLogoSDF_${tid}`]) {
          material.uniforms[`uLogoSDF_${tid}`].value = tex.texture;
          material.uniforms[`uLogoDepth_${tid}`].value = tex.depth;
          material.uniforms[`uLogoAspect_${tid}`].value = tex.aspectRatio;
        }
      }
    }
  }, [textures, imageTextures, imageFieldNode, compiled.extraUniforms, material]);

  // WebGPU compute context
  const computeCtxRef = useRef<WebGPUComputeContext | null>(null);
  const computeResultsRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (!compiledWgsl) {
      computeCtxRef.current = null;
      return;
    }
    let destroyed = false;
    initWebGPUCompute(compiledWgsl.computeShader, totalDots).then(ctx => {
      if (destroyed) { destroyCompute(ctx); return; }
      computeCtxRef.current = ctx;
    }).catch(err => {
      console.warn('[dot-engine] WebGPU compute init failed, using WebGL fallback:', err.message);
    });
    return () => {
      destroyed = true;
      if (computeCtxRef.current) {
        destroyCompute(computeCtxRef.current);
        computeCtxRef.current = null;
      }
    };
  }, [compiledWgsl, totalDots]);

  // Cached color refs to avoid per-frame allocations
  const colorPrimRef = useRef(colorPrimary);
  const colorAccRef = useRef(colorAccent);
  const parsedPrimary = useRef(new THREE.Color(colorPrimary));
  const parsedAccent = useRef(new THREE.Color(colorAccent));

  // Per-frame updates — colors, time, pointer, compute (no allocations)
  useFrame(({ clock }) => {
    const u = material.uniforms;
    u.uTime.value = clock.elapsedTime * animateSpeed;

    // Update colors directly — only re-parse when hex string changes
    if (colorPrimRef.current !== colorPrimary) {
      colorPrimRef.current = colorPrimary;
      parsedPrimary.current.set(colorPrimary);
    }
    if (colorAccRef.current !== colorAccent) {
      colorAccRef.current = colorAccent;
      parsedAccent.current.set(colorAccent);
    }

    // WebGPU compute path: dispatch + apply results
    const ctx = computeCtxRef.current;
    if (ctx) {
      // Read previous frame's results (fire-and-forget — resolved by next frame)
      readResults(ctx).then(data => {
        if (data) computeResultsRef.current = data;
      });

      // Apply most recent results to mesh
      const mesh = meshRef.current;
      if (mesh && computeResultsRef.current) {
        const matrices = mesh.instanceMatrix.array as Float32Array;
        const visibleCount = applyComputeResults(computeResultsRef.current, matrices, ctx.totalDots);
        mesh.count = visibleCount;
        mesh.instanceMatrix.needsUpdate = true;
      }

      // Dispatch current frame's compute
      const primary = parsedPrimary.current;
      const accent = parsedAccent.current;
      dispatchCompute(
        ctx,
        clock.elapsedTime * animateSpeed,
        compiled.resolution,
        compiled.bounds,
        [primary.r, primary.g, primary.b],
        [accent.r, accent.g, accent.b],
      );
    }

    // WebGL path: update uniforms (always runs — needed even with compute for the shader material)
    const prim = u.uColorPrimary.value as THREE.Vector3;
    const acc = u.uColorAccent.value as THREE.Vector3;
    prim.set(parsedPrimary.current.r, parsedPrimary.current.g, parsedPrimary.current.b);
    acc.set(parsedAccent.current.r, parsedAccent.current.g, parsedAccent.current.b);

    if (pointerPosition) {
      (u.uPointer.value as THREE.Vector2).set(pointerPosition.x, pointerPosition.y);
    }
    u.uPointerStrength.value = pointerStrength ?? 0;
  });

  // No JSX mesh — managed imperatively
  return null;
}

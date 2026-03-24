import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { FieldRoot, AnimateNode } from '@dot-engine/core';
import { compileField } from '../compiler/compiler.js';
import { computeLodTier, type LodOverride, type LodTier } from './LodBenchmark.js';

export interface DotFieldProps {
  field: FieldRoot;
  colorPrimary?: string;
  colorAccent?: string;
  lod?: 'auto' | LodOverride;
}

function hexToVec3(hex: string): THREE.Vector3 {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

function geometryForComplexity(dotComplexity: number): THREE.BufferGeometry {
  if (dotComplexity >= 8) return new THREE.OctahedronGeometry(1, 1);
  if (dotComplexity >= 2) return new THREE.PlaneGeometry(2, 2);
  return new THREE.OctahedronGeometry(1, 0);
}

export function DotField({
  field: fieldDesc,
  colorPrimary = '#4a9eff',
  colorAccent = '#ff6b4a',
  lod = 'auto',
}: DotFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const { gl } = useThree();
  const compiled = useMemo(() => compileField(fieldDesc), [fieldDesc]);

  // Extract AnimateNode speed from field children
  const animateSpeed = useMemo(() => {
    const animateNode = fieldDesc.children.find(
      (c): c is AnimateNode => c.type === 'animate',
    );
    return animateNode?.speed ?? 1.0;
  }, [fieldDesc]);

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

  const totalDots = useMemo(
    () => Math.min(compiled.totalDots, lodTier.maxDots),
    [compiled.totalDots, lodTier.maxDots],
  );

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: compiled.vertexShader,
      fragmentShader: compiled.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector3(...compiled.resolution) },
        uBounds: { value: new THREE.Vector3(...compiled.bounds) },
        uColorPrimary: { value: hexToVec3(colorPrimary) },
        uColorAccent: { value: hexToVec3(colorAccent) },
      },
      transparent: true,
      depthWrite: false,
    });
  }, [compiled, colorPrimary, colorAccent]);

  const geometry = useMemo(
    () => geometryForComplexity(lodTier.dotComplexity),
    [lodTier.dotComplexity],
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime * animateSpeed;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, totalDots]}
      frustumCulled={false}
    />
  );
}

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FieldRoot } from '@dot-engine/core';
import { compileField } from '../compiler/compiler.js';

export interface DotFieldProps {
  field: FieldRoot;
  colorPrimary?: string;
  colorAccent?: string;
}

function hexToVec3(hex: string): THREE.Vector3 {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

export function DotField({
  field: fieldDesc,
  colorPrimary = '#4a9eff',
  colorAccent = '#ff6b4a',
}: DotFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const compiled = useMemo(() => compileField(fieldDesc), [fieldDesc]);

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

  const geometry = useMemo(() => new THREE.OctahedronGeometry(1, 1), []);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, compiled.totalDots]}
      frustumCulled={false}
    />
  );
}

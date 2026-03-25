import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FieldRoot } from '@bigpuddle/dot-engine-core';
import { compileMorphField } from '../compiler/morph-compiler.js';

export interface MorphFieldProps {
  from: FieldRoot;
  to: FieldRoot;
  progress: number;
  colorFrom?: { primary: string; accent: string };
  colorTo?: { primary: string; accent: string };
}

function hexToVec3(hex: string): THREE.Vector3 {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

function lerpVec3(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  return new THREE.Vector3(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t,
  );
}

export function MorphField({
  from,
  to,
  progress,
  colorFrom = { primary: '#4a9eff', accent: '#ff6b4a' },
  colorTo = { primary: '#4a9eff', accent: '#ff6b4a' },
}: MorphFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const compiled = useMemo(() => compileMorphField(from, to), [from, to]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: compiled.vertexShader,
      fragmentShader: compiled.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector3(...compiled.resolution) },
        uBounds: { value: new THREE.Vector3(...compiled.bounds) },
        uColorPrimary: { value: hexToVec3(colorFrom.primary) },
        uColorAccent: { value: hexToVec3(colorFrom.accent) },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uPointerStrength: { value: 0 },
        uMorphProgress: { value: 0 },
        uFromEdgeSoftness: { value: compiled.fromEdgeSoftness },
        uToEdgeSoftness: { value: compiled.toEdgeSoftness },
      },
      transparent: true,
      depthWrite: true,
      depthTest: true,
    });
  }, [compiled, colorFrom, colorTo]);

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);

  useEffect(() => { return () => { material.dispose(); }; }, [material]);
  useEffect(() => { return () => { geometry.dispose(); }; }, [geometry]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uMorphProgress.value = progress;
    // Lerp colors on CPU
    const fromPrimary = hexToVec3(colorFrom.primary);
    const fromAccent = hexToVec3(colorFrom.accent);
    const toPrimary = hexToVec3(colorTo.primary);
    const toAccent = hexToVec3(colorTo.accent);
    const p = material.uniforms.uColorPrimary.value as THREE.Vector3;
    const a = material.uniforms.uColorAccent.value as THREE.Vector3;
    p.copy(lerpVec3(fromPrimary, toPrimary, progress));
    a.copy(lerpVec3(fromAccent, toAccent, progress));
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, compiled.totalDots]}
      frustumCulled={false}
    />
  );
}

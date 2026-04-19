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
  /** 0..1 multiplier applied to every dot's alpha. Default 1. */
  opacity?: number;
}

function hexToVec3(hex: string): THREE.Vector3 {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

export function MorphField({
  from,
  to,
  progress,
  colorFrom = { primary: '#4a9eff', accent: '#ff6b4a' },
  colorTo = { primary: '#4a9eff', accent: '#ff6b4a' },
  opacity = 1,
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
        uGlobalOpacity: { value: 1 },
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

  // Cached color refs to avoid per-frame allocations (same pattern as DotField)
  const fromPrimRef = useRef(colorFrom.primary);
  const fromAccRef = useRef(colorFrom.accent);
  const toPrimRef = useRef(colorTo.primary);
  const toAccRef = useRef(colorTo.accent);
  const parsedFromPrim = useRef(new THREE.Color(colorFrom.primary));
  const parsedFromAcc = useRef(new THREE.Color(colorFrom.accent));
  const parsedToPrim = useRef(new THREE.Color(colorTo.primary));
  const parsedToAcc = useRef(new THREE.Color(colorTo.accent));

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uMorphProgress.value = progress;
    material.uniforms.uGlobalOpacity.value = opacity;

    // Only re-parse when hex strings change
    if (fromPrimRef.current !== colorFrom.primary) { fromPrimRef.current = colorFrom.primary; parsedFromPrim.current.set(colorFrom.primary); }
    if (fromAccRef.current !== colorFrom.accent) { fromAccRef.current = colorFrom.accent; parsedFromAcc.current.set(colorFrom.accent); }
    if (toPrimRef.current !== colorTo.primary) { toPrimRef.current = colorTo.primary; parsedToPrim.current.set(colorTo.primary); }
    if (toAccRef.current !== colorTo.accent) { toAccRef.current = colorTo.accent; parsedToAcc.current.set(colorTo.accent); }

    // Lerp colors in-place — zero allocations
    const p = material.uniforms.uColorPrimary.value as THREE.Vector3;
    const a = material.uniforms.uColorAccent.value as THREE.Vector3;
    const t = progress;
    p.set(
      parsedFromPrim.current.r + (parsedToPrim.current.r - parsedFromPrim.current.r) * t,
      parsedFromPrim.current.g + (parsedToPrim.current.g - parsedFromPrim.current.g) * t,
      parsedFromPrim.current.b + (parsedToPrim.current.b - parsedFromPrim.current.b) * t,
    );
    a.set(
      parsedFromAcc.current.r + (parsedToAcc.current.r - parsedFromAcc.current.r) * t,
      parsedFromAcc.current.g + (parsedToAcc.current.g - parsedFromAcc.current.g) * t,
      parsedFromAcc.current.b + (parsedToAcc.current.b - parsedFromAcc.current.b) * t,
    );
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, compiled.totalDots]}
      frustumCulled={false}
    />
  );
}

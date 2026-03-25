import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ParticleNode } from '@bigpuddle/dot-engine-core';
import {
  PARTICLE_STRIDE,
  createParticlePool,
  updateParticlePool,
  getParticleAlpha,
  type ParticlePoolState,
} from './particlePool.js';

export interface ParticleSystemProps {
  config: ParticleNode;
  color?: string;
  size?: number;
}

export function ParticleSystem({ config, color = '#4a9eff', size = 0.015 }: ParticleSystemProps) {
  const maxParticles = config.maxParticles ?? 1000;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const stateRef = useRef<ParticlePoolState>(createParticlePool(maxParticles));
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.033);
    const state = stateRef.current;
    const mesh = meshRef.current;
    if (!mesh) return;

    updateParticlePool(state, dt, config, maxParticles);

    const { pool, alive } = state;
    const fadeIn = config.lifecycle.fadeIn ?? 0.1;
    const fadeOut = config.lifecycle.fadeOut ?? 0.3;

    for (let i = 0; i < alive; i++) {
      const si = i * PARTICLE_STRIDE;
      dummy.position.set(pool[si], pool[si + 1], pool[si + 2]);
      const alpha = getParticleAlpha(pool, i, fadeIn, fadeOut);
      const s = size * alpha;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.count = alive;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, maxParticles]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
    </instancedMesh>
  );
}

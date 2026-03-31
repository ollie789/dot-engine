import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ParticleNode } from '@bigpuddle/dot-engine-core';
import {
  PARTICLE_STRIDE,
  createParticlePool,
  updateParticlePool,
  getParticleAlpha,
  type ParticlePoolState,
  type ParticleFieldParams,
} from './particlePool.js';
import type { ParticleSdfData } from './sdfSampler.js';

export type { ParticleSdfData } from './sdfSampler.js';
export type { ParticleFieldParams } from './particlePool.js';

export interface ParticleSystemProps {
  config: ParticleNode;
  color?: string;
  size?: number;
  sdfData?: ParticleSdfData;
  fieldParams?: ParticleFieldParams;
}

const PARTICLE_VERTEX = /* glsl */ `
  attribute float instanceOpacity;
  varying float vOpacity;
  void main() {
    vOpacity = instanceOpacity;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vOpacity;
  void main() {
    gl_FragColor = vec4(uColor, vOpacity);
  }
`;

export function ParticleSystem({
  config,
  color = '#4a9eff',
  size = 0.015,
  sdfData,
  fieldParams,
}: ParticleSystemProps) {
  const maxParticles = config.maxParticles ?? 1000;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const stateRef = useRef<ParticlePoolState>(createParticlePool(maxParticles));
  const globalTimeRef = useRef(0);
  const opacityRef = useRef(new Float32Array(maxParticles));
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const material = useMemo(() => {
    const colorObj = new THREE.Color(color);
    return new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      uniforms: { uColor: { value: colorObj } },
      transparent: true,
      depthWrite: false,
    });
  }, []);

  useEffect(() => {
    material.uniforms.uColor.value.set(color);
  }, [color, material]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const attr = new THREE.InstancedBufferAttribute(opacityRef.current, 1);
    attr.setUsage(THREE.DynamicDrawUsage);
    mesh.geometry.setAttribute('instanceOpacity', attr);
  }, [maxParticles]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.033);
    globalTimeRef.current += dt;
    const state = stateRef.current;
    const mesh = meshRef.current;
    if (!mesh) return;

    updateParticlePool(
      state, dt, config, maxParticles,
      sdfData, fieldParams, globalTimeRef.current,
    );

    const { pool, alive } = state;
    const fadeIn = config.lifecycle.fadeIn ?? 0.1;
    const fadeOut = config.lifecycle.fadeOut ?? 0.3;
    const opacityArr = opacityRef.current;

    for (let i = 0; i < alive; i++) {
      const si = i * PARTICLE_STRIDE;
      dummy.position.set(pool[si], pool[si + 1], pool[si + 2]);
      const alpha = getParticleAlpha(pool, i, fadeIn, fadeOut);
      const s = size * (0.5 + 0.5 * alpha);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      opacityArr[i] = alpha * 0.6;
    }

    mesh.count = alive;
    mesh.instanceMatrix.needsUpdate = true;
    const opacityAttr = mesh.geometry.getAttribute('instanceOpacity') as THREE.InstancedBufferAttribute;
    if (opacityAttr) opacityAttr.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, maxParticles]} frustumCulled={false} material={material}>
      <icosahedronGeometry args={[1, 1]} />
    </instancedMesh>
  );
}

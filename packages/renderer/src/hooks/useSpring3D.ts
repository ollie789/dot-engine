import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface Spring3DOptions {
  /** Spring stiffness. Default 120 */
  stiffness?: number;
  /** Damping coefficient. Default 14 */
  damping?: number;
  /** Initial position */
  initial?: [number, number, number];
  enabled?: boolean;
}

export interface Spring3D {
  /** Current smoothed position */
  position: THREE.Vector3;
  /** Current velocity */
  velocity: THREE.Vector3;
  /** Set the target position the spring moves toward */
  setTarget: (x: number, y: number, z: number) => void;
  /** Snap to position immediately (no animation) */
  snap: (x: number, y: number, z: number) => void;
}

export function useSpring3D(options?: Spring3DOptions): Spring3D {
  const { stiffness = 120, damping = 14, initial = [0, 0, 0], enabled = true } = options ?? {};

  const position = useRef(new THREE.Vector3(...initial));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const target = useRef(new THREE.Vector3(...initial));

  useFrame((_, delta) => {
    if (!enabled) return;
    const dt = Math.min(delta, 0.033); // cap at ~30fps worth of dt
    const p = position.current;
    const v = velocity.current;
    const t = target.current;

    // Critically damped spring: F = -stiffness * (p - t) - damping * v
    const fx = stiffness * (t.x - p.x) - damping * v.x;
    const fy = stiffness * (t.y - p.y) - damping * v.y;
    const fz = stiffness * (t.z - p.z) - damping * v.z;

    v.x += fx * dt;
    v.y += fy * dt;
    v.z += fz * dt;

    p.x += v.x * dt;
    p.y += v.y * dt;
    p.z += v.z * dt;
  });

  const setTarget = (x: number, y: number, z: number) => {
    target.current.set(x, y, z);
  };

  const snap = (x: number, y: number, z: number) => {
    position.current.set(x, y, z);
    velocity.current.set(0, 0, 0);
    target.current.set(x, y, z);
  };

  return {
    position: position.current,
    velocity: velocity.current,
    setTarget,
    snap,
  };
}

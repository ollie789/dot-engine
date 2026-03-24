import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface PointerInfluenceOptions {
  /** Smoothing factor 0-1 (0 = instant, 0.9 = very smooth). Default 0.85 */
  smoothing?: number;
  /** Whether the hook is active. Default true */
  enabled?: boolean;
}

export interface PointerInfluence {
  /** Smoothed pointer position in NDC (-1 to 1). Updated each frame. */
  position: THREE.Vector2;
  /** Whether the pointer is currently over the canvas */
  isOver: boolean;
}

export function usePointerInfluence(options?: PointerInfluenceOptions): PointerInfluence {
  const { smoothing = 0.85, enabled = true } = options ?? {};
  const { gl } = useThree();

  const rawPointer = useRef(new THREE.Vector2(0, 0));
  const smoothed = useRef(new THREE.Vector2(0, 0));
  const isOver = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const canvas = gl.domElement;

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      rawPointer.current.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      isOver.current = true;
    };

    const onLeave = () => {
      isOver.current = false;
    };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [gl, enabled]);

  useFrame(() => {
    if (!enabled) return;
    const s = smoothing;
    smoothed.current.x = smoothed.current.x * s + rawPointer.current.x * (1 - s);
    smoothed.current.y = smoothed.current.y * s + rawPointer.current.y * (1 - s);
  });

  return {
    position: smoothed.current,
    isOver: isOver.current,
  };
}

import { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';

export interface TransitionOptions {
  duration?: number;
  easing?: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut';
}

export interface TransitionState {
  progress: number;
  isTransitioning: boolean;
  start: () => void;
  reset: () => void;
}

function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case 'easeIn': return t * t;
    case 'easeOut': return t * (2 - t);
    case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default: return t;
  }
}

export function useTransition(options?: TransitionOptions): TransitionState {
  const duration = (options?.duration ?? 1000) / 1000; // convert to seconds
  const easing = options?.easing ?? 'easeInOut';
  const elapsedRef = useRef(0);
  const activeRef = useRef(false);
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!activeRef.current) return;
    elapsedRef.current += delta;
    const raw = Math.min(elapsedRef.current / duration, 1);
    progressRef.current = applyEasing(raw, easing);
    if (raw >= 1) {
      activeRef.current = false;
    }
  });

  const start = useCallback(() => {
    elapsedRef.current = 0;
    activeRef.current = true;
    progressRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    elapsedRef.current = 0;
    activeRef.current = false;
    progressRef.current = 0;
  }, []);

  return {
    progress: progressRef.current,
    isTransitioning: activeRef.current,
    start,
    reset,
  };
}

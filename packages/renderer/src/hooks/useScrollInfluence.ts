import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

export interface ScrollInfluenceOptions {
  /** Element to track scroll on. Default: window */
  target?: HTMLElement | null;
  /** Scroll range in pixels that maps to 0-1. Default: document height */
  range?: number;
  /** Offset in pixels before scroll starts affecting. Default: 0 */
  offset?: number;
  /** Smoothing factor 0-1. Default 0.9 */
  smoothing?: number;
  enabled?: boolean;
}

export interface ScrollInfluence {
  /** Smoothed scroll progress 0-1 */
  progress: number;
  /** Raw scroll position in pixels */
  scrollY: number;
}

export function useScrollInfluence(options?: ScrollInfluenceOptions): ScrollInfluence {
  const { target, range, offset = 0, smoothing = 0.9, enabled = true } = options ?? {};

  const rawProgress = useRef(0);
  const smoothedProgress = useRef(0);
  const scrollY = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const el = target ?? window;

    const onScroll = () => {
      const y = el === window ? window.scrollY : (el as HTMLElement).scrollTop;
      scrollY.current = y;
      const totalRange = range ?? (document.documentElement.scrollHeight - window.innerHeight);
      rawProgress.current = Math.max(0, Math.min(1, (y - offset) / Math.max(totalRange, 1)));
    };

    onScroll(); // initial
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [target, range, offset, enabled]);

  useFrame(() => {
    if (!enabled) return;
    const s = smoothing;
    smoothedProgress.current = smoothedProgress.current * s + rawProgress.current * (1 - s);
  });

  return {
    progress: smoothedProgress.current,
    scrollY: scrollY.current,
  };
}

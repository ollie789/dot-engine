import { describe, it, expect } from 'vitest';
import {
  sampleSdfSurface,
  sampleSdfVolume,
  type ParticleSdfData,
} from '../src/particles/sdfSampler.js';

/**
 * Build a synthetic SDF: a circle of radius 0.3 centered at (0.5, 0.5) in UV space.
 * SDF values: negative inside, positive outside, zero at boundary.
 */
function makeCircleSdf(size: number): ParticleSdfData {
  const texture = new Float32Array(size * size);
  const cx = 0.5, cy = 0.5, r = 0.3;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const u = (col + 0.5) / size;
      const v = (row + 0.5) / size;
      const dist = Math.sqrt((u - cx) ** 2 + (v - cy) ** 2) - r;
      texture[row * size + col] = dist;
    }
  }
  return { texture, width: size, height: size, aspectRatio: 1, depth: 0.3 };
}

describe('sampleSdfSurface', () => {
  const sdf = makeCircleSdf(64);

  it('returns a 3-element position', () => {
    const pos = sampleSdfSurface(sdf);
    expect(pos).toHaveLength(3);
  });

  it('spawns near the SDF zero-crossing (shape boundary)', () => {
    const distances: number[] = [];
    for (let i = 0; i < 100; i++) {
      const [x, y] = sampleSdfSurface(sdf);
      const u = x / 2 + 0.5;
      const v = 0.5 - y / 2;
      const dist = Math.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2);
      distances.push(Math.abs(dist - 0.3));
    }
    const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
    expect(avgDist).toBeLessThan(0.05);
  });

  it('z position is within depth bounds', () => {
    for (let i = 0; i < 50; i++) {
      const [, , z] = sampleSdfSurface(sdf);
      expect(Math.abs(z)).toBeLessThanOrEqual(sdf.depth / 2 + 0.001);
    }
  });
});

describe('sampleSdfVolume', () => {
  const sdf = makeCircleSdf(64);

  it('returns a 3-element position', () => {
    const pos = sampleSdfVolume(sdf);
    expect(pos).toHaveLength(3);
  });

  it('spawns inside the shape (negative SDF region)', () => {
    for (let i = 0; i < 50; i++) {
      const [x, y] = sampleSdfVolume(sdf);
      const u = x / 2 + 0.5;
      const v = 0.5 - y / 2;
      const dist = Math.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2);
      expect(dist).toBeLessThan(0.35);
    }
  });
});

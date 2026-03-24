import { describe, it, expect } from 'vitest';
import { computeSignedDistance } from '../src/logo/edt.js';

function makeCircleMask(size: number, radius: number): Uint8Array {
  const cx = size / 2;
  const cy = size / 2;
  const mask = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      // mask=1 means inside the shape (matches loader convention)
      mask[y * size + x] = Math.sqrt(dx * dx + dy * dy) <= radius ? 1 : 0;
    }
  }
  return mask;
}

describe('SDF from circle mask (32x32)', () => {
  const size = 32;
  const radius = 10;
  const mask = makeCircleMask(size, radius);
  const sdf = computeSignedDistance(mask, size, size);

  it('center is negative (inside the shape)', () => {
    const cx = Math.round(size / 2);
    const cy = Math.round(size / 2);
    expect(sdf[cy * size + cx]).toBeLessThan(0);
  });

  it('corner is positive (outside the shape)', () => {
    // (0,0) is in the corner, far from center
    expect(sdf[0]).toBeGreaterThan(0);
  });

  it('edge pixel is near zero', () => {
    // Pixel at (cx + radius, cy) should be right on the edge
    const cx = Math.round(size / 2);
    const cy = Math.round(size / 2);
    const edgeX = Math.round(cx + radius);
    const edgeY = cy;
    const val = sdf[edgeY * size + edgeX];
    expect(Math.abs(val)).toBeLessThan(0.1);
  });
});

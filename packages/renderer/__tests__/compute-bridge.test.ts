import { describe, it, expect } from 'vitest';
import { applyComputeResults, DOT_STRIDE } from '../src/compute/computeBridge.js';

describe('applyComputeResults', () => {
  it('returns 0 visible for empty buffer', () => {
    const results = new Float32Array(0);
    const matrices = new Float32Array(0);
    const count = applyComputeResults(results, matrices, 0);
    expect(count).toBe(0);
  });

  it('writes correct matrix for a visible dot', () => {
    // One dot: position [1, 2, 3], scale 0.5, color [1, 0, 0], alpha 1
    const results = new Float32Array([1, 2, 3, 0.5, 1, 0, 0, 1]);
    const matrices = new Float32Array(16); // one 4x4 matrix
    const count = applyComputeResults(results, matrices, 1);
    expect(count).toBe(1);
    // Matrix should encode position and scale:
    // [scale, 0, 0, 0,  0, scale, 0, 0,  0, 0, scale, 0,  x, y, z, 1]
    expect(matrices[0]).toBeCloseTo(0.5);  // scale x
    expect(matrices[5]).toBeCloseTo(0.5);  // scale y
    expect(matrices[10]).toBeCloseTo(0.5); // scale z
    expect(matrices[12]).toBeCloseTo(1);   // position x
    expect(matrices[13]).toBeCloseTo(2);   // position y
    expect(matrices[14]).toBeCloseTo(3);   // position z
    expect(matrices[15]).toBeCloseTo(1);   // w
  });

  it('skips dots with scale ~ 0 (culled)', () => {
    const results = new Float32Array([
      // dot 0: visible
      1, 0, 0, 0.5, 1, 1, 1, 1,
      // dot 1: culled (scale = 0)
      2, 0, 0, 0, 1, 1, 1, 1,
      // dot 2: visible
      3, 0, 0, 0.3, 1, 1, 1, 1,
    ]);
    const matrices = new Float32Array(3 * 16);
    const count = applyComputeResults(results, matrices, 3);
    expect(count).toBe(2);
    // First visible dot at position [1,0,0]
    expect(matrices[12]).toBeCloseTo(1);
    // Second visible dot at position [3,0,0] — compacted into slot 1
    expect(matrices[16 + 12]).toBeCloseTo(3);
  });

  it('handles large buffer correctly', () => {
    const numDots = 1000;
    const results = new Float32Array(numDots * DOT_STRIDE);
    // Make every other dot visible
    for (let i = 0; i < numDots; i++) {
      const offset = i * DOT_STRIDE;
      results[offset] = i;     // x
      results[offset + 1] = 0; // y
      results[offset + 2] = 0; // z
      results[offset + 3] = i % 2 === 0 ? 0.1 : 0; // scale: even=visible, odd=culled
    }
    const matrices = new Float32Array(numDots * 16);
    const count = applyComputeResults(results, matrices, numDots);
    expect(count).toBe(500);
  });
});

import { describe, it, expect } from 'vitest';
import { computeEDT, computeSignedDistance } from '../src/logo/edt.js';

// Helper: circle mask for size x size grid
// mask[i]=1 means "outside" (the EDT computes distance from 0-pixels to nearest 1-pixel)
function makeCircle(size: number, radius: number): Uint8Array {
  const cx = size / 2;
  const cy = size / 2;
  const mask = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      mask[y * size + x] = Math.sqrt(dx * dx + dy * dy) > radius ? 1 : 0;
    }
  }
  return mask;
}

describe('computeEDT', () => {
  it('returns Float32Array of correct length', () => {
    const mask = new Uint8Array(25).fill(0);
    const result = computeEDT(mask, 5, 5);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(25);
  });

  it('5x5: corner pixel with mask=1 has distance ~sqrt(2) from nearest mask=0 diagonal', () => {
    // mask=1 at corners, mask=0 everywhere else
    // A 5x5 mask with just 4 corners = 1
    const mask = new Uint8Array(25).fill(0);
    mask[0] = 1;        // (0,0)
    mask[4] = 1;        // (4,0)
    mask[20] = 1;       // (0,4)
    mask[24] = 1;       // (4,4)
    // (0,0) nearest 0-pixel is (1,0) at distance 1 or (0,1) at distance 1
    const result = computeEDT(mask, 5, 5);
    // (0,0) is a 1-pixel, the EDT from-zero distance: corner pixels (mask=1)
    // EDT computes dist to nearest 0, so (0,0) → nearest 0 is (1,0) at dist=1
    expect(result[0]).toBeCloseTo(1, 5);
    // Center (2,2) is mask=0, so distance to nearest 1-pixel:
    // nearest 1 is at corner (0,0), distance = sqrt(4+4) = 2.83
    // But since all interior is 0, interior pixels have distance = 0 (they ARE zero-source pixels)
    // Wait - EDT computes for each pixel the distance to the nearest pixel where mask=1
    // For mask=0 pixels: the distance is to nearest mask=1 pixel
    // For mask=1 pixels: since they start at INF, they get the distance to nearest mask=0 pixel
    // Actually: EDT computes distance transform where "foreground" = mask[i]=0, "background" = mask[i]=1
    // Each pixel's value = distance to nearest foreground (0) pixel
    // So mask=0 pixels have distance 0 (they ARE foreground)
    expect(result[2 * 5 + 2]).toBe(0);
  });

  it('right-half 10x10 mask: x=9 has larger distance than x=5', () => {
    // Right half (x >= 5) is inside (mask=0), left half (x < 5) is outside (mask=1)
    // EDT gives distance from each pixel to nearest mask=0 pixel
    // x=5..9 are mask=0 (distance=0 for themselves), but left-half pixels get distances
    // Reversed: left half mask=1 means they compute distance to nearest 0 (right half)
    // x=4 in left-half: distance to nearest 0 (x=5) is 1
    // x=0 in left-half: distance to nearest 0 (x=5) is 5
    const mask = new Uint8Array(100);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        // Left half is outside (mask=1), right half is inside (mask=0)
        mask[y * 10 + x] = x < 5 ? 1 : 0;
      }
    }
    const result = computeEDT(mask, 10, 10);
    // In left-half: x=0 is farther from boundary than x=4
    const distAtX0 = result[5 * 10 + 0];
    const distAtX4 = result[5 * 10 + 4];
    expect(distAtX0).toBeGreaterThan(distAtX4);
  });

  it('all-zero mask returns all zeros', () => {
    const mask = new Uint8Array(25).fill(0);
    const result = computeEDT(mask, 5, 5);
    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBe(0);
    }
  });

  it('circle mask (32x32): center has distance > 0 (distance to outside edge)', () => {
    // mask=1 means outside, mask=0 means inside
    // EDT computes distance to nearest mask=0 pixel
    // For mask=0 (inside) pixels, distance = 0
    // For mask=1 (outside) pixels, distance = distance to nearest inside pixel
    // But we want to know if the algorithm correctly handles a circle
    // Let's use inverted: mask=0 inside circle, mask=1 outside
    const mask = makeCircle(32, 10);
    const result = computeEDT(mask, 32, 32);
    // Center (16,16) is inside (mask=0), distance = 0
    const cx = 16, cy = 16;
    expect(result[cy * 32 + cx]).toBe(0);
    // Corner (0,0) is outside (mask=1), nearest inside is about sqrt(2)*6 = radius - sqrt(16^2+16^2)
    // Actually corner is ~22.6 from center, radius=10, so distance = 22.6-10 = 12.6 approx
    expect(result[0]).toBeGreaterThan(10);
  });
});

describe('computeSignedDistance', () => {
  it('returns Float32Array of correct length', () => {
    const mask = makeCircle(32, 10);
    const result = computeSignedDistance(mask, 32, 32);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(32 * 32);
  });

  it('negative inside the shape (mask=0 region)', () => {
    // mask[i]=0 means inside the shape
    // SDF should be negative inside
    const mask = makeCircle(32, 10);
    const sdf = computeSignedDistance(mask, 32, 32);
    const cx = 16, cy = 16;
    const centerVal = sdf[cy * 32 + cx];
    expect(centerVal).toBeLessThan(0);
  });

  it('positive outside the shape (mask=1 region)', () => {
    const mask = makeCircle(32, 10);
    const sdf = computeSignedDistance(mask, 32, 32);
    // Corner (0,0) is far outside
    const cornerVal = sdf[0];
    expect(cornerVal).toBeGreaterThan(0);
  });

  it('near-zero at the edge', () => {
    const size = 32;
    const radius = 10;
    const mask = makeCircle(size, radius);
    const sdf = computeSignedDistance(mask, size, size);
    // Find a pixel near the edge of the circle
    const cx = size / 2;
    const cy = size / 2;
    // Pixel at approximately radius distance from center
    const edgeX = Math.round(cx + radius);
    const edgeY = Math.round(cy);
    const edgeVal = sdf[edgeY * size + edgeX];
    expect(Math.abs(edgeVal)).toBeLessThan(0.1);
  });

  it('signed distance: negative inside, positive outside', () => {
    // Simple 5x5: center column is inside (mask=0), edges are outside (mask=1)
    const mask = new Uint8Array(25).fill(1);
    // Make a cross/center region inside
    for (let y = 1; y < 4; y++) {
      mask[y * 5 + 2] = 0; // center column, rows 1-3
    }
    mask[2 * 5 + 2] = 0; // center
    const sdf = computeSignedDistance(mask, 5, 5);
    // Inside pixels (mask=0) should be negative
    expect(sdf[2 * 5 + 2]).toBeLessThan(0);
    // Outside corner (mask=1) should be positive
    expect(sdf[0]).toBeGreaterThan(0);
  });
});

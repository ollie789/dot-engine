import { describe, it, expect } from 'vitest';
import { curlNoise3D } from '../src/particles/curlNoise.js';

describe('curlNoise3D', () => {
  it('returns a 3-element tuple', () => {
    const result = curlNoise3D(0, 0, 0, 0, 1);
    expect(result).toHaveLength(3);
  });

  it('produces non-zero output for non-degenerate input', () => {
    const [cx, cy, cz] = curlNoise3D(1, 2, 3, 1, 2);
    const mag = Math.sqrt(cx * cx + cy * cy + cz * cz);
    expect(mag).toBeGreaterThan(0.001);
  });

  it('varies smoothly — nearby inputs produce similar outputs', () => {
    const a = curlNoise3D(1, 1, 1, 0, 2);
    const b = curlNoise3D(1.001, 1, 1, 0, 2);
    const diff = Math.sqrt(
      (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
    );
    expect(diff).toBeLessThan(0.1);
  });

  it('produces different output at different times', () => {
    const a = curlNoise3D(1, 1, 1, 0, 2);
    const b = curlNoise3D(1, 1, 1, 5, 2);
    const diff = Math.sqrt(
      (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
    );
    expect(diff).toBeGreaterThan(0.01);
  });

  it('is approximately divergence-free', () => {
    const e = 0.001;
    const x = 1, y = 2, z = 3, t = 1, s = 2;
    const cxp = curlNoise3D(x + e, y, z, t, s);
    const cxn = curlNoise3D(x - e, y, z, t, s);
    const cyp = curlNoise3D(x, y + e, z, t, s);
    const cyn = curlNoise3D(x, y - e, z, t, s);
    const czp = curlNoise3D(x, y, z + e, t, s);
    const czn = curlNoise3D(x, y, z - e, t, s);
    const div =
      (cxp[0] - cxn[0]) / (2 * e) +
      (cyp[1] - cyn[1]) / (2 * e) +
      (czp[2] - czn[2]) / (2 * e);
    expect(Math.abs(div)).toBeLessThan(0.5);
  });
});

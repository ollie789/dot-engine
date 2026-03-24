import { describe, it, expect } from 'vitest';
import { exportSVG } from '../src/svg';
import { field, shape, grid, sphere, smoothUnion, torus, translate, color } from '@dot-engine/core';

describe('exportSVG', () => {
  it('exports a simple sphere as SVG', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
    );
    const result = exportSVG(f, { width: 400, height: 400 });
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('</svg>');
    expect(result.svg).toContain('<circle');
    expect(result.dotCount).toBeGreaterThan(0);
    expect(result.dotCount).toBeLessThan(1000); // only dots inside sphere
  });

  it('respects color node', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [8, 8, 8] }),
      color({ primary: '#ff0000', accent: '#0000ff' }),
    );
    const result = exportSVG(f, { width: 400, height: 400 });
    expect(result.svg).toContain('rgb('); // color mixing
  });

  it('handles custom camera position', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [8, 8, 8] }),
    );
    const result = exportSVG(f, {
      width: 400,
      height: 400,
      camera: { position: [2, 2, 2], fov: 60 },
    });
    expect(result.svg).toContain('<circle');
  });

  it('includes background when specified', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [6, 6, 6] }),
    );
    const result = exportSVG(f, { width: 400, height: 400, background: '#000000' });
    expect(result.svg).toContain('fill="#000000"');
  });

  it('exports smooth union shape', () => {
    const f = field(
      shape(smoothUnion(sphere(0.5), translate(torus(0.3, 0.1), [0, 0.3, 0]), 0.2)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
    );
    const result = exportSVG(f, { width: 800, height: 800 });
    expect(result.dotCount).toBeGreaterThan(0);
  });

  it('returns zero dots for shape entirely outside grid', () => {
    const f = field(
      shape(translate(sphere(0.1), [10, 10, 10])),
      grid({ type: 'uniform', resolution: [6, 6, 6] }),
    );
    const result = exportSVG(f, { width: 400, height: 400 });
    expect(result.dotCount).toBe(0);
  });
});

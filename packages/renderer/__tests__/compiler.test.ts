import { describe, it, expect } from 'vitest';
import { field, shape, grid, sphere, smoothUnion } from '../../core/src/index.js';
import { compileField } from '../src/compiler/compiler.js';

describe('compileField', () => {
  it('sphere field: vertexShader contains void main(), length(p), radius, and uniforms', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
    );
    const compiled = compileField(f);

    expect(compiled.vertexShader).toContain('void main()');
    expect(compiled.vertexShader).toContain('length(p)');
    expect(compiled.vertexShader).toContain('0.5');
    expect(compiled.vertexShader).toContain('uResolution');
    expect(compiled.vertexShader).toContain('uBounds');
    expect(compiled.vertexShader).toContain('uTime');
  });

  it('smoothUnion field: vertexShader contains smin', () => {
    const f = field(
      shape(smoothUnion(sphere(0.5), sphere(0.3), 0.2)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
    );
    const compiled = compileField(f);

    expect(compiled.vertexShader).toContain('smin(');
    expect(compiled.vertexShader).toContain('float smin(');
  });

  it('grid metadata: resolution matches and totalDots is product', () => {
    const res: [number, number, number] = [8, 10, 12];
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: res }),
    );
    const compiled = compileField(f);

    expect(compiled.resolution).toEqual(res);
    expect(compiled.totalDots).toBe(8 * 10 * 12);
  });

  it('uses custom bounds when provided', () => {
    const bounds: [number, number, number] = [4, 4, 4];
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5], bounds }),
    );
    const compiled = compileField(f);
    expect(compiled.bounds).toEqual(bounds);
  });

  it('defaults bounds to [2, 2, 2] when not specified', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
    );
    const compiled = compileField(f);
    expect(compiled.bounds).toEqual([2, 2, 2]);
  });

  it('throws if ShapeNode is missing', () => {
    const f = field(grid({ type: 'uniform', resolution: [5, 5, 5] }));
    expect(() => compileField(f)).toThrow('ShapeNode');
  });

  it('throws if GridNode is missing', () => {
    const f = field(shape(sphere(0.5)));
    expect(() => compileField(f)).toThrow('GridNode');
  });

  it('fragment shader contains void main() and gl_FragColor', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('void main()');
    expect(compiled.fragmentShader).toContain('gl_FragColor');
  });
});

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

  it('vertex shader declares uEdgeSoftness and uAutoSize uniforms', () => {
    const root = field(
      shape(sphere(1)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
    );
    const compiled = compileField(root);
    expect(compiled.vertexShader).toContain('uniform float uEdgeSoftness');
    expect(compiled.vertexShader).toContain('uniform float uAutoSize');
    expect(compiled.vertexShader).toContain('float edgeSoftness = uEdgeSoftness');
  });

  it('edgeSoftness is returned on CompiledField', () => {
    const root = {
      ...field(
        shape(sphere(1)),
        grid({ type: 'uniform', resolution: [10, 10, 10] }),
      ),
      edgeSoftness: 0.08,
    };
    const compiled = compileField(root);
    expect(compiled.edgeSoftness).toBe(0.08);
  });

  it('autoSize is computed from resolution and bounds when no explicit size node', () => {
    const root = field(
      shape(sphere(1)),
      grid({ type: 'uniform', resolution: [10, 10, 10], bounds: [2, 2, 2] as [number, number, number] }),
    );
    const compiled = compileField(root);
    // avgRes = 10, avgBounds = 2, autoSize = (2/10) * 0.4 = 0.08 → clamped to max 0.05
    expect(compiled.autoSize).toBeCloseTo(0.05, 3);
  });
});

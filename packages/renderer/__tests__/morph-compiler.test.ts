import { describe, it, expect } from 'vitest';
import { compileMorphField } from '../src/compiler/morph-compiler.js';
import { field, shape, grid, sphere, torus } from '../../core/src/index.js';

describe('compileMorphField', () => {
  it('produces a vertex shader with both SDF functions', () => {
    const from = field(shape(sphere(1)), grid({ type: 'uniform', resolution: [10, 10, 10] }));
    const to = field(shape(torus(0.5, 0.2)), grid({ type: 'uniform', resolution: [20, 20, 10] }));
    const compiled = compileMorphField(from, to);

    // Should contain uMorphProgress uniform
    expect(compiled.vertexShader).toContain('uniform float uMorphProgress');
    // Should contain mix of both SDFs
    expect(compiled.vertexShader).toContain('mix(');
    expect(compiled.vertexShader).toContain('uMorphProgress');
  });

  it('uses max resolution from both fields', () => {
    const from = field(shape(sphere(1)), grid({ type: 'uniform', resolution: [10, 20, 5] }));
    const to = field(shape(sphere(0.5)), grid({ type: 'uniform', resolution: [15, 10, 8] }));
    const compiled = compileMorphField(from, to);

    expect(compiled.resolution).toEqual([15, 20, 8]);
    expect(compiled.totalDots).toBe(15 * 20 * 8);
  });

  it('uses max bounds from both fields', () => {
    const from = field(shape(sphere(1)), grid({ type: 'uniform', resolution: [10, 10, 10], bounds: [2, 2, 2] }));
    const to = field(shape(sphere(1)), grid({ type: 'uniform', resolution: [10, 10, 10], bounds: [4, 2, 1] }));
    const compiled = compileMorphField(from, to);

    expect(compiled.bounds).toEqual([4, 2, 2]);
  });

  it('includes edgeSoftness uniforms', () => {
    const from = { ...field(shape(sphere(1)), grid({ type: 'uniform', resolution: [10, 10, 10] })), edgeSoftness: 0.03 };
    const to = { ...field(shape(sphere(0.5)), grid({ type: 'uniform', resolution: [10, 10, 10] })), edgeSoftness: 0.08 };
    const compiled = compileMorphField(from, to);

    expect(compiled.fromEdgeSoftness).toBe(0.03);
    expect(compiled.toEdgeSoftness).toBe(0.08);
    expect(compiled.vertexShader).toContain('uFromEdgeSoftness');
    expect(compiled.vertexShader).toContain('uToEdgeSoftness');
  });

  it('throws if either field lacks a ShapeNode', () => {
    const withShape = field(shape(sphere(1)), grid({ type: 'uniform', resolution: [10, 10, 10] }));
    const noShape = field(grid({ type: 'uniform', resolution: [10, 10, 10] }));
    expect(() => compileMorphField(noShape, withShape)).toThrow(/ShapeNode/);
  });
});

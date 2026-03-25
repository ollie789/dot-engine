import { describe, it, expect } from 'vitest';
import {
  field,
  shape,
  grid,
  sphere,
  smoothUnion,
  displace,
  simplex3D,
  flowField3D,
} from '../../core/src/index.js';
import { compileFieldWgsl } from '../src/compiler/wgsl-compiler.js';

describe('compileFieldWgsl', () => {
  it('compiles sphere field to WGSL compute shader', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
    );
    const compiled = compileFieldWgsl(f);

    expect(compiled.computeShader).toContain('length(p)');
    expect(compiled.computeShader).toContain('0.5');
  });

  it('compute shader contains @compute @workgroup_size', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
    );
    const compiled = compileFieldWgsl(f);

    expect(compiled.computeShader).toContain('@compute @workgroup_size(64)');
  });

  it('compute shader contains DotOutput struct', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
    );
    const compiled = compileFieldWgsl(f);

    expect(compiled.computeShader).toContain('struct DotOutput');
    expect(compiled.computeShader).toContain('position: vec3f');
    expect(compiled.computeShader).toContain('scale: f32');
  });

  it('compiles smoothUnion field with smin helper', () => {
    const f = field(
      shape(smoothUnion(sphere(0.5), sphere(0.3), 0.2)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
    );
    const compiled = compileFieldWgsl(f);

    expect(compiled.computeShader).toContain('smin(');
    expect(compiled.computeShader).toContain('fn smin(');
    expect(compiled.computeShader).toContain('0.2');
  });

  it('compiles field with simplex displacement — snoise in WGSL', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
      displace(simplex3D({ scale: 1.0, speed: 0.5 }), 0.3),
    );
    const compiled = compileFieldWgsl(f);

    expect(compiled.computeShader).toContain('fn snoise(');
    expect(compiled.computeShader).toContain('snoise(');
  });

  it('compiles field with flowField displacement — curlNoise in WGSL', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
      displace(flowField3D({ scale: 1.0, speed: 0.5 }), 0.3),
    );
    const compiled = compileFieldWgsl(f);

    expect(compiled.computeShader).toContain('fn snoise(');
    expect(compiled.computeShader).toContain('fn curlNoise(');
    expect(compiled.computeShader).toContain('curlNoise(');
  });

  it('field without displacement compiles clean — no noise functions', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
    );
    const compiled = compileFieldWgsl(f);

    expect(compiled.computeShader).not.toContain('fn snoise(');
    expect(compiled.computeShader).not.toContain('fn curlNoise(');
  });

  it('returns correct resolution and totalDots metadata', () => {
    const res: [number, number, number] = [8, 10, 12];
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: res }),
    );
    const compiled = compileFieldWgsl(f);

    expect(compiled.resolution).toEqual(res);
    expect(compiled.totalDots).toBe(8 * 10 * 12);
  });

  it('uses custom bounds when provided', () => {
    const bounds: [number, number, number] = [4, 4, 4];
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5], bounds }),
    );
    const compiled = compileFieldWgsl(f);

    expect(compiled.bounds).toEqual(bounds);
  });

  it('defaults bounds to [2, 2, 2] when not specified', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
    );
    const compiled = compileFieldWgsl(f);

    expect(compiled.bounds).toEqual([2, 2, 2]);
  });

  it('throws if ShapeNode is missing', () => {
    const f = field(grid({ type: 'uniform', resolution: [5, 5, 5] }));
    expect(() => compileFieldWgsl(f)).toThrow('ShapeNode');
  });

  it('throws if GridNode is missing', () => {
    const f = field(shape(sphere(0.5)));
    expect(() => compileFieldWgsl(f)).toThrow('GridNode');
  });

  it('compute shader contains Uniforms struct with time', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
    );
    const compiled = compileFieldWgsl(f);

    expect(compiled.computeShader).toContain('struct Uniforms');
    expect(compiled.computeShader).toContain('time: f32');
  });

  it('compute shader contains storage buffer binding', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
    );
    const compiled = compileFieldWgsl(f);

    expect(compiled.computeShader).toContain('var<storage, read_write>');
    expect(compiled.computeShader).toContain('array<DotOutput>');
  });

  it('uses default edgeSoftness 0.05 when not specified', () => {
    const root = field(
      shape(sphere(1)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
    );
    const compiled = compileFieldWgsl(root);
    expect(compiled.computeShader).toContain('let edgeSoftness = 0.05;');
  });

  it('uses custom edgeSoftness when specified on FieldRoot', () => {
    const root = {
      ...field(
        shape(sphere(1)),
        grid({ type: 'uniform', resolution: [10, 10, 10] }),
      ),
      edgeSoftness: 0.03,
    };
    const compiled = compileFieldWgsl(root);
    expect(compiled.computeShader).toContain('let edgeSoftness = 0.03;');
    expect(compiled.computeShader).not.toContain('let edgeSoftness = 0.05;');
  });

  it('render shaders are returned', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
    );
    const compiled = compileFieldWgsl(f);

    expect(compiled.renderVertexShader).toContain('@vertex');
    expect(compiled.renderFragmentShader).toContain('@fragment');
  });
});

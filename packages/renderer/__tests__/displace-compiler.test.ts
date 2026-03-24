import { describe, it, expect } from 'vitest';
import { SIMPLEX3D_GLSL } from '../src/compiler/noise3d.glsl.js';
import { CURL3D_GLSL } from '../src/compiler/curl3d.glsl.js';
import { compileField } from '../src/compiler/compiler.js';
import { field, shape, grid, sphere } from '../../core/src/index.js';
import { displace, simplex3D, flowField3D, domainWarp3D, attract } from '../../core/src/index.js';

// Task 2 tests: SIMPLEX3D_GLSL
describe('SIMPLEX3D_GLSL', () => {
  it('contains float snoise(vec3 function signature', () => {
    expect(SIMPLEX3D_GLSL).toContain('float snoise(vec3');
  });

  it('contains return statement', () => {
    expect(SIMPLEX3D_GLSL).toContain('return');
  });

  it('contains mod289 helper', () => {
    expect(SIMPLEX3D_GLSL).toContain('mod289');
  });

  it('contains permute helper', () => {
    expect(SIMPLEX3D_GLSL).toContain('permute');
  });

  it('contains taylorInvSqrt helper', () => {
    expect(SIMPLEX3D_GLSL).toContain('taylorInvSqrt');
  });
});

// Task 3 tests: CURL3D_GLSL
describe('CURL3D_GLSL', () => {
  it('contains vec3 curlNoise(vec3 function signature', () => {
    expect(CURL3D_GLSL).toContain('vec3 curlNoise(vec3');
  });

  it('uses snoise internally', () => {
    expect(CURL3D_GLSL).toContain('snoise');
  });
});

// Task 4 tests: displacement shader compilation
describe('compileField with displacement', () => {
  it('simplex3D displacement: vertexShader contains snoise and amount value', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      displace(simplex3D({ scale: 1.5, speed: 0.3 }), { amount: 0.25 }),
    );
    const compiled = compileField(f);

    expect(compiled.vertexShader).toContain('snoise');
    expect(compiled.vertexShader).toContain('0.25');
  });

  it('flowField3D displacement: vertexShader contains curlNoise', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      displace(flowField3D({ scale: 2.0, speed: 0.5 }), { amount: 0.1 }),
    );
    const compiled = compileField(f);

    expect(compiled.vertexShader).toContain('curlNoise');
    expect(compiled.vertexShader).toContain('snoise');
  });

  it('multiple displacements chain in order', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      displace(simplex3D({ scale: 1.0, speed: 0.5 }), { amount: 0.1 }),
      displace(flowField3D({ scale: 2.0, speed: 0.8 }), { amount: 0.2 }),
    );
    const compiled = compileField(f);

    // Both noise types must be present
    expect(compiled.vertexShader).toContain('snoise');
    expect(compiled.vertexShader).toContain('curlNoise');

    // Both amounts must appear
    expect(compiled.vertexShader).toContain('0.1');
    expect(compiled.vertexShader).toContain('0.2');

    // Simplex displacement should appear before curl displacement
    const snoiseIdx = compiled.vertexShader.indexOf('snoise(displaced');
    const curlIdx = compiled.vertexShader.indexOf('curlNoise(displaced');
    expect(snoiseIdx).toBeLessThan(curlIdx);
  });

  it('attract displacement: vertexShader contains strength value', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      displace(attract([0, 1, 0], { strength: 0.75 }), { amount: 1.0 }),
    );
    const compiled = compileField(f);

    expect(compiled.vertexShader).toContain('0.75');
    // attract uses normalize and length, not snoise
    expect(compiled.vertexShader).toContain('normalize');
  });

  it('field without displacement compiles without noise functions', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
    );
    const compiled = compileField(f);

    expect(compiled.vertexShader).not.toContain('snoise');
    expect(compiled.vertexShader).not.toContain('curlNoise');
    expect(compiled.vertexShader).toContain('void main()');
  });

  it('domainWarp3D displacement: vertexShader contains snoise with effective scale', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      // scale=2, octaves=3 → effectiveScale=6
      displace(domainWarp3D({ octaves: 3, scale: 2.0 }), { amount: 0.15 }),
    );
    const compiled = compileField(f);

    expect(compiled.vertexShader).toContain('snoise');
    // effective scale 6.0
    expect(compiled.vertexShader).toContain('6.0');
    expect(compiled.vertexShader).toContain('0.15');
  });

  it('attract with no snoise: no noise functions in shader', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      displace(attract([1, 0, 0], { strength: 0.5 })),
    );
    const compiled = compileField(f);

    // attract doesn't use snoise
    expect(compiled.vertexShader).not.toContain('snoise');
  });
});

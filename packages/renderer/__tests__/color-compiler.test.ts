import { describe, it, expect } from 'vitest';
import { compileField } from '../src/compiler/compiler.js';
import { field, shape, grid, sphere } from '../../core/src/index.js';
import { color, gradient, noiseColor } from '../../core/src/index.js';
import { opacity } from '../../core/src/index.js';

describe('compileField with color nodes', () => {
  it('ColorNode depth mode → fragment contains mix(uColorPrimary, uColorAccent, vFieldValue)', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      color({ primary: '#ff0000', accent: '#0000ff', mode: 'depth' }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('mix(uColorPrimary, uColorAccent, vFieldValue)');
  });

  it('ColorNode position mode → fragment contains vPosition.y', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      color({ primary: '#ff0000', accent: '#0000ff', mode: 'position' }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('vPosition.y');
    expect(compiled.fragmentShader).toContain('mix(uColorPrimary, uColorAccent, vPosition.y)');
  });

  it('ColorNode uniform mode → fragment contains uColorPrimary assignment', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      color({ primary: '#ff0000', accent: '#0000ff', mode: 'uniform' }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('vec3 color = uColorPrimary');
  });

  it('GradientColorNode → fragment contains vPosition.y and mix', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      gradient({ axis: 'y', stops: [['#ff0000', 0], ['#00ff00', 0.5], ['#0000ff', 1]] }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('vPosition.y');
    expect(compiled.fragmentShader).toContain('mix(');
  });

  it('GradientColorNode x-axis → fragment contains vPosition.x', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      gradient({ axis: 'x', stops: [['#ff0000', 0], ['#0000ff', 1]] }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('vPosition.x');
  });

  it('NoiseColorNode → fragment contains snoise', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      noiseColor({ palette: ['#ff0000', '#00ff00', '#0000ff'], scale: 1.5, speed: 0.3 }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('snoise');
  });

  it('field without any color/opacity nodes → default mix and vFieldValue * 0.9', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('mix(uColorPrimary, uColorAccent, vFieldValue)');
    expect(compiled.fragmentShader).toContain('vFieldValue * 0.9');
  });
});

describe('compileField with opacity nodes', () => {
  it('OpacityNode depth mode → fragment contains mix(MIN, MAX, vFieldValue)', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      opacity({ min: 0.2, max: 0.8, mode: 'depth' }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('mix(');
    expect(compiled.fragmentShader).toContain('vFieldValue');
    expect(compiled.fragmentShader).toContain('0.2');
    expect(compiled.fragmentShader).toContain('0.8');
  });

  it('OpacityNode edgeGlow mode → fragment contains abs(vFieldValue - 0.5)', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      opacity({ min: 0.3, max: 1.0, mode: 'edgeGlow' }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('abs(vFieldValue - 0.5)');
  });

  it('OpacityNode uniform mode → fragment contains only the max value as alpha', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      opacity({ min: 0.5, max: 0.75, mode: 'uniform' }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('0.75');
  });

  it('field without opacity node → default vFieldValue * 0.9', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('vFieldValue * 0.9');
  });
});

describe('fragment shader structure', () => {
  it('fragment shader contains void main() and gl_FragColor', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('void main()');
    expect(compiled.fragmentShader).toContain('gl_FragColor');
  });

  it('fragment shader contains vPosition varying', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('varying vec3 vPosition');
  });

  it('vertex shader contains vPosition varying and assignment', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
    );
    const compiled = compileField(f);
    expect(compiled.vertexShader).toContain('varying vec3 vPosition');
    expect(compiled.vertexShader).toContain('vPosition =');
  });
});

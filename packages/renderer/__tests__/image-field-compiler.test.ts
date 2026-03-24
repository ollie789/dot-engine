import { describe, it, expect } from 'vitest';
import { field, shape, sphere, grid } from '../../core/src/index.js';
import { imageField } from '../../core/src/nodes/image-field.js';
import { compileField } from '../src/compiler/compiler.js';

describe('image field compiler', () => {
  it('field with imageField compiles to shader containing uImageField', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      imageField('my_img'),
    );
    const compiled = compileField(f);
    expect(compiled.vertexShader).toContain('uImageField');
  });

  it('field without imageField still compiles normally', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
    );
    const compiled = compileField(f);
    expect(compiled.vertexShader).toContain('void main()');
    expect(compiled.vertexShader).not.toContain('uImageField');
    expect(compiled.fragmentShader).toContain('gl_FragColor');
  });

  it('field with imageField emits imgScale in vertex shader', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      imageField('tex'),
    );
    const compiled = compileField(f);
    expect(compiled.vertexShader).toContain('imgScale');
  });

  it('field with imageField emits threshold check in vertex shader', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      imageField('tex', { threshold: 0.2 }),
    );
    const compiled = compileField(f);
    expect(compiled.vertexShader).toContain('0.2');
  });

  it('colorFromImage: true changes fragment shader to use image color', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      imageField('tex', { colorFromImage: true }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).toContain('uImageField');
    expect(compiled.fragmentShader).toContain('_imgColor');
  });

  it('colorFromImage: false does not put uImageField in fragment shader', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      imageField('tex', { colorFromImage: false }),
    );
    const compiled = compileField(f);
    expect(compiled.fragmentShader).not.toContain('uImageField');
  });

  it('imageField with mode alpha emits alpha component sampling', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      imageField('tex', { mode: 'alpha' }),
    );
    const compiled = compileField(f);
    // Mode 1 = alpha
    expect(compiled.vertexShader).toContain('imgSample.a');
  });

  it('imageField with mode brightness emits luminance sampling', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      imageField('tex', { mode: 'brightness' }),
    );
    const compiled = compileField(f);
    expect(compiled.vertexShader).toContain('0.299');
  });

  it('extraUniforms includes __imageField__ entry when imageField present', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      imageField('tex'),
    );
    const compiled = compileField(f);
    expect(compiled.extraUniforms['__imageField__']).toBeDefined();
    expect(compiled.extraUniforms['__imageField__'].type).toBe('sampler2D');
  });

  it('vImgUv varying is present in both vertex and fragment shaders', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
    );
    const compiled = compileField(f);
    // vImgUv should always be declared as part of the base shaders
    expect(compiled.vertexShader).toContain('vImgUv');
    expect(compiled.fragmentShader).toContain('vImgUv');
  });
});

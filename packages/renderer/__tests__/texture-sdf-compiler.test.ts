import { describe, it, expect } from 'vitest';
import { textureSdf } from '../../core/src/sdf/texture.js';
import { glslForNode } from '../src/compiler/snippets.js';
import { wgslForNode } from '../src/compiler/wgsl-snippets.js';

describe('textureSdf GLSL snippet', () => {
  it('contains texture2D call', () => {
    const node = textureSdf('logo', { depth: 0.2, aspectRatio: 2.5 });
    const glsl = glslForNode(node);
    expect(glsl).toContain('texture2D');
  });

  it('contains the texture uniform name with textureId', () => {
    const node = textureSdf('logo', { depth: 0.2, aspectRatio: 2.5 });
    const glsl = glslForNode(node);
    expect(glsl).toContain('uLogoSDF_logo');
  });

  it('encodes aspectRatio in uv calculation', () => {
    const node = textureSdf('brand', { depth: 0.1, aspectRatio: 1.5 });
    const glsl = glslForNode(node);
    expect(glsl).toContain('1.5');
  });

  it('encodes depth (half-depth) in dz calculation', () => {
    const node = textureSdf('logo', { depth: 0.4, aspectRatio: 1.0 });
    const glsl = glslForNode(node);
    // depth * 0.5 = 0.2
    expect(glsl).toContain('0.2');
  });
});

describe('textureSdf WGSL snippet', () => {
  it('contains textureSample call', () => {
    const node = textureSdf('logo', { depth: 0.2, aspectRatio: 2.5 });
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('textureSample');
  });

  it('contains the texture uniform name with textureId', () => {
    const node = textureSdf('logo', { depth: 0.2, aspectRatio: 2.5 });
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('uLogoSDF_logo');
  });

  it('contains the sampler uniform name with textureId', () => {
    const node = textureSdf('logo', { depth: 0.2, aspectRatio: 2.5 });
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('uLogoSampler_logo');
  });

  it('encodes aspectRatio in uv calculation', () => {
    const node = textureSdf('brand', { depth: 0.1, aspectRatio: 1.5 });
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('1.5');
  });
});

import { describe, it, expect } from 'vitest';
import { SIMPLEX3D_GLSL } from '../src/compiler/noise3d.glsl.js';
import { CURL3D_GLSL } from '../src/compiler/curl3d.glsl.js';

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

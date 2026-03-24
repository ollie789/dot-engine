import { describe, it, expect, beforeEach } from 'vitest';
import { textureSdf } from '../src/sdf/texture.js';
import { evaluateSdf } from '../src/evaluate.js';
import { _resetIds } from '../src/nodes/types.js';

beforeEach(() => {
  _resetIds();
});

describe('textureSdf()', () => {
  it('creates a node with type "textureSdf"', () => {
    const n = textureSdf('logo', { depth: 0.2, aspectRatio: 2.5 });
    expect(n.type).toBe('textureSdf');
  });

  it('stores textureId', () => {
    const n = textureSdf('brand', { depth: 0.1, aspectRatio: 1.0 });
    expect(n.textureId).toBe('brand');
  });

  it('stores depth', () => {
    const n = textureSdf('logo', { depth: 0.4, aspectRatio: 1.0 });
    expect(n.depth).toBe(0.4);
  });

  it('stores aspectRatio', () => {
    const n = textureSdf('logo', { depth: 0.2, aspectRatio: 3.14 });
    expect(n.aspectRatio).toBe(3.14);
  });

  it('assigns a unique id', () => {
    const a = textureSdf('logo', { depth: 0.2, aspectRatio: 1.0 });
    const b = textureSdf('logo', { depth: 0.2, aspectRatio: 1.0 });
    expect(a.id).not.toBe(b.id);
  });
});

describe('evaluateSdf with textureSdf', () => {
  it('throws with "requires GPU" message', () => {
    const n = textureSdf('logo', { depth: 0.2, aspectRatio: 1.0 });
    expect(() => evaluateSdf(n, [0, 0, 0])).toThrow('requires GPU');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { translate, rotate, scale } from '../src/sdf/transforms.js';
import { sphere } from '../src/sdf/primitives.js';
import { _resetIds } from '../src/nodes/types.js';

beforeEach(() => {
  _resetIds();
});

describe('translate()', () => {
  it('returns a TranslateNode with correct type', () => {
    const n = translate(sphere(1), [1, 0, 0]);
    expect(n.type).toBe('translate');
  });

  it('stores child reference and offset', () => {
    const s = sphere(0.5);
    const n = translate(s, [1, 2, 3]);
    expect(n.child).toBe(s);
    expect(n.offset).toEqual([1, 2, 3]);
  });
});

describe('rotate()', () => {
  it('returns a RotateNode with correct type', () => {
    const n = rotate(sphere(1), [0, Math.PI / 2, 0]);
    expect(n.type).toBe('rotate');
  });

  it('stores child reference and angles', () => {
    const s = sphere(0.5);
    const angles: [number, number, number] = [0.1, 0.2, 0.3];
    const n = rotate(s, angles);
    expect(n.child).toBe(s);
    expect(n.angles).toEqual([0.1, 0.2, 0.3]);
  });
});

describe('scale()', () => {
  it('returns a ScaleNode with correct type', () => {
    const n = scale(sphere(1), 2);
    expect(n.type).toBe('scale');
  });

  it('stores child reference and factor', () => {
    const s = sphere(0.5);
    const n = scale(s, 1.5);
    expect(n.child).toBe(s);
    expect(n.factor).toBe(1.5);
  });
});

describe('composition', () => {
  it('translate wrapping rotate wrapping scale', () => {
    const s = sphere(1);
    const sc = scale(s, 2);
    const ro = rotate(sc, [0, Math.PI, 0]);
    const tr = translate(ro, [5, 0, 0]);

    expect(tr.type).toBe('translate');
    expect(tr.child.type).toBe('rotate');
    if (tr.child.type === 'rotate') {
      expect(tr.child.child.type).toBe('scale');
      if (tr.child.child.type === 'scale') {
        expect(tr.child.child.child.type).toBe('sphere');
      }
    }
    expect(tr.offset).toEqual([5, 0, 0]);
  });
});

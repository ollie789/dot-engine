import { describe, it, expect, beforeEach } from 'vitest';
import { translate, rotate, scale, twist, bend, repeat, mirror, elongate } from '../src/sdf/transforms.js';
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

describe('twist()', () => {
  it('returns a TwistNode with correct type', () => {
    const n = twist(sphere(1), 0.5);
    expect(n.type).toBe('twist');
  });

  it('stores child reference and amount', () => {
    const s = sphere(0.5);
    const n = twist(s, 1.2);
    expect(n.child).toBe(s);
    expect(n.amount).toBe(1.2);
  });
});

describe('bend()', () => {
  it('returns a BendNode with correct type', () => {
    const n = bend(sphere(1), 0.3);
    expect(n.type).toBe('bend');
  });

  it('stores child reference and amount', () => {
    const s = sphere(0.5);
    const n = bend(s, 0.8);
    expect(n.child).toBe(s);
    expect(n.amount).toBe(0.8);
  });
});

describe('repeat()', () => {
  it('returns a RepeatNode with correct type', () => {
    const n = repeat(sphere(1), [2, 2, 2]);
    expect(n.type).toBe('repeat');
  });

  it('stores child reference and spacing', () => {
    const s = sphere(0.5);
    const n = repeat(s, [1, 2, 3]);
    expect(n.child).toBe(s);
    expect(n.spacing).toEqual([1, 2, 3]);
  });
});

describe('mirror()', () => {
  it('returns a MirrorNode with correct type', () => {
    const n = mirror(sphere(1), 'x');
    expect(n.type).toBe('mirror');
  });

  it('stores child reference and axis', () => {
    const s = sphere(0.5);
    const n = mirror(s, 'y');
    expect(n.child).toBe(s);
    expect(n.axis).toBe('y');
  });
});

describe('elongate()', () => {
  it('returns an ElongateNode with correct type', () => {
    const n = elongate(sphere(1), [0.1, 0.2, 0.3]);
    expect(n.type).toBe('elongate');
  });

  it('stores child reference and amount', () => {
    const s = sphere(0.5);
    const n = elongate(s, [0.5, 0.5, 0.5]);
    expect(n.child).toBe(s);
    expect(n.amount).toEqual([0.5, 0.5, 0.5]);
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

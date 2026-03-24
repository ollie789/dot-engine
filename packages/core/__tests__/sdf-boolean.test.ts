import { describe, it, expect, beforeEach } from 'vitest';
import {
  union,
  smoothUnion,
  subtract,
  smoothSubtract,
  intersect,
  smoothIntersect,
  onion,
} from '../src/sdf/boolean.js';
import { sphere, box } from '../src/sdf/primitives.js';
import { _resetIds } from '../src/nodes/types.js';

beforeEach(() => {
  _resetIds();
});

describe('union()', () => {
  it('returns a UnionNode with correct type', () => {
    const n = union(sphere(1), box([1, 1, 1]));
    expect(n.type).toBe('union');
  });

  it('holds references to children a and b', () => {
    const a = sphere(1);
    const b = box([1, 1, 1]);
    const n = union(a, b);
    expect(n.a).toBe(a);
    expect(n.b).toBe(b);
  });
});

describe('smoothUnion()', () => {
  it('returns a SmoothUnionNode with correct type', () => {
    const n = smoothUnion(sphere(1), box([1, 1, 1]), 0.2);
    expect(n.type).toBe('smoothUnion');
  });

  it('stores k blend factor', () => {
    const n = smoothUnion(sphere(1), box([1, 1, 1]), 0.3);
    expect(n.k).toBe(0.3);
  });

  it('holds references to children', () => {
    const a = sphere(0.5);
    const b = box([0.5, 0.5, 0.5]);
    const n = smoothUnion(a, b, 0.1);
    expect(n.a).toBe(a);
    expect(n.b).toBe(b);
  });
});

describe('subtract()', () => {
  it('returns a SubtractNode with correct type', () => {
    const n = subtract(sphere(1), box([0.5, 0.5, 0.5]));
    expect(n.type).toBe('subtract');
  });

  it('holds references to children', () => {
    const a = sphere(1);
    const b = box([0.5, 0.5, 0.5]);
    const n = subtract(a, b);
    expect(n.a).toBe(a);
    expect(n.b).toBe(b);
  });
});

describe('smoothSubtract()', () => {
  it('returns a SmoothSubtractNode with correct type', () => {
    const n = smoothSubtract(sphere(1), box([0.5, 0.5, 0.5]), 0.1);
    expect(n.type).toBe('smoothSubtract');
  });

  it('stores k', () => {
    const n = smoothSubtract(sphere(1), sphere(0.5), 0.15);
    expect(n.k).toBe(0.15);
  });
});

describe('intersect()', () => {
  it('returns an IntersectNode with correct type', () => {
    const n = intersect(sphere(1), box([1, 1, 1]));
    expect(n.type).toBe('intersect');
  });

  it('holds references to children', () => {
    const a = sphere(1);
    const b = box([1, 1, 1]);
    const n = intersect(a, b);
    expect(n.a).toBe(a);
    expect(n.b).toBe(b);
  });
});

describe('smoothIntersect()', () => {
  it('returns a SmoothIntersectNode with correct type', () => {
    const n = smoothIntersect(sphere(1), box([1, 1, 1]), 0.2);
    expect(n.type).toBe('smoothIntersect');
  });

  it('stores k', () => {
    const n = smoothIntersect(sphere(1), sphere(0.5), 0.05);
    expect(n.k).toBe(0.05);
  });
});

describe('onion()', () => {
  it('returns an OnionNode with correct type', () => {
    const n = onion(sphere(1), 0.05);
    expect(n.type).toBe('onion');
  });

  it('stores child reference and thickness', () => {
    const s = sphere(1);
    const n = onion(s, 0.1);
    expect(n.child).toBe(s);
    expect(n.thickness).toBe(0.1);
  });
});

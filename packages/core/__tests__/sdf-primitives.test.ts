import { describe, it, expect, beforeEach } from 'vitest';
import { sphere, box, torus, cylinder, capsule, cone, plane } from '../src/sdf/primitives.js';
import { _resetIds } from '../src/nodes/types.js';

beforeEach(() => {
  _resetIds();
});

describe('sphere()', () => {
  it('returns a SphereNode with correct type', () => {
    const n = sphere(0.5);
    expect(n.type).toBe('sphere');
  });

  it('stores the radius', () => {
    const n = sphere(1.23);
    expect(n.radius).toBe(1.23);
  });

  it('assigns a unique id', () => {
    const a = sphere(1);
    const b = sphere(1);
    expect(a.id).not.toBe(b.id);
  });
});

describe('box()', () => {
  it('returns a BoxNode with correct type', () => {
    const n = box([1, 2, 3]);
    expect(n.type).toBe('box');
  });

  it('stores halfExtents', () => {
    const n = box([0.5, 1.0, 1.5]);
    expect(n.halfExtents).toEqual([0.5, 1.0, 1.5]);
  });

  it('stores optional edgeRadius', () => {
    const n = box([1, 1, 1], 0.05);
    expect(n.edgeRadius).toBe(0.05);
  });

  it('omits edgeRadius when not provided', () => {
    const n = box([1, 1, 1]);
    expect(n.edgeRadius).toBeUndefined();
  });
});

describe('torus()', () => {
  it('returns a TorusNode with correct type', () => {
    const n = torus(0.5, 0.1);
    expect(n.type).toBe('torus');
  });

  it('stores majorR and minorR', () => {
    const n = torus(0.5, 0.1);
    expect(n.majorR).toBe(0.5);
    expect(n.minorR).toBe(0.1);
  });
});

describe('cylinder()', () => {
  it('returns a CylinderNode with correct type', () => {
    const n = cylinder(0.3, 1.0);
    expect(n.type).toBe('cylinder');
  });

  it('stores radius and height', () => {
    const n = cylinder(0.3, 1.0);
    expect(n.radius).toBe(0.3);
    expect(n.height).toBe(1.0);
  });
});

describe('capsule()', () => {
  it('returns a CapsuleNode with correct type', () => {
    const n = capsule(0.2, 0.8);
    expect(n.type).toBe('capsule');
  });

  it('stores radius and height', () => {
    const n = capsule(0.2, 0.8);
    expect(n.radius).toBe(0.2);
    expect(n.height).toBe(0.8);
  });
});

describe('cone()', () => {
  it('returns a ConeNode with correct type', () => {
    const n = cone(0.4, 1.2);
    expect(n.type).toBe('cone');
  });

  it('stores radius and height', () => {
    const n = cone(0.4, 1.2);
    expect(n.radius).toBe(0.4);
    expect(n.height).toBe(1.2);
  });
});

describe('plane()', () => {
  it('returns a PlaneNode with correct type', () => {
    const n = plane([0, 1, 0], 0);
    expect(n.type).toBe('plane');
  });

  it('stores normal and offset', () => {
    const n = plane([0, 1, 0], -0.5);
    expect(n.normal).toEqual([0, 1, 0]);
    expect(n.offset).toBe(-0.5);
  });
});

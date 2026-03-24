import { describe, it, expect, beforeEach } from 'vitest';
import { _resetIds } from '../src/nodes/types.js';
import { simplex3D, domainWarp3D, flowField3D, attract, displace } from '../src/nodes/displace.js';
import { field } from '../src/nodes/field.js';
import { shape } from '../src/nodes/shape.js';
import { grid } from '../src/nodes/grid.js';
import { sphere } from '../src/sdf/primitives.js';

beforeEach(() => {
  _resetIds();
});

describe('simplex3D()', () => {
  it('returns correct type', () => {
    const n = simplex3D({ scale: 1.5, speed: 0.5 });
    expect(n.type).toBe('simplex3D');
  });

  it('stores scale and speed', () => {
    const n = simplex3D({ scale: 2.0, speed: 0.3 });
    expect(n.scale).toBe(2.0);
    expect(n.speed).toBe(0.3);
  });
});

describe('domainWarp3D()', () => {
  it('returns correct type', () => {
    const n = domainWarp3D({ octaves: 3, scale: 1.0 });
    expect(n.type).toBe('domainWarp3D');
  });

  it('stores octaves and scale', () => {
    const n = domainWarp3D({ octaves: 4, scale: 2.5 });
    expect(n.octaves).toBe(4);
    expect(n.scale).toBe(2.5);
  });

  it('stores optional speed when provided', () => {
    const n = domainWarp3D({ octaves: 2, scale: 1.0, speed: 0.7 });
    expect(n.speed).toBe(0.7);
  });

  it('speed is undefined when not provided', () => {
    const n = domainWarp3D({ octaves: 2, scale: 1.0 });
    expect(n.speed).toBeUndefined();
  });
});

describe('flowField3D()', () => {
  it('returns correct type', () => {
    const n = flowField3D({ scale: 1.0, speed: 0.5 });
    expect(n.type).toBe('flowField3D');
  });

  it('stores scale and speed', () => {
    const n = flowField3D({ scale: 3.0, speed: 1.2 });
    expect(n.scale).toBe(3.0);
    expect(n.speed).toBe(1.2);
  });
});

describe('attract()', () => {
  it('returns correct type', () => {
    const n = attract([0, 0, 0], { strength: 0.5 });
    expect(n.type).toBe('attract');
  });

  it('stores target and strength', () => {
    const n = attract([1, 2, 3], { strength: 0.8 });
    expect(n.target).toEqual([1, 2, 3]);
    expect(n.strength).toBe(0.8);
  });

  it('defaults falloff to "inverse"', () => {
    const n = attract([0, 0, 0], { strength: 1.0 });
    expect(n.falloff).toBe('inverse');
  });

  it('accepts explicit falloff', () => {
    const n = attract([0, 0, 0], { strength: 1.0, falloff: 'exponential' });
    expect(n.falloff).toBe('exponential');
  });
});

describe('displace()', () => {
  it('returns correct type', () => {
    const n = displace(simplex3D({ scale: 1.0, speed: 0.5 }));
    expect(n.type).toBe('displace');
  });

  it('defaults amount to 1', () => {
    const n = displace(simplex3D({ scale: 1.0, speed: 0.5 }));
    expect(n.amount).toBe(1);
  });

  it('stores custom amount', () => {
    const n = displace(simplex3D({ scale: 1.0, speed: 0.5 }), { amount: 0.3 });
    expect(n.amount).toBe(0.3);
  });

  it('stores the noise config', () => {
    const noise = flowField3D({ scale: 2.0, speed: 0.4 });
    const n = displace(noise, { amount: 0.5 });
    expect(n.noise).toBe(noise);
  });

  it('has a unique id', () => {
    const n1 = displace(simplex3D({ scale: 1.0, speed: 0.5 }));
    const n2 = displace(simplex3D({ scale: 1.0, speed: 0.5 }));
    expect(n1.id).not.toBe(n2.id);
  });
});

describe('displace in field()', () => {
  it('composes displace nodes inside a field', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      displace(simplex3D({ scale: 1.5, speed: 0.3 }), { amount: 0.1 }),
    );

    expect(f.type).toBe('field');
    expect(f.children).toHaveLength(3);

    const displaceChild = f.children[2];
    expect(displaceChild.type).toBe('displace');
  });

  it('multiple displace nodes are stored in order', () => {
    const d1 = displace(simplex3D({ scale: 1.0, speed: 0.5 }));
    const d2 = displace(flowField3D({ scale: 2.0, speed: 0.8 }), { amount: 0.2 });

    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [5, 5, 5] }),
      d1,
      d2,
    );

    expect(f.children[2]).toBe(d1);
    expect(f.children[3]).toBe(d2);
  });
});

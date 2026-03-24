import { describe, it, expect, beforeEach } from 'vitest';
import { particles, pointEmitter, surfaceEmitter, burstEmitter } from '../src/nodes/particles.js';
import { field } from '../src/nodes/field.js';
import { shape } from '../src/nodes/shape.js';
import { grid } from '../src/nodes/grid.js';
import { sphere } from '../src/sdf/primitives.js';
import { _resetIds } from '../src/nodes/types.js';

beforeEach(() => {
  _resetIds();
});

describe('pointEmitter()', () => {
  it('creates a point emitter with position and rate', () => {
    const emitter = pointEmitter([1, 2, 3], 10);
    expect(emitter.type).toBe('point');
    expect(emitter.position).toEqual([1, 2, 3]);
    expect(emitter.rate).toBe(10);
  });

  it('has no burst by default', () => {
    const emitter = pointEmitter([0, 0, 0], 5);
    expect(emitter.burst).toBeUndefined();
  });
});

describe('surfaceEmitter()', () => {
  it('creates a surface emitter with rate', () => {
    const emitter = surfaceEmitter(15);
    expect(emitter.type).toBe('surface');
    expect(emitter.rate).toBe(15);
  });

  it('has no position', () => {
    const emitter = surfaceEmitter(10);
    expect(emitter.position).toBeUndefined();
  });
});

describe('burstEmitter()', () => {
  it('creates an emitter with burst count', () => {
    const emitter = burstEmitter(200);
    expect(emitter.burst).toBe(200);
  });

  it('has zero rate (one-shot)', () => {
    const emitter = burstEmitter(100);
    expect(emitter.rate).toBe(0);
  });
});

describe('particles()', () => {
  it('creates a node with type "particle"', () => {
    const node = particles({
      emitter: pointEmitter([0, 0, 0], 10),
      lifecycle: { lifetime: 2 },
      motion: {},
    });
    expect(node.type).toBe('particle');
  });

  it('has a unique id', () => {
    const a = particles({
      emitter: pointEmitter([0, 0, 0], 10),
      lifecycle: { lifetime: 1 },
      motion: {},
    });
    const b = particles({
      emitter: pointEmitter([0, 0, 0], 10),
      lifecycle: { lifetime: 1 },
      motion: {},
    });
    expect(a.id).not.toBe(b.id);
  });

  it('stores emitter, lifecycle, and motion', () => {
    const emitter = pointEmitter([1, 0, -1], 20);
    const lifecycle = { lifetime: 3, fadeIn: 0.5, fadeOut: 1 };
    const motion = { speed: 2, spread: 0.5 };
    const node = particles({ emitter, lifecycle, motion });
    expect(node.emitter).toBe(emitter);
    expect(node.lifecycle).toBe(lifecycle);
    expect(node.motion).toBe(motion);
  });

  it('uses default maxParticles when not specified', () => {
    const node = particles({
      emitter: pointEmitter([0, 0, 0], 5),
      lifecycle: { lifetime: 1 },
      motion: {},
    });
    expect(node.maxParticles).toBeUndefined();
  });

  it('stores custom maxParticles', () => {
    const node = particles({
      emitter: pointEmitter([0, 0, 0], 5),
      lifecycle: { lifetime: 1 },
      motion: {},
      maxParticles: 500,
    });
    expect(node.maxParticles).toBe(500);
  });
});

describe('ParticleNode in field()', () => {
  it('composes in a field with shape, grid, and particle', () => {
    const particleNode = particles({
      emitter: pointEmitter([0, 0, 0], 10),
      lifecycle: { lifetime: 2 },
      motion: { speed: 1, spread: 0.5 },
    });
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      particleNode,
    );
    expect(f.type).toBe('field');
    expect(f.children).toHaveLength(3);
    expect(f.children[2].type).toBe('particle');
  });

  it('field children include the particle node by reference', () => {
    const pNode = particles({
      emitter: burstEmitter(50),
      lifecycle: { lifetime: 1.5 },
      motion: { gravity: [0, -1, 0] },
    });
    const f = field(pNode);
    expect(f.children[0]).toBe(pNode);
  });
});

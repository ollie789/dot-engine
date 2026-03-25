import { describe, it, expect, beforeEach } from 'vitest';
import { _resetIds } from '../src/nodes/types.js';
import { presets, definePreset } from '../src/presets.js';
import { sphere } from '../src/sdf/primitives.js';
import { simplex3D } from '../src/nodes/displace.js';

beforeEach(() => {
  _resetIds();
});

describe('presets.crystal', () => {
  it('is a FieldRoot', () => {
    expect(presets.crystal.type).toBe('field');
  });

  it('has a shape child', () => {
    const shapeChild = presets.crystal.children.find(c => c.type === 'shape');
    expect(shapeChild).toBeDefined();
  });

  it('has a grid child', () => {
    const gridChild = presets.crystal.children.find(c => c.type === 'grid');
    expect(gridChild).toBeDefined();
  });

  it('has a color child', () => {
    const colorChild = presets.crystal.children.find(c => c.type === 'color');
    expect(colorChild).toBeDefined();
  });

  it('has an animate child', () => {
    const animateChild = presets.crystal.children.find(c => c.type === 'animate');
    expect(animateChild).toBeDefined();
  });

  it('has one displace child', () => {
    const displaceChildren = presets.crystal.children.filter(c => c.type === 'displace');
    expect(displaceChildren).toHaveLength(1);
  });
});

describe('presets.organic', () => {
  it('is a FieldRoot', () => {
    expect(presets.organic.type).toBe('field');
  });

  it('has displace children', () => {
    const displaceChildren = presets.organic.children.filter(c => c.type === 'displace');
    expect(displaceChildren.length).toBeGreaterThanOrEqual(1);
  });

  it('has two displace nodes', () => {
    const displaceChildren = presets.organic.children.filter(c => c.type === 'displace');
    expect(displaceChildren).toHaveLength(2);
  });

  it('has a shape child', () => {
    const shapeChild = presets.organic.children.find(c => c.type === 'shape');
    expect(shapeChild).toBeDefined();
  });

  it('has a color child', () => {
    const colorChild = presets.organic.children.find(c => c.type === 'color');
    expect(colorChild).toBeDefined();
  });

  it('has an animate child', () => {
    const animateChild = presets.organic.children.find(c => c.type === 'animate');
    expect(animateChild).toBeDefined();
  });
});

describe('presets.minimal', () => {
  it('is a FieldRoot', () => {
    expect(presets.minimal.type).toBe('field');
  });

  it('has a shape child containing a sphere', () => {
    const shapeChild = presets.minimal.children.find(c => c.type === 'shape') as any;
    expect(shapeChild).toBeDefined();
    expect(shapeChild.sdf.type).toBe('sphere');
  });

  it('has one displace child', () => {
    const displaceChildren = presets.minimal.children.filter(c => c.type === 'displace');
    expect(displaceChildren).toHaveLength(1);
  });

  it('has color and animate children', () => {
    const colorChild = presets.minimal.children.find(c => c.type === 'color');
    const animateChild = presets.minimal.children.find(c => c.type === 'animate');
    expect(colorChild).toBeDefined();
    expect(animateChild).toBeDefined();
  });
});

describe('definePreset', () => {
  it('creates a FieldRoot with minimal config', () => {
    const result = definePreset({ shape: sphere(0.5) });
    expect(result.type).toBe('field');
  });

  it('always includes shape and grid children', () => {
    const result = definePreset({ shape: sphere(0.5) });
    const types = result.children.map(c => c.type);
    expect(types).toContain('shape');
    expect(types).toContain('grid');
  });

  it('uses default grid resolution when not specified', () => {
    const result = definePreset({ shape: sphere(0.5) });
    const gridChild = result.children.find(c => c.type === 'grid') as any;
    expect(gridChild.resolution).toEqual([30, 30, 30]);
  });

  it('accepts custom grid resolution', () => {
    const result = definePreset({
      shape: sphere(0.5),
      grid: { type: 'uniform', resolution: [10, 10, 10] },
    });
    const gridChild = result.children.find(c => c.type === 'grid') as any;
    expect(gridChild.resolution).toEqual([10, 10, 10]);
  });

  it('includes color child when color config provided', () => {
    const result = definePreset({
      shape: sphere(0.5),
      color: { primary: '#ff0000', accent: '#0000ff' },
    });
    const colorChild = result.children.find(c => c.type === 'color');
    expect(colorChild).toBeDefined();
  });

  it('includes animate child when animate config provided', () => {
    const result = definePreset({
      shape: sphere(0.5),
      animate: { speed: 0.5 },
    });
    const animateChild = result.children.find(c => c.type === 'animate') as any;
    expect(animateChild).toBeDefined();
    expect(animateChild.speed).toBe(0.5);
  });

  it('includes displace children when displace config provided', () => {
    const result = definePreset({
      shape: sphere(0.5),
      displace: [{ noise: simplex3D({ scale: 2, speed: 0.3 }), amount: 0.1 }],
    });
    const displaceChildren = result.children.filter(c => c.type === 'displace');
    expect(displaceChildren).toHaveLength(1);
  });

  it('omits optional children when not in config', () => {
    const result = definePreset({ shape: sphere(0.5) });
    const types = result.children.map(c => c.type);
    expect(types).not.toContain('color');
    expect(types).not.toContain('animate');
    expect(types).not.toContain('displace');
  });
});

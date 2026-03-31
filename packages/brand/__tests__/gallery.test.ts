import { describe, it, expect, beforeEach } from 'vitest';
import { _resetIds } from '../../core/src/nodes/types.js';
import { SHAPE_GALLERY, getShape } from '../src/shapes/gallery.js';

beforeEach(() => {
  _resetIds();
});

describe('SHAPE_GALLERY', () => {
  it('contains at least 8 shapes', () => {
    expect(SHAPE_GALLERY.length).toBeGreaterThanOrEqual(8);
  });

  it('every shape has required fields', () => {
    for (const shape of SHAPE_GALLERY) {
      expect(shape.name).toBeTruthy();
      expect(shape.label).toBeTruthy();
      expect(shape.category).toMatch(/^(pattern|shape)$/);
      expect(shape.description).toBeTruthy();
      expect(shape.icon).toBeTruthy();
      expect(typeof shape.build).toBe('function');
    }
  });

  it('all shape names are unique', () => {
    const names = SHAPE_GALLERY.map(s => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every shape build() returns a valid SdfNode', () => {
    const params = { energy: 0.5, organic: 0.5, density: 0.5 };
    for (const shape of SHAPE_GALLERY) {
      const node = shape.build(params);
      expect(node).toBeDefined();
      expect(node.type).toBeTruthy();
      expect(node.id).toBeTruthy();
    }
  });
});

describe('getShape()', () => {
  it('returns a shape by name', () => {
    const first = SHAPE_GALLERY[0];
    const found = getShape(first.name);
    expect(found).toBe(first);
  });

  it('returns undefined for unknown name', () => {
    expect(getShape('nonexistent-shape')).toBeUndefined();
  });
});

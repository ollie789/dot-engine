import { describe, it, expect, beforeEach } from 'vitest';
import { field } from '../src/nodes/field.js';
import { shape } from '../src/nodes/shape.js';
import { grid } from '../src/nodes/grid.js';
import { animate } from '../src/nodes/animate.js';
import { sphere, torus } from '../src/sdf/primitives.js';
import { smoothUnion } from '../src/sdf/boolean.js';
import { _resetIds } from '../src/nodes/types.js';

beforeEach(() => {
  _resetIds();
});

describe('field()', () => {
  it('creates a FieldRoot with type "field"', () => {
    const f = field();
    expect(f.type).toBe('field');
  });

  it('creates a FieldRoot with empty children when called with no args', () => {
    const f = field();
    expect(f.children).toHaveLength(0);
  });

  it('stores passed children', () => {
    const g = grid({ type: 'uniform', resolution: [10, 10, 10] });
    const f = field(g);
    expect(f.children).toHaveLength(1);
    expect(f.children[0]).toBe(g);
  });
});

describe('full field composition', () => {
  it('composes shape, grid and animate into a FieldRoot', () => {
    const f = field(
      shape(smoothUnion(sphere(0.5), torus(0.3, 0.1), 0.2)),
      grid({ type: 'uniform', resolution: [30, 30, 30] }),
      animate({ speed: 0.15 }),
    );

    expect(f.type).toBe('field');
    expect(f.children).toHaveLength(3);

    const [shapeChild, gridChild, animateChild] = f.children;
    expect(shapeChild.type).toBe('shape');
    expect(gridChild.type).toBe('grid');
    expect(animateChild.type).toBe('animate');
  });

  it('shape wraps smoothUnion of sphere and torus', () => {
    const s = sphere(0.5);
    const t = torus(0.3, 0.1);
    const su = smoothUnion(s, t, 0.2);
    const sh = shape(su);

    expect(sh.type).toBe('shape');
    expect(sh.sdf.type).toBe('smoothUnion');
    if (sh.sdf.type === 'smoothUnion') {
      expect(sh.sdf.k).toBe(0.2);
      expect(sh.sdf.a).toBe(s);
      expect(sh.sdf.b).toBe(t);
    }
  });
});

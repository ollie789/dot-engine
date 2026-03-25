import { describe, it, expect, beforeEach } from 'vitest';
import { _resetIds, FieldRoot } from '../src/nodes/types.js';
import { field } from '../src/nodes/field.js';
import { shape } from '../src/nodes/shape.js';
import { grid } from '../src/nodes/grid.js';
import { torus, sphere } from '../src/sdf/primitives.js';
import { smoothUnion } from '../src/sdf/boolean.js';
import { translate } from '../src/sdf/transforms.js';
import { toJSON, fromJSON } from '../src/serialize.js';
import { evaluateSdf } from '../src/evaluate.js';

beforeEach(() => {
  _resetIds();
});

// Build a representative field: smoothUnion of (translate(torus)) and another
// torus, wrapped in shape + grid inside a FieldRoot.
function buildField(): FieldRoot {
  const t1 = torus(0.5, 0.15);
  const t2 = torus(0.3, 0.1);
  const shifted = translate(t1, [1, 0, 0]);
  const blended = smoothUnion(shifted, t2, 0.3);
  return field(
    shape(blended),
    grid({ type: 'uniform', resolution: [20, 20, 20] }),
  );
}

describe('toJSON / fromJSON round-trip', () => {
  it('round-trips a complex FieldRoot without data loss', () => {
    const original = buildField();
    const json = toJSON(original);
    const restored = fromJSON<FieldRoot>(json);

    // Shape of the tree is preserved
    expect(restored.type).toBe('field');
    expect(restored.children).toHaveLength(2);
    expect(restored.children[0].type).toBe('shape');
    expect(restored.children[1].type).toBe('grid');
  });

  it('reassigns IDs so restored IDs differ from originals', () => {
    const original = buildField();
    const json = toJSON(original);
    const restored = fromJSON<FieldRoot>(json);

    // IDs should be fresh (different counter values)
    const shapeA = original.children[0];
    const shapeB = restored.children[0];
    expect(shapeB.id).not.toBe(shapeA.id);
  });

  it('evaluates identically at 4 test points after round-trip', () => {
    const original = buildField();
    const json = toJSON(original);
    const restored = fromJSON<FieldRoot>(json);

    // Extract the SDF from the shape child in both
    const origShape = original.children[0];
    const restShape = restored.children[0];
    if (origShape.type !== 'shape' || restShape.type !== 'shape') {
      throw new Error('expected shape node');
    }
    const origSdf = origShape.sdf;
    const restSdf = restShape.sdf;

    const testPoints: [number, number, number][] = [
      [0, 0, 0],
      [0.5, 0, 0],
      [1, 0, 0],
      [0, 0.5, 0],
    ];

    for (const p of testPoints) {
      expect(evaluateSdf(restSdf, p)).toBeCloseTo(evaluateSdf(origSdf, p), 5);
    }
  });

  it('preserves edgeSoftness through round-trip', () => {
    const root: FieldRoot = {
      ...field(shape(sphere(1)), grid({ type: 'uniform', resolution: [10, 10, 10] })),
      edgeSoftness: 0.08,
    };
    const json = toJSON(root);
    const restored = fromJSON<FieldRoot>(json);
    expect(restored.edgeSoftness).toBe(0.08);
  });
});

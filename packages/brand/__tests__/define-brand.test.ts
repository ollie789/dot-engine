import { describe, it, expect, beforeEach } from 'vitest';
import { field, shape, grid } from '../../core/src/index.js';
import { _resetIds } from '../../core/src/nodes/types.js';
import { sphere } from '../../core/src/sdf/primitives.js';
import { motionToDisplacements } from '../src/brand/motion.js';
import { sdf, customField } from '../src/logo/types.js';

beforeEach(() => {
  _resetIds();
});

describe('motionToDisplacements()', () => {
  it('flow + useFlowField=true → 2 nodes (simplex + flowField)', () => {
    const nodes = motionToDisplacements('flow', 0.5, 0.1, true);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].noise.type).toBe('simplex3D');
    expect(nodes[1].noise.type).toBe('flowField3D');
  });

  it('flow + useFlowField=false → 1 node', () => {
    const nodes = motionToDisplacements('flow', 0.5, 0.1, false);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].noise.type).toBe('simplex3D');
  });

  it('none → 0 nodes', () => {
    const nodes = motionToDisplacements('none', 0.5, 0.1, true);
    expect(nodes).toHaveLength(0);
  });

  it('breathe → 1 slow simplex node', () => {
    const nodes = motionToDisplacements('breathe', 1.0, 0.1, false);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].noise.type).toBe('simplex3D');
    // Speed should be 0.2 * 1.0 = 0.2 (slow)
    const noise = nodes[0].noise;
    if (noise.type === 'simplex3D') {
      expect(noise.speed).toBeCloseTo(0.2, 5);
    }
  });

  it('pulse → 1 fast simplex node with higher amount', () => {
    const nodes = motionToDisplacements('pulse', 1.0, 0.1, false);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].noise.type).toBe('simplex3D');
    const noise = nodes[0].noise;
    if (noise.type === 'simplex3D') {
      expect(noise.speed).toBeCloseTo(2.0, 5);
    }
    expect(nodes[0].amount).toBeCloseTo(0.12, 5);
  });

  it('flow nodes have correct speed and amount', () => {
    const nodes = motionToDisplacements('flow', 1.0, 0.1, true);
    const simplexNode = nodes[0];
    const flowNode = nodes[1];

    const simplexNoise = simplexNode.noise;
    if (simplexNoise.type === 'simplex3D') {
      expect(simplexNoise.speed).toBeCloseTo(0.5, 5);
    }
    expect(simplexNode.amount).toBeCloseTo(0.1, 5);

    const flowNoise = flowNode.noise;
    if (flowNoise.type === 'flowField3D') {
      expect(flowNoise.speed).toBeCloseTo(0.7, 5);
    }
    expect(flowNode.amount).toBeCloseTo(0.06, 5);
  });
});

describe('SDF logo input', () => {
  it('sdf() creates SdfInput with node', () => {
    const node = sphere(0.5);
    const input = sdf(node);
    expect(input.type).toBe('sdf');
    expect(input.node).toBe(node);
    expect(input.field).toBeUndefined();
  });

  it('customField() creates SdfInput with pre-built field', () => {
    const f = field(shape(sphere(0.5)), grid({ type: 'uniform', resolution: [20, 20, 20] }));
    const input = customField(f);
    expect(input.type).toBe('sdf');
    expect(input.field).toBe(f);
  });

  it('sdf() node reference is preserved', () => {
    const node = sphere(0.42);
    const input = sdf(node);
    expect(input.node).toBe(node);
    expect(input.node.type).toBe('sphere');
    if (input.node.type === 'sphere') {
      expect(input.node.radius).toBe(0.42);
    }
  });

  it('customField() field reference is preserved and node is null', () => {
    const f = field(shape(sphere(0.3)), grid({ type: 'uniform', resolution: [10, 10, 10] }));
    const input = customField(f);
    expect(input.field).toBe(f);
    expect(input.field?.type).toBe('field');
  });
});

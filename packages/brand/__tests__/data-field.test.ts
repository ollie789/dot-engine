import { describe, it, expect, beforeEach } from 'vitest';
import { _resetIds } from '../../core/src/nodes/types.js';
import { textureSdf } from '../../core/src/sdf/texture.js';
import { buildDataField } from '../src/brand/data-field.js';
import type { Brand, DataPoint } from '../src/brand/types.js';
import type { MappedParams } from '../src/brand/personality.js';
import type { DisplaceNode } from '../../core/src/nodes/types.js';

function makeMockBrand(): Brand {
  const sdfNode = textureSdf('test_logo', { depth: 0.3, aspectRatio: 1 });
  const logo = {
    sdfTexture: new Float32Array(0),
    width: 64,
    height: 64,
    aspectRatio: 1,
    textureId: 'test_logo',
    sdfNode,
  };
  const config = {
    name: 'Test Brand',
    logo: { type: 'text' as const, text: 'TEST' },
    colors: { primary: '#4a9eff', accent: '#ff6b4a', background: '#0a0a0a' },
    personality: { energy: 0.5, organic: 0.6, density: 0.5 },
    motion: { style: 'flow' as const, speed: 0.5 },
  };
  return { config, logo, field: () => { throw new Error('not used'); } };
}

function makeMockParams(overrides?: Partial<MappedParams>): MappedParams {
  return {
    animateSpeed: 0.4,
    displacementAmount: 0.08,
    edgeSoftness: 0.05,
    useFlowField: true,
    gridResolution: 40,
    ...overrides,
  };
}

beforeEach(() => {
  _resetIds();
});

describe('buildDataField()', () => {
  it('empty data array creates field without attract displacements', () => {
    const brand = makeMockBrand();
    const params = makeMockParams();
    const result = buildDataField(brand, params, []);
    expect(result.type).toBe('field');
    const displaceNodes = result.children.filter(c => c.type === 'displace') as DisplaceNode[];
    const attractNodes = displaceNodes.filter(d => d.noise.type === 'attract');
    expect(attractNodes).toHaveLength(0);
  });

  it('data context with 3 points creates field with 3 attract displacements', () => {
    const brand = makeMockBrand();
    const params = makeMockParams();
    const dataPoints: DataPoint[] = [
      { position: [0.5, 0.5, 0.5], value: 0.8 },
      { position: [0.2, 0.3, 0.5], value: 0.5 },
      { position: [0.8, 0.7, 0.5], value: 0.3 },
    ];
    const result = buildDataField(brand, params, dataPoints);
    expect(result.type).toBe('field');
    const displaceNodes = result.children.filter(c => c.type === 'displace') as DisplaceNode[];
    const attractNodes = displaceNodes.filter(d => d.noise.type === 'attract');
    expect(attractNodes).toHaveLength(3);
  });

  it('data points are capped at 16', () => {
    const brand = makeMockBrand();
    const params = makeMockParams();
    const dataPoints: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
      position: [i / 20, 0.5, 0.5] as [number, number, number],
      value: 0.5,
    }));
    const result = buildDataField(brand, params, dataPoints);
    const displaceNodes = result.children.filter(c => c.type === 'displace') as DisplaceNode[];
    const attractNodes = displaceNodes.filter(d => d.noise.type === 'attract');
    expect(attractNodes).toHaveLength(16);
  });

  it('data point value scales displacement amount', () => {
    const brand = makeMockBrand();
    const params = makeMockParams({ displacementAmount: 0.1 });
    const lowPoint: DataPoint = { position: [0.5, 0.5, 0.5], value: 0.2 };
    const highPoint: DataPoint = { position: [0.5, 0.5, 0.5], value: 0.9 };

    const lowResult = buildDataField(brand, params, [lowPoint]);
    const highResult = buildDataField(brand, params, [highPoint]);

    const lowDisplace = lowResult.children.find(
      (c): c is DisplaceNode => c.type === 'displace' && (c as DisplaceNode).noise.type === 'attract',
    ) as DisplaceNode;
    const highDisplace = highResult.children.find(
      (c): c is DisplaceNode => c.type === 'displace' && (c as DisplaceNode).noise.type === 'attract',
    ) as DisplaceNode;

    expect(highDisplace.amount).toBeGreaterThan(lowDisplace.amount);
  });

  it('data field has standard nodes (shape, grid, color, animate)', () => {
    const brand = makeMockBrand();
    const params = makeMockParams();
    const result = buildDataField(brand, params, []);
    expect(result.children.some(c => c.type === 'shape')).toBe(true);
    expect(result.children.some(c => c.type === 'grid')).toBe(true);
    expect(result.children.some(c => c.type === 'color')).toBe(true);
    expect(result.children.some(c => c.type === 'animate')).toBe(true);
  });

  it('attract noise target is scaled from [0,1] to [-1,1]', () => {
    const brand = makeMockBrand();
    const params = makeMockParams();
    const dataPoints: DataPoint[] = [
      { position: [1.0, 0.0, 0.5], value: 0.5 },
    ];
    const result = buildDataField(brand, params, dataPoints);
    const displaceNode = result.children.find(
      (c): c is DisplaceNode => c.type === 'displace' && (c as DisplaceNode).noise.type === 'attract',
    ) as DisplaceNode;
    const noise = displaceNode.noise;
    if (noise.type === 'attract') {
      // position [1.0, 0.0, 0.5] → world [(1-0.5)*2, (0-0.5)*2, (0.5-0.5)*2] = [1, -1, 0]
      expect(noise.target[0]).toBeCloseTo(1.0, 5);
      expect(noise.target[1]).toBeCloseTo(-1.0, 5);
      expect(noise.target[2]).toBeCloseTo(0.0, 5);
    }
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { _resetIds, nodeId } from '../../core/src/nodes/types.js';
import { textureSdf } from '../../core/src/sdf/texture.js';
import { buildContextField, buildLogoField, buildHeroField, buildLoadingField, buildBannerField } from '../src/brand/contexts.js';
import { buildDataField } from '../src/brand/data-field.js';
import type { Brand, DataPoint } from '../src/brand/types.js';
import type { MappedParams } from '../src/brand/personality.js';

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
  // field() is not needed in these tests since we call builders directly
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

describe('buildContextField()', () => {
  it('unknown context falls back to logo', () => {
    const brand = makeMockBrand();
    const params = makeMockParams();
    const result = buildContextField(brand, 'unknown', params);
    expect(result.type).toBe('field');
    const grid = result.children.find(c => c.type === 'grid');
    expect(grid).toBeDefined();
  });

  it('logo context returns FieldRoot with shape, grid, color, animate', () => {
    const brand = makeMockBrand();
    const params = makeMockParams();
    const result = buildLogoField(brand, params);
    expect(result.type).toBe('field');
    expect(result.children.some(c => c.type === 'shape')).toBe(true);
    expect(result.children.some(c => c.type === 'grid')).toBe(true);
    expect(result.children.some(c => c.type === 'color')).toBe(true);
    expect(result.children.some(c => c.type === 'animate')).toBe(true);
  });

  it('hero context has higher grid resolution than logo', () => {
    const brand = makeMockBrand();
    const params = makeMockParams({ gridResolution: 40 });
    const logoField = buildLogoField(brand, params);
    const heroField = buildHeroField(brand, params);

    const logoGrid = logoField.children.find(c => c.type === 'grid') as any;
    const heroGrid = heroField.children.find(c => c.type === 'grid') as any;

    expect(heroGrid.resolution[0]).toBeGreaterThan(logoGrid.resolution[0]);
  });

  it('hero context grid resolution is capped at 60', () => {
    const brand = makeMockBrand();
    const params = makeMockParams({ gridResolution: 60 });
    const heroField = buildHeroField(brand, params);
    const heroGrid = heroField.children.find(c => c.type === 'grid') as any;
    expect(heroGrid.resolution[0]).toBeLessThanOrEqual(60);
  });

  it('loading context has lower grid resolution than logo', () => {
    const brand = makeMockBrand();
    const params = makeMockParams({ gridResolution: 40 });
    const logoField = buildLogoField(brand, params);
    const loadingField = buildLoadingField(brand, params);

    const logoGrid = logoField.children.find(c => c.type === 'grid') as any;
    const loadingGrid = loadingField.children.find(c => c.type === 'grid') as any;

    expect(loadingGrid.resolution[0]).toBeLessThan(logoGrid.resolution[0]);
  });

  it('loading context grid resolution is at least 15', () => {
    const brand = makeMockBrand();
    const params = makeMockParams({ gridResolution: 20 });
    const loadingField = buildLoadingField(brand, params);
    const loadingGrid = loadingField.children.find(c => c.type === 'grid') as any;
    expect(loadingGrid.resolution[0]).toBeGreaterThanOrEqual(15);
  });

  it('loading context uses breathing displacement (simplex3D only, no flowField3D)', () => {
    const brand = makeMockBrand();
    const params = makeMockParams({ useFlowField: true });
    const loadingField = buildLoadingField(brand, params);
    const displaceNodes = loadingField.children.filter(c => c.type === 'displace') as any[];
    // All displace nodes must use simplex3D
    for (const d of displaceNodes) {
      expect(d.noise.type).toBe('simplex3D');
    }
    // No flowField3D present
    const hasFlow = displaceNodes.some(d => d.noise.type === 'flowField3D');
    expect(hasFlow).toBe(false);
    // At least one displace node
    expect(displaceNodes.length).toBeGreaterThan(0);
  });

  it('banner context returns valid FieldRoot', () => {
    const brand = makeMockBrand();
    const params = makeMockParams();
    const result = buildBannerField(brand, params);
    expect(result.type).toBe('field');
    expect(result.children.some(c => c.type === 'shape')).toBe(true);
    expect(result.children.some(c => c.type === 'grid')).toBe(true);
  });

  it('banner context with width scales X resolution', () => {
    const brand = makeMockBrand();
    const params = makeMockParams({ gridResolution: 40 });
    const normalField = buildBannerField(brand, params);
    const wideField = buildBannerField(brand, params, { width: 800 });

    const normalGrid = normalField.children.find(c => c.type === 'grid') as any;
    const wideGrid = wideField.children.find(c => c.type === 'grid') as any;

    expect(wideGrid.resolution[0]).toBeGreaterThan(normalGrid.resolution[0]);
  });

  it('default context (logo) via buildContextField', () => {
    const brand = makeMockBrand();
    const params = makeMockParams();
    const result = buildContextField(brand, 'logo', params);
    expect(result.type).toBe('field');
    const grid = result.children.find(c => c.type === 'grid') as any;
    // logo uses exact gridResolution
    expect(grid.resolution[0]).toBe(40);
  });
});

describe('transition context', () => {
  it('logo and hero both return valid FieldRoots', () => {
    const brand = makeMockBrand();
    const params = makeMockParams();
    const logoField = buildLogoField(brand, params);
    const heroField = buildHeroField(brand, params);
    expect(logoField.type).toBe('field');
    expect(heroField.type).toBe('field');
  });
});

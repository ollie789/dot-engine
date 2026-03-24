import { describe, it, expect } from 'vitest';
import { mapPersonality } from '../src/brand/personality.js';

describe('mapPersonality()', () => {
  it('low energy → speed ~0.05, displacement ~0.02', () => {
    const p = mapPersonality({ energy: 0, organic: 0, density: 0 });
    expect(p.animateSpeed).toBeCloseTo(0.05, 5);
    expect(p.displacementAmount).toBeCloseTo(0.02, 5);
  });

  it('high energy → speed ~0.8, displacement ~0.15', () => {
    const p = mapPersonality({ energy: 1, organic: 0, density: 0 });
    expect(p.animateSpeed).toBeCloseTo(0.8, 5);
    expect(p.displacementAmount).toBeCloseTo(0.15, 5);
  });

  it('low organic → sharp edges (edgeSoftness ~0.02), no flow field', () => {
    const p = mapPersonality({ energy: 0, organic: 0, density: 0 });
    expect(p.edgeSoftness).toBeCloseTo(0.02, 5);
    expect(p.useFlowField).toBe(false);
  });

  it('high organic → soft edges (edgeSoftness ~0.1), flow field enabled', () => {
    const p = mapPersonality({ energy: 0, organic: 1, density: 0 });
    expect(p.edgeSoftness).toBeCloseTo(0.1, 5);
    expect(p.useFlowField).toBe(true);
  });

  it('organic just above 0.5 enables flow field', () => {
    const p = mapPersonality({ energy: 0, organic: 0.51, density: 0 });
    expect(p.useFlowField).toBe(true);
  });

  it('organic at exactly 0.5 does not enable flow field', () => {
    const p = mapPersonality({ energy: 0, organic: 0.5, density: 0 });
    expect(p.useFlowField).toBe(false);
  });

  it('low density → grid resolution 20', () => {
    const p = mapPersonality({ energy: 0, organic: 0, density: 0 });
    expect(p.gridResolution).toBe(20);
  });

  it('high density → grid resolution 60', () => {
    const p = mapPersonality({ energy: 0, organic: 0, density: 1 });
    expect(p.gridResolution).toBe(60);
  });

  it('mid density → grid resolution ~40', () => {
    const p = mapPersonality({ energy: 0, organic: 0, density: 0.5 });
    expect(p.gridResolution).toBe(40);
  });
});

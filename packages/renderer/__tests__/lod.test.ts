import { describe, it, expect } from 'vitest';
import { computeLodTier } from '../src/components/LodBenchmark.js';

describe('computeLodTier', () => {
  it('fast GPU (1ms/10K dots) → high tier, maxDots > 100K', () => {
    // 1ms for 10K dots
    const tier = computeLodTier(1, 10000);
    expect(tier.quality).toBe('high');
    expect(tier.maxDots).toBeGreaterThan(100000);
    expect(tier.dotComplexity).toBe(8);
    expect(tier.includeFlowField).toBe(true);
  });

  it('mid GPU (5ms/10K dots) → medium tier, 20K < maxDots < 100K', () => {
    // 5ms for 10K dots → msPerDot = 0.0005 → budget = 16/0.0005 = 32000
    const tier = computeLodTier(5, 10000);
    expect(tier.quality).toBe('medium');
    expect(tier.maxDots).toBeGreaterThan(20000);
    expect(tier.maxDots).toBeLessThan(100000);
    expect(tier.dotComplexity).toBe(2);
    expect(tier.includeFlowField).toBe(false);
  });

  it('slow GPU (14ms/10K dots) → low tier, maxDots < 20K', () => {
    // 14ms for 10K dots → msPerDot = 0.0014 → budget = 16/0.0014 ≈ 11428
    const tier = computeLodTier(14, 10000);
    expect(tier.quality).toBe('low');
    expect(tier.maxDots).toBeLessThan(20000);
    expect(tier.dotComplexity).toBe(1);
    expect(tier.includeFlowField).toBe(false);
  });

  it('very slow GPU (20ms/10K dots) → clamps to MIN_DOTS (1000)', () => {
    // 20ms for 10K dots → msPerDot = 0.002 → budget = 16/0.002 = 8000, but clamped... wait
    // Actually: msPerDot = 20/10000 = 0.002, budget = floor(16/0.002) = floor(8000) = 8000
    // 8000 < 20000 → low tier, maxDots = max(1000, 8000) = 8000
    // For clamping to 1000: need frameMs much higher, e.g. 200ms/10K
    // 200ms/10K → msPerDot = 0.02 → budget = floor(16/0.02) = 800 → clamped to 1000
    const tier = computeLodTier(200, 10000);
    expect(tier.quality).toBe('low');
    expect(tier.maxDots).toBe(1000);
  });

  it('manual override sets quality and dots regardless of frame timing', () => {
    const tier = computeLodTier(100, 10000, { dots: 50000, quality: 'medium' });
    expect(tier.quality).toBe('medium');
    expect(tier.maxDots).toBe(50000);
    expect(tier.dotComplexity).toBe(2);
    expect(tier.includeFlowField).toBe(false);
  });

  it('manual override high quality sets correct complexity', () => {
    const tier = computeLodTier(100, 10000, { dots: 200000, quality: 'high' });
    expect(tier.quality).toBe('high');
    expect(tier.maxDots).toBe(200000);
    expect(tier.dotComplexity).toBe(8);
    expect(tier.includeFlowField).toBe(true);
  });

  it('manual override low quality sets correct complexity', () => {
    const tier = computeLodTier(1, 10000, { dots: 5000, quality: 'low' });
    expect(tier.quality).toBe('low');
    expect(tier.maxDots).toBe(5000);
    expect(tier.dotComplexity).toBe(1);
    expect(tier.includeFlowField).toBe(false);
  });
});

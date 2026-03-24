export type LodQuality = 'high' | 'medium' | 'low';

export interface LodTier {
  quality: LodQuality;
  maxDots: number;
  dotComplexity: number;       // triangles per dot geometry
  includeFlowField: boolean;   // whether to include flow field in shader
}

export interface LodOverride {
  dots: number;
  quality: LodQuality;
}

const TARGET_FRAME_MS = 16; // 60fps
const MIN_DOTS = 1000;

export function computeLodTier(
  frameMs: number,
  benchDots: number,
  override?: LodOverride,
): LodTier {
  if (override) {
    return tierForQuality(override.quality, override.dots);
  }

  const msPerDot = frameMs / benchDots;
  const budgetDots = Math.floor(TARGET_FRAME_MS / msPerDot);
  const maxDots = Math.max(MIN_DOTS, budgetDots);

  if (maxDots >= 100000) return tierForQuality('high', maxDots);
  if (maxDots >= 20000) return tierForQuality('medium', maxDots);
  return tierForQuality('low', maxDots);
}

function tierForQuality(quality: LodQuality, maxDots: number): LodTier {
  switch (quality) {
    case 'high': return { quality, maxDots: Math.min(maxDots, 300000), dotComplexity: 8, includeFlowField: true };
    case 'medium': return { quality, maxDots: Math.min(maxDots, 100000), dotComplexity: 2, includeFlowField: false };
    case 'low': return { quality, maxDots, dotComplexity: 1, includeFlowField: false };
  }
}

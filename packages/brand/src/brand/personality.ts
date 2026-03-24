export interface PersonalityTraits { energy: number; organic: number; density: number; }

export interface MappedParams {
  animateSpeed: number;
  displacementAmount: number;
  edgeSoftness: number;
  useFlowField: boolean;
  gridResolution: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function mapPersonality(traits: PersonalityTraits): MappedParams {
  return {
    animateSpeed: lerp(0.05, 0.8, traits.energy),
    displacementAmount: lerp(0.02, 0.15, traits.energy),
    edgeSoftness: lerp(0.02, 0.1, traits.organic),
    useFlowField: traits.organic > 0.5,
    gridResolution: Math.round(lerp(20, 60, traits.density)),
  };
}

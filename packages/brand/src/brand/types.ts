import type { FieldRoot } from '@bigpuddle/dot-engine-core';
import type { ParticleNode } from '@bigpuddle/dot-engine-core';
import type { LogoInput, ProcessedLogo } from '../logo/types.js';
import type { PersonalityTraits } from './personality.js';
import type { MotionStyle } from './motion.js';
import type { ParticleMode } from './particle-presets.js';

export type BrandContext = 'logo' | 'hero' | 'loading' | 'banner' | 'data' | 'transition';

export interface DataPoint {
  position: [number, number, number];
  value: number;
  radius?: number;
  category?: string;
}

export interface ContextOptions {
  width?: number;
  height?: number;
  data?: DataPoint[];
  // Transition
  from?: BrandContext;
  to?: BrandContext;
  progress?: number;
  canvasAspect?: number;  // canvas width/height ratio for grid adaptation
  // Shape transforms
  twist?: number;
  bend?: number;
  mirrorX?: boolean;
  mirrorY?: boolean;
  // Dot size overrides
  dotSizeMin?: number;
  dotSizeMax?: number;
  edgeSoftness?: number;
}

export interface BrandConfig {
  name?: string;
  logo: LogoInput;
  colors: {
    primary: string;
    accent: string;
    background?: string;
  };
  personality: PersonalityTraits;
  motion: {
    style: MotionStyle;
    speed: number;
  };
}

export interface Brand {
  config: BrandConfig;
  logo: ProcessedLogo;
  field(context?: BrandContext, options?: ContextOptions): FieldRoot;
  particles(mode: ParticleMode): ParticleNode | null;
}

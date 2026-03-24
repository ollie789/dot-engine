import type { FieldRoot } from '@dot-engine/core';
import type { LogoInput, ProcessedLogo } from '../logo/types.js';
import type { PersonalityTraits } from './personality.js';
import type { MotionStyle } from './motion.js';

export interface BrandConfig {
  logo: LogoInput;
  colors: {
    primary: string;
    accent: string;
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
  field(): FieldRoot;
}

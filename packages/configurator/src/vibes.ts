export interface Vibe {
  name: string;
  label: string;
  description: string;
  icon: string;
  // All the settings this vibe configures
  energy: number;
  organic: number;
  density: number;
  motionStyle: 'flow' | 'breathe' | 'pulse' | 'none';
  motionSpeed: number;
  particleMode: 'none' | 'ambient' | 'burst' | 'rising' | 'edges';
  dotSizeMin: number;
  dotSizeMax: number;
  edgeSoftness: number;
  twist: number;
  bend: number;
  mirrorX: boolean;
  mirrorY: boolean;
  // Suggested brand colors (user can override)
  suggestedPrimary: string;
  suggestedAccent: string;
}

export const VIBES: Vibe[] = [
  {
    name: 'minimal',
    label: 'Minimal',
    description: 'Clean, precise, understated',
    icon: '○',
    energy: 0.15, organic: 0.2, density: 0.4,
    motionStyle: 'breathe', motionSpeed: 0.15,
    particleMode: 'none',
    dotSizeMin: 0.003, dotSizeMax: 0.015, edgeSoftness: 0.02,
    twist: 0, bend: 0, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#e0e0e0', suggestedAccent: '#808080',
  },
  {
    name: 'elegant',
    label: 'Elegant',
    description: 'Refined, flowing, luxurious',
    icon: '◇',
    energy: 0.35, organic: 0.7, density: 0.55,
    motionStyle: 'flow', motionSpeed: 0.2,
    particleMode: 'ambient',
    dotSizeMin: 0.002, dotSizeMax: 0.012, edgeSoftness: 0.06,
    twist: 0.15, bend: 0.1, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#c4a35a', suggestedAccent: '#2a1f3d',
  },
  {
    name: 'bold',
    label: 'Bold',
    description: 'Strong, confident, impactful',
    icon: '■',
    energy: 0.6, organic: 0.3, density: 0.6,
    motionStyle: 'pulse', motionSpeed: 0.5,
    particleMode: 'edges',
    dotSizeMin: 0.004, dotSizeMax: 0.025, edgeSoftness: 0.03,
    twist: 0, bend: 0, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#ff3b3b', suggestedAccent: '#1a1a2e',
  },
  {
    name: 'organic',
    label: 'Organic',
    description: 'Natural, alive, breathing',
    icon: '❋',
    energy: 0.5, organic: 0.9, density: 0.5,
    motionStyle: 'flow', motionSpeed: 0.35,
    particleMode: 'ambient',
    dotSizeMin: 0.002, dotSizeMax: 0.018, edgeSoftness: 0.08,
    twist: 0.1, bend: 0.15, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#2D7A4A', suggestedAccent: '#E07A5F',
  },
  {
    name: 'energetic',
    label: 'Energetic',
    description: 'Dynamic, fast, explosive',
    icon: '⚡',
    energy: 0.85, organic: 0.6, density: 0.55,
    motionStyle: 'pulse', motionSpeed: 0.7,
    particleMode: 'burst',
    dotSizeMin: 0.003, dotSizeMax: 0.02, edgeSoftness: 0.05,
    twist: 0.5, bend: 0.3, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#ff6b4a', suggestedAccent: '#4a9eff',
  },
  {
    name: 'cosmic',
    label: 'Cosmic',
    description: 'Ethereal, vast, mysterious',
    icon: '✦',
    energy: 0.4, organic: 0.8, density: 0.35,
    motionStyle: 'flow', motionSpeed: 0.25,
    particleMode: 'rising',
    dotSizeMin: 0.001, dotSizeMax: 0.01, edgeSoftness: 0.1,
    twist: 0.3, bend: 0.15, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#6b5bff', suggestedAccent: '#00e5ff',
  },
  {
    name: 'industrial',
    label: 'Industrial',
    description: 'Raw, mechanical, structured',
    icon: '⬡',
    energy: 0.3, organic: 0.1, density: 0.7,
    motionStyle: 'none', motionSpeed: 0.1,
    particleMode: 'none',
    dotSizeMin: 0.005, dotSizeMax: 0.02, edgeSoftness: 0.01,
    twist: 0, bend: 0, mirrorX: true, mirrorY: false,
    suggestedPrimary: '#aaaaaa', suggestedAccent: '#444444',
  },
  {
    name: 'neon',
    label: 'Neon',
    description: 'Electric, glowing, cyberpunk',
    icon: '◈',
    energy: 0.7, organic: 0.5, density: 0.5,
    motionStyle: 'pulse', motionSpeed: 0.6,
    particleMode: 'edges',
    dotSizeMin: 0.002, dotSizeMax: 0.015, edgeSoftness: 0.07,
    twist: 0.2, bend: 0, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#00ff88', suggestedAccent: '#ff00ff',
  },
  {
    name: 'zen',
    label: 'Zen',
    description: 'Calm, balanced, meditative',
    icon: '◎',
    energy: 0.1, organic: 0.6, density: 0.3,
    motionStyle: 'breathe', motionSpeed: 0.1,
    particleMode: 'ambient',
    dotSizeMin: 0.002, dotSizeMax: 0.012, edgeSoftness: 0.08,
    twist: 0, bend: 0, mirrorX: false, mirrorY: true,
    suggestedPrimary: '#8fbc8f', suggestedAccent: '#deb887',
  },
  {
    name: 'glitch',
    label: 'Glitch',
    description: 'Broken, distorted, chaotic',
    icon: '▓',
    energy: 0.9, organic: 0.4, density: 0.6,
    motionStyle: 'pulse', motionSpeed: 0.9,
    particleMode: 'burst',
    dotSizeMin: 0.003, dotSizeMax: 0.025, edgeSoftness: 0.02,
    twist: 1.5, bend: 0.8, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#00ff00', suggestedAccent: '#ff0000',
  },
  {
    name: 'frost',
    label: 'Frost',
    description: 'Cold, crystalline, delicate',
    icon: '❄',
    energy: 0.25, organic: 0.5, density: 0.45,
    motionStyle: 'breathe', motionSpeed: 0.15,
    particleMode: 'rising',
    dotSizeMin: 0.001, dotSizeMax: 0.008, edgeSoftness: 0.06,
    twist: 0.1, bend: 0.1, mirrorX: true, mirrorY: true,
    suggestedPrimary: '#a8d8ea', suggestedAccent: '#ffffff',
  },
  {
    name: 'ember',
    label: 'Ember',
    description: 'Warm, smoldering, intense',
    icon: '🔥',
    energy: 0.55, organic: 0.7, density: 0.5,
    motionStyle: 'flow', motionSpeed: 0.4,
    particleMode: 'rising',
    dotSizeMin: 0.002, dotSizeMax: 0.02, edgeSoftness: 0.07,
    twist: 0.15, bend: 0.3, mirrorX: false, mirrorY: false,
    suggestedPrimary: '#ff4500', suggestedAccent: '#ffd700',
  },
];

export type VibeSettings = Pick<
  Vibe,
  | 'energy'
  | 'organic'
  | 'density'
  | 'motionStyle'
  | 'motionSpeed'
  | 'particleMode'
  | 'dotSizeMin'
  | 'dotSizeMax'
  | 'edgeSoftness'
  | 'twist'
  | 'bend'
  | 'mirrorX'
  | 'mirrorY'
>;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function applyIntensity(vibe: Vibe, intensity: number): VibeSettings {
  // intensity 0.5 = vibe as-is. 0 = everything calmed down. 1 = everything cranked up.
  const scale = 0.3 + intensity * 1.4; // maps 0-1 to 0.3-1.7x
  return {
    energy: clamp(vibe.energy * scale, 0, 1),
    organic: vibe.organic,
    density: clamp(vibe.density * (0.7 + intensity * 0.6), 0.2, 0.9),
    motionStyle: vibe.motionStyle,
    motionSpeed: clamp(vibe.motionSpeed * scale, 0.05, 1),
    particleMode: vibe.particleMode,
    dotSizeMin: vibe.dotSizeMin,
    dotSizeMax: clamp(vibe.dotSizeMax * (0.5 + intensity), 0.005, 0.05),
    edgeSoftness: clamp(vibe.edgeSoftness * scale, 0.01, 0.15),
    twist: vibe.twist * scale,
    bend: vibe.bend * scale,
    mirrorX: vibe.mirrorX,
    mirrorY: vibe.mirrorY,
  };
}

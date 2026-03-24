import { nodeId, ColorMode, ColorNode, GradientColorNode, NoiseColorNode } from './types.js';

export function color(opts: {
  primary: string;
  accent: string;
  mode?: ColorMode;
}): ColorNode {
  return {
    id: nodeId(),
    type: 'color',
    primary: opts.primary,
    accent: opts.accent,
    mode: opts.mode ?? 'depth',
  };
}

export function gradient(opts: {
  axis: 'x' | 'y' | 'z';
  stops: [string, number][];
}): GradientColorNode {
  return {
    id: nodeId(),
    type: 'gradientColor',
    axis: opts.axis,
    stops: opts.stops,
  };
}

export function noiseColor(opts: {
  palette: string[];
  scale: number;
  speed: number;
}): NoiseColorNode {
  return {
    id: nodeId(),
    type: 'noiseColor',
    palette: opts.palette,
    scale: opts.scale,
    speed: opts.speed,
  };
}

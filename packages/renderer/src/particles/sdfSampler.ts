/**
 * SDF rejection sampling for surface-aware particle spawning.
 */

export interface ParticleSdfData {
  texture: Float32Array;
  width: number;
  height: number;
  aspectRatio: number;
  depth: number;
}

export function sampleSdfSurface(sdf: ParticleSdfData): [number, number, number] {
  const { texture, width, height, aspectRatio, depth } = sdf;
  const threshold = 0.02;
  const maxAttempts = 30;

  let bestU = 0.5, bestV = 0.5, bestAbsSdf = Infinity;

  for (let i = 0; i < maxAttempts; i++) {
    const u = Math.random();
    const v = Math.random();
    const col = Math.min(Math.floor(u * width), width - 1);
    const row = Math.min(Math.floor(v * height), height - 1);
    const sdfVal = texture[row * width + col];
    const absSdf = Math.abs(sdfVal);

    if (absSdf < threshold) {
      return uvToPosition(u, v, aspectRatio, depth);
    }

    if (absSdf < bestAbsSdf) {
      bestAbsSdf = absSdf;
      bestU = u;
      bestV = v;
    }
  }

  return uvToPosition(bestU, bestV, aspectRatio, depth);
}

export function sampleSdfVolume(sdf: ParticleSdfData): [number, number, number] {
  const { texture, width, height, aspectRatio, depth } = sdf;
  const maxAttempts = 30;

  let bestU = 0.5, bestV = 0.5, bestSdf = Infinity;

  for (let i = 0; i < maxAttempts; i++) {
    const u = Math.random();
    const v = Math.random();
    const col = Math.min(Math.floor(u * width), width - 1);
    const row = Math.min(Math.floor(v * height), height - 1);
    const sdfVal = texture[row * width + col];

    if (sdfVal < 0) {
      return uvToPosition(u, v, aspectRatio, depth);
    }

    if (sdfVal < bestSdf) {
      bestSdf = sdfVal;
      bestU = u;
      bestV = v;
    }
  }

  return uvToPosition(bestU, bestV, aspectRatio, depth);
}

function uvToPosition(
  u: number,
  v: number,
  aspectRatio: number,
  depth: number,
): [number, number, number] {
  const x = (u - 0.5) * 2 * aspectRatio;
  const y = (0.5 - v) * 2;
  const z = (Math.random() - 0.5) * depth;
  return [x, y, z];
}

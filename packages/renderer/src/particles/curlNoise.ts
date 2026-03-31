/**
 * Analytical curl noise using trig-based potential fields.
 * Divergence-free: particles follow smooth swirling paths.
 */

function potX(x: number, y: number, z: number, t: number, s: number): number {
  return Math.sin(y * s + t) * Math.cos(z * s * 0.7 + t * 0.6);
}

function potY(x: number, y: number, z: number, t: number, s: number): number {
  return Math.sin(z * s * 0.8 + t * 0.8) * Math.cos(x * s + t * 0.5);
}

function potZ(x: number, y: number, z: number, t: number, s: number): number {
  return Math.sin(x * s * 0.9 + t * 0.7) * Math.cos(y * s * 0.6 + t * 0.9);
}

export function curlNoise3D(
  x: number,
  y: number,
  z: number,
  t: number,
  scale: number,
): [number, number, number] {
  const e = 0.01;

  const dPz_dy = (potZ(x, y + e, z, t, scale) - potZ(x, y - e, z, t, scale));
  const dPy_dz = (potY(x, y, z + e, t, scale) - potY(x, y, z - e, t, scale));

  const dPx_dz = (potX(x, y, z + e, t, scale) - potX(x, y, z - e, t, scale));
  const dPz_dx = (potZ(x + e, y, z, t, scale) - potZ(x - e, y, z, t, scale));

  const dPy_dx = (potY(x + e, y, z, t, scale) - potY(x - e, y, z, t, scale));
  const dPx_dy = (potX(x, y + e, z, t, scale) - potX(x, y - e, z, t, scale));

  const inv = 1 / (2 * e);

  return [
    (dPz_dy - dPy_dz) * inv,
    (dPx_dz - dPz_dx) * inv,
    (dPy_dx - dPx_dy) * inv,
  ];
}

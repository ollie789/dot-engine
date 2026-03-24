/**
 * Felzenszwalb-Huttenlocher Euclidean Distance Transform (EDT)
 * O(n) per row/column exact distance transform.
 */

function edt1d(f: Float32Array, n: number): void {
  const d = new Float32Array(n);
  const v = new Int32Array(n);
  const z = new Float32Array(n + 1);
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;

  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }

  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
  f.set(d);
}

export function computeEDT(mask: Uint8Array, width: number, height: number): Float32Array {
  const size = width * height;
  // Use a large finite sentinel instead of Infinity — the FH algorithm
  // breaks when input values are actual Infinity (Inf - Inf = NaN).
  const INF = (width + height) * (width + height);
  const f = new Float32Array(size);
  for (let i = 0; i < size; i++) f[i] = mask[i] ? INF : 0;

  // Transform columns
  const col = new Float32Array(height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) col[y] = f[y * width + x];
    edt1d(col, height);
    for (let y = 0; y < height; y++) f[y * width + x] = col[y];
  }

  // Transform rows
  const row = new Float32Array(width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) row[x] = f[y * width + x];
    edt1d(row, width);
    for (let x = 0; x < width; x++) f[y * width + x] = row[x];
  }

  // Square root
  for (let i = 0; i < size; i++) f[i] = Math.sqrt(f[i]);
  return f;
}

export function computeSignedDistance(mask: Uint8Array, width: number, height: number): Float32Array {
  const outer = computeEDT(mask, width, height);
  const inverted = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) inverted[i] = mask[i] ? 0 : 1;
  const inner = computeEDT(inverted, width, height);

  const sdf = new Float32Array(mask.length);
  const maxDim = Math.max(width, height);
  for (let i = 0; i < mask.length; i++) {
    // inner - outer: negative inside shape, positive outside (SDF convention)
    sdf[i] = (inner[i] - outer[i]) / maxDim;
  }
  return sdf;
}

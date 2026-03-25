/**
 * Compute bridge: converts WebGPU compute output (Float32Array) to
 * Three.js InstancedMesh instance matrices.
 *
 * Dot output layout (8 floats per dot):
 *   [0] x  [1] y  [2] z  [3] scale
 *   [4] r  [5] g  [6] b  [7] alpha
 */

export const DOT_STRIDE = 8;

/**
 * Convert compute results to instance matrices, compacting visible dots.
 * Returns the number of visible dots written.
 *
 * @param results - Float32Array from compute shader (DOT_STRIDE floats per dot)
 * @param matrices - Target Float32Array for 4x4 instance matrices (16 floats per instance)
 * @param totalDots - Number of dots in the results buffer
 * @returns Number of visible dots written to matrices
 */
export function applyComputeResults(
  results: Float32Array,
  matrices: Float32Array,
  totalDots: number,
): number {
  let visibleCount = 0;

  for (let i = 0; i < totalDots; i++) {
    const src = i * DOT_STRIDE;
    const scale = results[src + 3];

    // Skip culled dots (scale ~ 0)
    if (scale < 0.001) continue;

    const dst = visibleCount * 16;
    const x = results[src];
    const y = results[src + 1];
    const z = results[src + 2];

    // Build a scale + translate matrix (column-major for Three.js):
    // [sx  0  0  0]
    // [ 0 sy  0  0]
    // [ 0  0 sz  0]
    // [tx ty tz  1]
    matrices[dst]      = scale;
    matrices[dst + 1]  = 0;
    matrices[dst + 2]  = 0;
    matrices[dst + 3]  = 0;
    matrices[dst + 4]  = 0;
    matrices[dst + 5]  = scale;
    matrices[dst + 6]  = 0;
    matrices[dst + 7]  = 0;
    matrices[dst + 8]  = 0;
    matrices[dst + 9]  = 0;
    matrices[dst + 10] = scale;
    matrices[dst + 11] = 0;
    matrices[dst + 12] = x;
    matrices[dst + 13] = y;
    matrices[dst + 14] = z;
    matrices[dst + 15] = 1;

    visibleCount++;
  }

  return visibleCount;
}

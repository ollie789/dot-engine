# WebGPU Compute Runtime — Design Spec

## Goal

Use WebGPU compute shaders to offload SDF evaluation from the per-frame vertex shader to a one-shot compute dispatch. Results are read back to CPU and fed into the existing WebGL InstancedMesh. Automatic fallback to WebGL-only path on browsers without WebGPU.

## Why

The current vertex shader evaluates the full SDF tree for every dot every frame — including invisible dots culled by `dCoarse > 0.5`. For 300k dots with a complex SDF (nested booleans, metaballs), this is 10-20ms of GPU work per frame. Moving SDF evaluation to a compute pass means:

1. Each dot's position/scale/color is computed once (or on field change), not every frame
2. Only visible dots are written to the output buffer
3. The vertex shader becomes a trivial matrix read — nearly free
4. Displacement animation still runs per-frame in the compute shader (time uniform updates)

## Architecture

### Hybrid: WebGPU Compute + WebGL Render

```
WebGPU Compute Pass (per frame):
  → Evaluates SDF for all grid positions
  → Applies displacement (noise, curl, attract)
  → Outputs: position, scale, color, alpha per dot
  → Writes to GPUBuffer (storage)

CPU Bridge (per frame):
  → mapAsync to read storage buffer
  → Build instance matrices from position/scale
  → Write directly to mesh.instanceMatrix.array
  → Set mesh.count = visible dots only

WebGL Render Pass (per frame):
  → Existing InstancedMesh renders with trivial vertex shader
  → Fragment shader handles color/opacity as before
```

### File Structure

- Create: `packages/renderer/src/compute/WebGPUCompute.ts` — device init, pipeline creation, dispatch
- Create: `packages/renderer/src/compute/computeBridge.ts` — read results, write to InstancedMesh
- Modify: `packages/renderer/src/components/DotField.tsx` — use compute path when WebGPU available

### WebGPUCompute.ts

Manages the WebGPU lifecycle:

```ts
interface WebGPUComputeContext {
  device: GPUDevice;
  pipeline: GPUComputePipeline;
  uniformBuffer: GPUBuffer;
  storageBuffer: GPUBuffer;
  readBuffer: GPUBuffer;  // for mapAsync readback
  bindGroup: GPUBindGroup;
  totalDots: number;
}

async function initWebGPUCompute(wgslShader: string, totalDots: number): Promise<WebGPUComputeContext>
function dispatchCompute(ctx: WebGPUComputeContext, time: number, colors: {...}): void
async function readResults(ctx: WebGPUComputeContext): Promise<Float32Array>
function destroyCompute(ctx: WebGPUComputeContext): void
```

**Buffer layout** (per dot, 8 floats = 32 bytes):
- `position: vec3f` (12 bytes)
- `scale: f32` (4 bytes)
- `color: vec3f` (12 bytes)
- `alpha: f32` (4 bytes)

For 300k dots: 300,000 × 32 = 9.6MB storage buffer.

### computeBridge.ts

Converts compute output to InstancedMesh data:

```ts
function applyComputeResults(
  results: Float32Array,
  mesh: THREE.InstancedMesh,
  totalDots: number,
): number  // returns visible dot count
```

For each dot in the results buffer:
1. Skip if `scale ≈ 0` (culled by compute shader)
2. Build a 4×4 matrix: translate(position) × scale(scale)
3. Write directly to `mesh.instanceMatrix.array` at the correct offset
4. Return count of visible dots

### DotField Integration

When WebGPU is available and `backend !== 'webgl2'`:

1. On mount or field change: `initWebGPUCompute(compiledWgsl.computeShader, totalDots)`
2. Every frame in `useFrame`:
   - `dispatchCompute(ctx, clock.elapsedTime, { primary, accent })`
   - `const results = await readResults(ctx)`
   - `mesh.count = applyComputeResults(results, mesh, totalDots)`
   - `mesh.instanceMatrix.needsUpdate = true`
3. The vertex shader for the WebGL render pass is simplified — just reads the matrix (no SDF evaluation)
4. On unmount: `destroyCompute(ctx)`

### Simplified WebGL Vertex Shader (compute path)

When using the compute path, the vertex shader is trivial:

```glsl
varying float vFieldValue;
varying vec3 vPosition;

void main() {
  // Instance matrix already contains position + scale from compute
  vec3 worldPos = (instanceMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
  vFieldValue = 1.0;  // could encode in matrix w or separate attribute
  vPosition = worldPos;
}
```

### Fallback

`navigator.gpu` check at component mount:
- If WebGPU available: use compute path
- If not: use existing WebGL path (unchanged behavior)

The `backend` prop on DotField controls this:
- `'auto'`: use WebGPU if available
- `'webgpu'`: force WebGPU (throw if unavailable)
- `'webgl2'`: force WebGL (skip WebGPU even if available)

### Async Considerations

`readResults` uses `mapAsync` which is async. In the R3F `useFrame` loop, we can't await. Two approaches:

**Double-buffering:** Dispatch frame N's compute, read frame N-1's results. One frame of latency but no blocking. This is the standard approach for GPU readback.

The flow per frame:
1. Read previous frame's results (non-blocking — already resolved)
2. Apply to mesh
3. Dispatch current frame's compute
4. The mapAsync promise resolves before next frame

### Testing

- Unit test: `initWebGPUCompute` creates context with correct buffer sizes
- Unit test: `applyComputeResults` correctly builds matrices and returns visible count
- Integration test: compile WGSL + dispatch on real WebGPU device (only runs in browsers)

Since WebGPU is not available in Node.js/Vitest, the compute bridge (`applyComputeResults`) can be tested with mock Float32Array data. The WebGPU-specific code will need browser testing.

## Files

### New Files
- `packages/renderer/src/compute/WebGPUCompute.ts` — device, pipeline, dispatch, readback
- `packages/renderer/src/compute/computeBridge.ts` — Float32Array → InstancedMesh matrix writer
- `packages/renderer/__tests__/compute-bridge.test.ts` — unit tests for the bridge

### Modified Files
- `packages/renderer/src/components/DotField.tsx` — integrate compute path with fallback
- `packages/renderer/src/index.ts` — export compute utilities

## Scope

- Compute shader uses the existing WGSL output from `compileFieldWgsl`
- No changes to the WGSL compiler
- Fragment shader unchanged (colors come from the existing uniform path)
- No MorphField compute path (morph is WebGL-only for now)
- Double-buffered readback for zero-stall frames
- Automatic fallback to WebGL on unsupported browsers

## Performance Budget

| Operation | Cost (300k dots) |
|-----------|-----------------|
| Compute dispatch | ~1ms |
| mapAsync readback | ~1ms |
| CPU matrix build | ~0.5ms |
| WebGL instanced draw | ~2ms |
| **Total** | **~4.5ms** |

vs. current WebGL-only: ~15-20ms (vertex shader SDF evaluation dominates)

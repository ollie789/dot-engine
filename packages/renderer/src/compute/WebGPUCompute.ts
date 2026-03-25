/// <reference types="@webgpu/types" />

/**
 * WebGPU compute runtime for dot-engine.
 * Manages device, pipeline, buffers, and double-buffered readback.
 */

import { DOT_STRIDE } from './computeBridge.js';

export interface WebGPUComputeContext {
  device: GPUDevice;
  pipeline: GPUComputePipeline;
  uniformBuffer: GPUBuffer;
  storageBuffer: GPUBuffer;
  readBuffers: [GPUBuffer, GPUBuffer]; // double-buffered for async readback
  bindGroup: GPUBindGroup;
  totalDots: number;
  activeReadBuffer: 0 | 1;
  pendingRead: Promise<Float32Array> | null;
}

/** Uniform buffer size in bytes (must match WGSL Uniforms struct layout).
 *
 * struct Uniforms {
 *   time: f32,          // offset 0
 *   // pad 12 bytes to align next vec3f to 16
 *   resolution: vec3f,  // offset 16
 *   // pad 4 bytes
 *   bounds: vec3f,      // offset 32
 *   // pad 4 bytes
 *   colorPrimary: vec3f, // offset 48
 *   // pad 4 bytes
 *   colorAccent: vec3f,  // offset 64
 *   // pad 4 bytes
 * }
 * Total: 80 bytes
 */
const UNIFORM_BUFFER_SIZE = 80;

export async function initWebGPUCompute(
  wgslShader: string,
  totalDots: number,
): Promise<WebGPUComputeContext> {
  if (!navigator.gpu) {
    throw new Error('WebGPU not supported');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('Failed to get WebGPU adapter');
  }

  const device = await adapter.requestDevice();

  const storageSize = totalDots * DOT_STRIDE * 4; // 4 bytes per float

  // Create buffers
  const uniformBuffer = device.createBuffer({
    size: UNIFORM_BUFFER_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const storageBuffer = device.createBuffer({
    size: storageSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const readBuffers: [GPUBuffer, GPUBuffer] = [
    device.createBuffer({
      size: storageSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    }),
    device.createBuffer({
      size: storageSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    }),
  ];

  // Create compute pipeline
  const shaderModule = device.createShaderModule({ code: wgslShader });
  const pipeline = await device.createComputePipelineAsync({
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: 'main',
    },
  });

  // Create bind group
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: storageBuffer } },
    ],
  });

  return {
    device,
    pipeline,
    uniformBuffer,
    storageBuffer,
    readBuffers,
    bindGroup,
    totalDots,
    activeReadBuffer: 0,
    pendingRead: null,
  };
}

export function dispatchCompute(
  ctx: WebGPUComputeContext,
  time: number,
  resolution: [number, number, number],
  bounds: [number, number, number],
  colorPrimary: [number, number, number],
  colorAccent: [number, number, number],
): void {
  const { device, pipeline, uniformBuffer, storageBuffer, readBuffers, bindGroup, totalDots } = ctx;

  // Write uniforms (respecting WGSL struct alignment: vec3f fields at 16-byte boundaries)
  const uniformData = new Float32Array(UNIFORM_BUFFER_SIZE / 4);
  // time at offset 0 bytes = index 0
  uniformData[0] = time;
  // resolution at offset 16 bytes = index 4
  uniformData[4] = resolution[0];
  uniformData[5] = resolution[1];
  uniformData[6] = resolution[2];
  // bounds at offset 32 bytes = index 8
  uniformData[8] = bounds[0];
  uniformData[9] = bounds[1];
  uniformData[10] = bounds[2];
  // colorPrimary at offset 48 bytes = index 12
  uniformData[12] = colorPrimary[0];
  uniformData[13] = colorPrimary[1];
  uniformData[14] = colorPrimary[2];
  // colorAccent at offset 64 bytes = index 16
  uniformData[16] = colorAccent[0];
  uniformData[17] = colorAccent[1];
  uniformData[18] = colorAccent[2];

  device.queue.writeBuffer(uniformBuffer, 0, uniformData);

  // Dispatch compute
  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  const workgroups = Math.ceil(totalDots / 64); // matches @workgroup_size(64)
  passEncoder.dispatchWorkgroups(workgroups);
  passEncoder.end();

  // Copy storage -> active read buffer (double-buffered)
  const readIdx = ctx.activeReadBuffer;
  commandEncoder.copyBufferToBuffer(
    storageBuffer, 0,
    readBuffers[readIdx], 0,
    totalDots * DOT_STRIDE * 4,
  );

  device.queue.submit([commandEncoder.finish()]);

  // Start async read of current buffer
  const readBuffer = readBuffers[readIdx];
  ctx.pendingRead = readBuffer.mapAsync(GPUMapMode.READ).then(() => {
    const data = new Float32Array(readBuffer.getMappedRange().slice(0));
    readBuffer.unmap();
    return data;
  });

  // Flip for next frame
  ctx.activeReadBuffer = readIdx === 0 ? 1 : 0;
}

export async function readResults(ctx: WebGPUComputeContext): Promise<Float32Array | null> {
  if (!ctx.pendingRead) return null;
  const result = await ctx.pendingRead;
  ctx.pendingRead = null;
  return result;
}

export function destroyCompute(ctx: WebGPUComputeContext): void {
  ctx.uniformBuffer.destroy();
  ctx.storageBuffer.destroy();
  ctx.readBuffers[0].destroy();
  ctx.readBuffers[1].destroy();
  ctx.device.destroy();
}

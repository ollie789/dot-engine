let _imgFieldCounter = 0;

export interface ImageFieldData {
  /** RGBA pixel data as Float32Array (r,g,b,a per pixel, all 0-1) */
  pixels: Float32Array;
  width: number;
  height: number;
  textureId: string;
}

export async function loadImageForField(
  source: string,
  resolution?: number,
): Promise<ImageFieldData> {
  const res = resolution ?? 256;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = source;
  });

  const canvas = document.createElement('canvas');
  const aspect = img.naturalWidth / img.naturalHeight;
  canvas.width = res;
  canvas.height = Math.round(res / aspect);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Convert to Float32Array RGBA (0-1 range)
  const pixels = new Float32Array(canvas.width * canvas.height * 4);
  for (let i = 0; i < imageData.data.length; i++) {
    pixels[i] = imageData.data[i] / 255;
  }

  return {
    pixels,
    width: canvas.width,
    height: canvas.height,
    textureId: `imgfield_${++_imgFieldCounter}`,
  };
}

export function grabVideoFrame(
  video: HTMLVideoElement,
  resolution?: number,
): ImageFieldData {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    throw new Error('Video has no dimensions — metadata may not be loaded yet');
  }

  const res = resolution ?? 256;
  const canvas = document.createElement('canvas');
  const aspect = video.videoWidth / video.videoHeight;
  canvas.width = res;
  canvas.height = Math.round(res / aspect);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const pixels = new Float32Array(canvas.width * canvas.height * 4);
  for (let i = 0; i < imageData.data.length; i++) {
    pixels[i] = imageData.data[i] / 255;
  }

  return {
    pixels,
    width: canvas.width,
    height: canvas.height,
    textureId: `vidframe_${++_imgFieldCounter}`,
  };
}

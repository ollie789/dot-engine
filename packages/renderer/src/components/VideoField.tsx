import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { FieldRoot } from '@bigpuddle/dot-engine-core';
import { imageField } from '@bigpuddle/dot-engine-core';
import { DotField } from './DotField.js';
import type { LodOverride } from './LodBenchmark.js';

export interface VideoFieldProps {
  src: string;
  field: FieldRoot;
  colorPrimary?: string;
  colorAccent?: string;
  lod?: 'auto' | LodOverride;
}

export function VideoField({
  src,
  field: fieldDesc,
  colorPrimary,
  colorAccent,
  lod,
}: VideoFieldProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = document.createElement('video');
    video.src = src;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    const onCanPlay = () => {
      video.play().catch(() => {});
      setReady(true);
    };
    video.addEventListener('canplay', onCanPlay);
    videoRef.current = video;
    return () => {
      video.removeEventListener('canplay', onCanPlay);
      video.pause();
      video.src = '';
    };
  }, [src]);

  // Stable textureId for this video source
  const textureId = useMemo(() => `vidfield_${src}`, [src]);

  const videoTexture = useMemo(() => {
    if (!ready || !videoRef.current) return null;
    const tex = new THREE.VideoTexture(videoRef.current);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [ready]);

  useEffect(() => {
    return () => { videoTexture?.dispose(); };
  }, [videoTexture]);

  // Build field with imageField node
  const effectiveField = useMemo((): FieldRoot => {
    const imgNode = imageField(textureId);
    return {
      ...fieldDesc,
      children: [...fieldDesc.children, imgNode],
    };
  }, [fieldDesc, textureId]);

  const imageTextures = useMemo(() => {
    if (!videoTexture) return undefined;
    return { [textureId]: videoTexture };
  }, [videoTexture, textureId]);

  return (
    <DotField
      field={effectiveField}
      colorPrimary={colorPrimary}
      colorAccent={colorAccent}
      lod={lod}
      imageTextures={imageTextures}
    />
  );
}

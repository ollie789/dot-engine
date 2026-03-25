import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { DotField, DotFieldErrorBoundary, usePointerInfluence, ParticleSystem } from '@bigpuddle/dot-engine-renderer';
import type { Brand, BrandContext, ImageFieldData } from '@bigpuddle/dot-engine-brand';
import type { ParticleMode } from '@bigpuddle/dot-engine-brand';
import { imageField, shape, sphere } from '@bigpuddle/dot-engine-core';
import type { FieldRoot } from '@bigpuddle/dot-engine-core';
import type { OutputFormat } from '../formats';

/**
 * Convert the brand's SDF Float32Array into a THREE.DataTexture
 * that the DotField shader can sample.
 */
function createSdfTexture(
  sdfData: Float32Array,
  width: number,
  height: number,
): THREE.DataTexture {
  const tex = new THREE.DataTexture(
    sdfData,
    width,
    height,
    THREE.RedFormat,
    THREE.FloatType,
  );
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function useContainerSize(ref: React.RefObject<HTMLDivElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function computeCanvasRect(
  containerW: number,
  containerH: number,
  format: OutputFormat,
): { x: number; y: number; width: number; height: number } {
  if (format.aspect === 0 || containerW === 0 || containerH === 0) {
    return { x: 0, y: 0, width: containerW, height: containerH };
  }

  const containerAspect = containerW / containerH;
  let width: number, height: number;

  if (format.aspect > containerAspect) {
    // Format is wider than container — fit to width
    width = containerW;
    height = Math.round(containerW / format.aspect);
  } else {
    // Format is taller — fit to height
    height = containerH;
    width = Math.round(containerH * format.aspect);
  }

  return {
    x: Math.round((containerW - width) / 2),
    y: Math.round((containerH - height) / 2),
    width,
    height,
  };
}

interface SceneProps {
  brand: Brand | null;
  activeContext: BrandContext;
  pointerEnabled: boolean;
  colorPrimary: string;
  colorAccent: string;
  particleMode?: ParticleMode;
  particleSize?: number;
  imageData?: ImageFieldData | null;
  colorFromImage?: boolean;
  effectiveAspect: number;
  contextOptions?: Record<string, unknown>;
}

function Scene({
  brand,
  activeContext,
  pointerEnabled,
  colorPrimary,
  colorAccent,
  particleMode,
  particleSize,
  imageData,
  colorFromImage,
  effectiveAspect,
  contextOptions,
}: SceneProps) {
  const { camera } = useThree();
  const pointer = usePointerInfluence({ smoothing: 0.85, enabled: pointerEnabled });

  // Update camera aspect when effectiveAspect changes
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cam = camera as any;
    if (typeof cam.aspect !== 'undefined') {
      cam.aspect = effectiveAspect;
      cam.updateProjectionMatrix();
    }
  }, [camera, effectiveAspect]);

  const baseFieldRoot = useMemo(
    () => (brand ? brand.field(activeContext, { canvasAspect: effectiveAspect, ...contextOptions }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brand, activeContext, effectiveAspect, contextOptions],
  );

  // When imageData is present, inject an imageField node into the field children
  const fieldRoot = useMemo((): FieldRoot | null => {
    if (!baseFieldRoot) return null;
    if (!imageData) return baseFieldRoot;
    // When image is loaded, replace the logo SDF with a pass-all sphere
    // so only the image field drives dot visibility via brightness threshold
    const childrenWithoutShape = baseFieldRoot.children.filter(c => c.type !== 'shape');
    const imgNode = imageField(imageData.textureId, { colorFromImage: colorFromImage ?? true });
    return {
      ...baseFieldRoot,
      children: [
        shape(sphere(100)), // huge sphere — everything is "inside", image field handles visibility
        ...childrenWithoutShape,
        imgNode,
      ],
    };
  }, [baseFieldRoot, imageData, colorFromImage]);

  // Build textures map from the brand's processed logo
  const textures = useMemo(() => {
    if (!brand?.logo) return undefined;
    const { sdfTexture, width, height, textureId, sdfNode } = brand.logo;
    return {
      [textureId]: {
        texture: createSdfTexture(sdfTexture, width, height),
        depth: sdfNode.depth,
        aspectRatio: sdfNode.aspectRatio,
      },
    };
  }, [brand]);

  // Build image field DataTexture when imageData is provided
  const imageTextures = useMemo(() => {
    if (!imageData) return undefined;
    const tex = new THREE.DataTexture(
      imageData.pixels,
      imageData.width,
      imageData.height,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return { [imageData.textureId]: tex };
  }, [imageData]);

  const particleConfig = useMemo(
    () => brand && particleMode && particleMode !== 'none'
      ? brand.particles(particleMode)
      : null,
    [brand, particleMode],
  );

  if (!fieldRoot) return null;

  return (
    <>
      <ambientLight intensity={0.5} />
      <DotField
        field={fieldRoot}
        colorPrimary={colorPrimary}
        colorAccent={colorAccent}
        lod="auto"
        pointerPosition={pointerEnabled ? pointer.position : undefined}
        pointerStrength={pointerEnabled ? 0.4 : 0}
        textures={textures}
        imageTextures={imageTextures}
      />
      {particleConfig && (
        <ParticleSystem config={particleConfig} color={colorAccent} size={particleSize ?? 0.01} />
      )}
      <OrbitControls />
    </>
  );
}

export interface Canvas3DProps {
  brand: Brand | null;
  activeContext: BrandContext;
  pointerEnabled: boolean;
  colorPrimary: string;
  colorAccent: string;
  isLoading?: boolean;
  particleMode?: ParticleMode;
  particleSize?: number;
  imageData?: ImageFieldData | null;
  colorFromImage?: boolean;
  format: OutputFormat;
  contextOptions?: Record<string, unknown>;
}

export function Canvas3D({
  brand,
  activeContext,
  pointerEnabled,
  colorPrimary,
  colorAccent,
  isLoading,
  particleMode,
  particleSize,
  imageData,
  colorFromImage,
  format,
  contextOptions,
}: Canvas3DProps) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const containerSize = useContainerSize(containerRef);
  const canvasRect = computeCanvasRect(containerSize.width, containerSize.height, format);

  // The effective aspect ratio for the camera
  const effectiveAspect = format.aspect > 0
    ? format.aspect
    : containerSize.width / Math.max(containerSize.height, 1);

  // For locked formats, add overflow padding so dots bleed past the frame edge
  const overflowPx = format.aspect > 0 ? 60 : 0;
  const canvasStyle: React.CSSProperties = format.aspect > 0 && containerSize.width > 0
    ? {
        position: 'absolute',
        left: canvasRect.x - overflowPx,
        top: canvasRect.y - overflowPx,
        width: canvasRect.width + overflowPx * 2,
        height: canvasRect.height + overflowPx * 2,
      }
    : { position: 'absolute', inset: 0 };

  return (
    <div ref={containerRef} className="canvas-wrapper">
      {/* R3F canvas sized to frame + overflow bleed */}
      <div style={canvasStyle}>
        <DotFieldErrorBoundary onError={(err) => console.error('[configurator] Render error:', err)}>
          <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
            <Scene
              brand={brand}
              activeContext={activeContext}
              pointerEnabled={pointerEnabled}
              colorPrimary={colorPrimary}
              colorAccent={colorAccent}
              particleMode={particleMode}
              particleSize={particleSize}
              imageData={imageData}
              colorFromImage={colorFromImage}
              effectiveAspect={effectiveAspect}
              contextOptions={contextOptions}
            />
          </Canvas>
        </DotFieldErrorBoundary>
      </div>

      {/* Format frame overlay — only shown when aspect is locked */}
      {format.aspect > 0 && containerSize.width > 0 && (
        <>
          {/* Dark overlay outside the frame */}
          <div className="frame-overlay-top" style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: canvasRect.y,
            background: 'rgba(6, 6, 10, 0.7)',
            pointerEvents: 'none', zIndex: 15,
          }} />
          <div className="frame-overlay-bottom" style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: containerSize.height - canvasRect.y - canvasRect.height,
            background: 'rgba(6, 6, 10, 0.7)',
            pointerEvents: 'none', zIndex: 15,
          }} />
          <div className="frame-overlay-left" style={{
            position: 'absolute', top: canvasRect.y, left: 0,
            width: canvasRect.x,
            height: canvasRect.height,
            background: 'rgba(6, 6, 10, 0.7)',
            pointerEvents: 'none', zIndex: 15,
          }} />
          <div className="frame-overlay-right" style={{
            position: 'absolute', top: canvasRect.y, right: 0,
            width: containerSize.width - canvasRect.x - canvasRect.width,
            height: canvasRect.height,
            background: 'rgba(6, 6, 10, 0.7)',
            pointerEvents: 'none', zIndex: 15,
          }} />

          {/* Frame border — glowing HUD line */}
          <div className="frame-border" style={{
            position: 'absolute',
            top: canvasRect.y,
            left: canvasRect.x,
            width: canvasRect.width,
            height: canvasRect.height,
            border: '1px solid rgba(74, 158, 255, 0.2)',
            boxShadow: '0 0 8px rgba(74, 158, 255, 0.1)',
            pointerEvents: 'none',
            zIndex: 16,
          }} />
        </>
      )}

      {/* HUD corners — inside the frame when locked, or full canvas when responsive */}
      <div className="hud-corner tl" style={format.aspect > 0 ? { top: canvasRect.y + 12, left: canvasRect.x + 12 } : undefined} />
      <div className="hud-corner tr" style={format.aspect > 0 ? { top: canvasRect.y + 12, right: containerSize.width - canvasRect.x - canvasRect.width + 12 } : undefined} />
      <div className="hud-corner bl" style={format.aspect > 0 ? { bottom: containerSize.height - canvasRect.y - canvasRect.height + 12, left: canvasRect.x + 12 } : undefined} />
      <div className="hud-corner br" style={format.aspect > 0 ? { bottom: containerSize.height - canvasRect.y - canvasRect.height + 12, right: containerSize.width - canvasRect.x - canvasRect.width + 12 } : undefined} />

      <div className="hud-crosshair" />

      {isLoading && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'var(--accent-blue)',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          opacity: 0.6,
          zIndex: 20,
        }}>
          Processing...
        </div>
      )}
    </div>
  );
}

// Export computeCanvasRect for use in parent components (e.g. for dimension display)
export { computeCanvasRect };

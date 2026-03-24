import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { DotField, usePointerInfluence, ParticleSystem } from '@dot-engine/renderer';
import type { Brand, BrandContext, ParticlePresetName } from '@dot-engine/brand';
import { particlePresets } from '@dot-engine/brand';

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

interface SceneProps {
  brand: Brand | null;
  activeContext: BrandContext;
  pointerEnabled: boolean;
  colorPrimary: string;
  colorAccent: string;
  particlePreset?: ParticlePresetName | 'none';
}

function Scene({ brand, activeContext, pointerEnabled, colorPrimary, colorAccent, particlePreset }: SceneProps) {
  const pointer = usePointerInfluence({ smoothing: 0.85, enabled: pointerEnabled });
  const fieldRoot = useMemo(
    () => (brand ? brand.field(activeContext) : null),
    [brand, activeContext],
  );

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

  const particleConfig = particlePreset && particlePreset !== 'none'
    ? particlePresets[particlePreset]
    : null;

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
      />
      {particleConfig && (
        <ParticleSystem config={particleConfig} color={colorPrimary} />
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
  particlePreset?: ParticlePresetName | 'none';
}

export function Canvas3D({
  brand,
  activeContext,
  pointerEnabled,
  colorPrimary,
  colorAccent,
  isLoading,
  particlePreset,
}: Canvas3DProps) {
  return (
    <div className="canvas-wrapper">
      {/* HUD corner brackets */}
      <div className="hud-corner tl" />
      <div className="hud-corner tr" />
      <div className="hud-corner bl" />
      <div className="hud-corner br" />

      {/* Crosshair */}
      <div className="hud-crosshair" />

      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <Scene
          brand={brand}
          activeContext={activeContext}
          pointerEnabled={pointerEnabled}
          colorPrimary={colorPrimary}
          colorAccent={colorAccent}
          particlePreset={particlePreset}
        />
      </Canvas>

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

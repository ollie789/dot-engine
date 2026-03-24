import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { DotField, usePointerInfluence } from '@dot-engine/renderer';
import type { Brand, BrandContext } from '@dot-engine/brand';

interface SceneProps {
  brand: Brand | null;
  activeContext: BrandContext;
  pointerEnabled: boolean;
  colorPrimary: string;
  colorAccent: string;
}

function Scene({ brand, activeContext, pointerEnabled, colorPrimary, colorAccent }: SceneProps) {
  const pointer = usePointerInfluence({ smoothing: 0.85, enabled: pointerEnabled });
  const fieldRoot = useMemo(
    () => (brand ? brand.field(activeContext) : null),
    [brand, activeContext],
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
      />
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
}

export function Canvas3D({
  brand,
  activeContext,
  pointerEnabled,
  colorPrimary,
  colorAccent,
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
        />
      </Canvas>
    </div>
  );
}

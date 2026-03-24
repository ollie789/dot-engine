import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { FieldRoot } from '@dot-engine/core';
import { DotField } from './DotField.js';
import type { LodOverride } from './LodBenchmark.js';

export interface DotFieldCanvasProps {
  field: FieldRoot;
  colorPrimary?: string;
  colorAccent?: string;
  lod?: 'auto' | LodOverride;
  background?: string;
  className?: string;
  style?: React.CSSProperties;
  controls?: boolean;
  camera?: { position?: [number, number, number]; fov?: number };
}

export function DotFieldCanvas({
  field: fieldDesc,
  colorPrimary,
  colorAccent,
  lod,
  background = '#0a0a0a',
  className,
  style,
  controls = true,
  camera,
}: DotFieldCanvasProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%', background, ...style }}>
      <Canvas camera={{
        position: camera?.position ?? [0, 0, 3],
        fov: camera?.fov ?? 50,
      }}>
        <ambientLight intensity={0.5} />
        <DotField
          field={fieldDesc}
          colorPrimary={colorPrimary}
          colorAccent={colorAccent}
          lod={lod}
        />
        {controls && <OrbitControls />}
      </Canvas>
    </div>
  );
}

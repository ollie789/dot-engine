import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  field, shape, grid, animate,
  sphere, torus, smoothUnion, translate,
  displace, simplex3D, flowField3D,
} from '@dot-engine/core';
import { DotField } from '@dot-engine/renderer';

const demoField = field(
  shape(
    smoothUnion(
      sphere(0.6),
      translate(torus(0.4, 0.15), [0, 0.3, 0]),
      0.3,
    ),
  ),
  grid({ type: 'uniform', resolution: [40, 40, 40] }),
  displace(simplex3D({ scale: 3, speed: 0.2 }), { amount: 0.08 }),
  displace(flowField3D({ scale: 2, speed: 0.3 }), { amount: 0.05 }),
  animate({ speed: 0.5 }),
);

export function App() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <DotField
          field={demoField}
          colorPrimary="#2D7A4A"
          colorAccent="#E07A5F"
          lod="auto"
        />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { field, shape, grid, sphere, torus, smoothUnion, translate } from '@dot-engine/core';
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
);

export function App() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <DotField field={demoField} colorPrimary="#2D7A4A" colorAccent="#E07A5F" />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

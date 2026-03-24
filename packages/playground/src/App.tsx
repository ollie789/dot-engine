import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { presets } from '@dot-engine/core';
import { DotField, usePointerInfluence } from '@dot-engine/renderer';

const presetNames = Object.keys(presets) as (keyof typeof presets)[];

function Scene({ activePreset }: { activePreset: keyof typeof presets }) {
  const pointer = usePointerInfluence({ smoothing: 0.85 });

  return (
    <>
      <ambientLight intensity={0.5} />
      <DotField
        field={presets[activePreset]}
        colorPrimary="#2D7A4A"
        colorAccent="#E07A5F"
        lod="auto"
        pointerPosition={pointer.position}
        pointerStrength={0.5}
      />
      <OrbitControls />
    </>
  );
}

export function App() {
  const [active, setActive] = useState<keyof typeof presets>('organic');

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        gap: '8px',
        background: '#111',
        borderBottom: '1px solid #222',
      }}>
        <span style={{ color: '#666', fontSize: '13px', alignSelf: 'center', marginRight: '8px' }}>
          Preset:
        </span>
        {presetNames.map(name => (
          <button
            key={name}
            onClick={() => setActive(name)}
            style={{
              padding: '6px 16px',
              border: name === active ? '1px solid #4a9eff' : '1px solid #333',
              background: name === active ? '#1a3a5c' : '#222',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              textTransform: 'capitalize',
            }}
          >
            {name}
          </button>
        ))}
        <span style={{ color: '#555', fontSize: '11px', alignSelf: 'center', marginLeft: 'auto' }}>
          Move mouse over dots to interact
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
          <Scene activePreset={active} />
        </Canvas>
      </div>
    </div>
  );
}

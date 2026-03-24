import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { DotField, usePointerInfluence } from '@dot-engine/renderer';
import { defineBrand, text, type Brand, type BrandContext } from '@dot-engine/brand';

const contexts: BrandContext[] = ['logo', 'hero', 'loading', 'banner'];

function BrandScene({ brand, context }: { brand: Brand; context: BrandContext }) {
  const pointer = usePointerInfluence({ smoothing: 0.85 });
  const fieldRoot = brand.field(context);

  return (
    <>
      <ambientLight intensity={0.5} />
      <DotField
        field={fieldRoot}
        colorPrimary={brand.config.colors.primary}
        colorAccent={brand.config.colors.accent}
        lod="auto"
        pointerPosition={pointer.position}
        pointerStrength={0.3}
      />
      <OrbitControls />
    </>
  );
}

export function App() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [context, setContext] = useState<BrandContext>('logo');

  useEffect(() => {
    defineBrand({
      name: 'Demo Brand',
      logo: text('DOT', { font: 'system-ui', weight: 900 }),
      colors: { primary: '#4a9eff', accent: '#ff6b4a', background: '#0a0a0a' },
      personality: { energy: 0.6, organic: 0.7, density: 0.5 },
      motion: { speed: 0.4, style: 'flow' },
    }).then(setBrand);
  }, []);

  if (!brand) return <div style={{ color: '#666', padding: 40 }}>Loading brand...</div>;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', background: '#111', borderBottom: '1px solid #222' }}>
        <span style={{ color: '#666', fontSize: '13px', alignSelf: 'center', marginRight: '8px' }}>
          {brand.config.name} —
        </span>
        {contexts.map(c => (
          <button
            key={c}
            onClick={() => setContext(c)}
            style={{
              padding: '6px 16px',
              border: c === context ? '1px solid #4a9eff' : '1px solid #333',
              background: c === context ? '#1a3a5c' : '#222',
              color: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize',
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
          <BrandScene brand={brand} context={context} />
        </Canvas>
      </div>
    </div>
  );
}

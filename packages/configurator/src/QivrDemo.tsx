import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { DotField } from '@bigpuddle/dot-engine-renderer';
import type { Brand, BrandContext } from '@bigpuddle/dot-engine-brand';
import { qivrBrandPromise } from './qivr-brand';

const CONTEXTS: { id: BrandContext; label: string }[] = [
  { id: 'logo', label: 'Logo' },
  { id: 'hero', label: 'Hero' },
  { id: 'loading', label: 'Loading' },
  { id: 'banner', label: 'Banner' },
];

function QivrScene({ brand, context }: { brand: Brand; context: BrandContext }) {
  const fieldRoot = brand.field(context);

  return (
    <>
      <ambientLight intensity={0.5} />
      <DotField
        field={fieldRoot}
        colorPrimary={brand.config.colors.primary}
        colorAccent={brand.config.colors.accent}
        lod="auto"
      />
      <OrbitControls />
    </>
  );
}

export function QivrDemo() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [context, setContext] = useState<BrandContext>('logo');

  useEffect(() => {
    qivrBrandPromise.then(setBrand);
  }, []);

  if (!brand) {
    return (
      <div style={{
        width: '100%', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F4F2EE', fontFamily: "'Geist', system-ui, sans-serif",
        color: '#0B1526', fontSize: 13, letterSpacing: '0.1em',
      }}>
        Loading Qivr brand...
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: brand.config.colors.background ?? '#F4F2EE',
      fontFamily: "'Geist', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 32px',
        display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: '1px solid rgba(11, 21, 38, 0.08)',
      }}>
        <span style={{
          fontSize: 18, fontWeight: 300, color: '#0B1526',
          letterSpacing: '0.06em',
        }}>
          Qivr
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {CONTEXTS.map(c => (
            <button
              key={c.id}
              onClick={() => setContext(c.id)}
              style={{
                fontFamily: 'inherit', fontSize: 11, fontWeight: context === c.id ? 500 : 400,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '6px 16px',
                border: `1px solid ${context === c.id ? '#0B1526' : '#C8C5BE'}`,
                borderRadius: 2,
                background: context === c.id ? '#0B1526' : 'transparent',
                color: context === c.id ? '#F4F2EE' : '#0B1526',
                cursor: 'pointer',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 2.5], fov: 50 }}>
          <QivrScene brand={brand} context={context} />
        </Canvas>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 32px',
        fontSize: 10, color: '#999',
        fontFamily: "'Geist Mono', monospace",
        borderTop: '1px solid rgba(11, 21, 38, 0.06)',
        display: 'flex', gap: 24,
      }}>
        <span>energy 0.35</span>
        <span>organic 0.72</span>
        <span>density 0.62</span>
        <span>motion breathe @ 0.28x</span>
      </div>
    </div>
  );
}

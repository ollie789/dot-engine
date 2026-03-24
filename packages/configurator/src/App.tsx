import React, { useState, useEffect } from 'react';
import { defineBrand, text, type Brand, type BrandContext } from '@dot-engine/brand';
import type { MotionStyle, ParticlePresetName } from '@dot-engine/brand';
import { TopBar } from './components/TopBar';
import { Canvas3D } from './components/Canvas3D';
import { BottomBar } from './components/BottomBar';

export function App() {
  const [name, setName] = useState('DOT ENGINE');
  const [logoMode, setLogoMode] = useState<'text' | 'file'>('text');
  const [logoFont, setLogoFont] = useState('system-ui');
  const [colorPrimary, setColorPrimary] = useState('#4a9eff');
  const [colorAccent, setColorAccent] = useState('#ff6b4a');
  const [colorBackground, setColorBackground] = useState('#06060a');
  const [energy, setEnergy] = useState(0.6);
  const [organic, setOrganic] = useState(0.7);
  const [density, setDensity] = useState(0.5);
  const [motionStyle, setMotionStyle] = useState<MotionStyle>('flow');
  const [activeContext, setActiveContext] = useState<BrandContext>('logo');
  const [pointerEnabled, setPointerEnabled] = useState(true);
  const [particlePreset, setParticlePreset] = useState<ParticlePresetName | 'none'>('none');
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const b = await defineBrand({
          name,
          logo: text(name, { font: logoFont, weight: 900 }),
          colors: {
            primary: colorPrimary,
            accent: colorAccent,
            background: colorBackground,
          },
          personality: { energy, organic, density },
          motion: { speed: 0.4, style: motionStyle },
        });
        setBrand(b);
      } catch (e) {
        console.error('Brand creation failed:', e);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [name, logoFont, colorPrimary, colorAccent, colorBackground, energy, organic, density, motionStyle]);

  const config = {
    name,
    logoFont,
    colors: { primary: colorPrimary, accent: colorAccent, background: colorBackground },
    personality: { energy, organic, density },
    motion: { speed: 0.4, style: motionStyle },
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-void)',
        overflow: 'hidden',
      }}
    >
      <TopBar
        name={name}
        setName={setName}
        logoMode={logoMode}
        setLogoMode={setLogoMode}
        logoFont={logoFont}
        setLogoFont={setLogoFont}
        activeContext={activeContext}
        setActiveContext={setActiveContext}
      />

      <Canvas3D
        brand={brand}
        activeContext={activeContext}
        pointerEnabled={pointerEnabled}
        colorPrimary={colorPrimary}
        colorAccent={colorAccent}
        isLoading={isLoading}
        particlePreset={particlePreset}
      />

      <BottomBar
        colorPrimary={colorPrimary}
        setColorPrimary={setColorPrimary}
        colorAccent={colorAccent}
        setColorAccent={setColorAccent}
        colorBackground={colorBackground}
        setColorBackground={setColorBackground}
        energy={energy}
        setEnergy={setEnergy}
        organic={organic}
        setOrganic={setOrganic}
        density={density}
        setDensity={setDensity}
        motionStyle={motionStyle}
        setMotionStyle={setMotionStyle}
        pointerEnabled={pointerEnabled}
        setPointerEnabled={setPointerEnabled}
        particlePreset={particlePreset}
        setParticlePreset={setParticlePreset}
        config={config as Record<string, unknown>}
      />
    </div>
  );
}

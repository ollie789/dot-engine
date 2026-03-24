import React, { useState, useEffect, useRef, useMemo } from 'react';
import { defineBrand, text, type Brand, type BrandContext, type ImageFieldData } from '@dot-engine/brand';
import type { MotionStyle, ParticleMode } from '@dot-engine/brand';
import { TopBar } from './components/TopBar';
import { Canvas3D, computeCanvasRect } from './components/Canvas3D';
import { BottomBar } from './components/BottomBar';
import { LeftPanel } from './components/LeftPanel';
import { OUTPUT_FORMATS, type OutputFormat } from './formats';

export function App() {
  const [name, setName] = useState('DOT ENGINE');
  const [logoMode, setLogoMode] = useState<'text' | 'file' | 'image'>('text');
  const [logoFont, setLogoFont] = useState('system-ui');
  const [colorPrimary, setColorPrimary] = useState('#4a9eff');
  const [colorAccent, setColorAccent] = useState('#ff6b4a');
  const [colorBackground, setColorBackground] = useState('#06060a');
  const [energy, setEnergy] = useState(0.6);
  const [organic, setOrganic] = useState(0.7);
  const [density, setDensity] = useState(0.5);
  const [motionStyle, setMotionStyle] = useState<MotionStyle>('flow');
  const [motionSpeed, setMotionSpeed] = useState(0.4);
  const [displacementAmount, setDisplacementAmount] = useState(0.08);
  const [activeContext, setActiveContext] = useState<BrandContext>('logo');
  const [pointerEnabled, setPointerEnabled] = useState(true);
  const [particleMode, setParticleMode] = useState<ParticleMode>('none');
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageData, setImageData] = useState<ImageFieldData | null>(null);
  const [imageResolution, setImageResolution] = useState(128);
  const [colorFromImage, setColorFromImage] = useState(true);
  const [activeFormat, setActiveFormat] = useState<OutputFormat>(OUTPUT_FORMATS[0]);

  // Shape transforms
  const [twist, setTwist] = useState(0);
  const [bend, setBend] = useState(0);
  const [mirrorX, setMirrorX] = useState(false);
  const [mirrorY, setMirrorY] = useState(false);

  // Dot settings
  const [dotSizeMin, setDotSizeMin] = useState(0.002);
  const [dotSizeMax, setDotSizeMax] = useState(0.02);
  const [edgeSoftness, setEdgeSoftness] = useState(0.05);

  // Track canvas container size for dimension display in TopBar
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(canvasContainerRef.current);
    return () => ro.disconnect();
  }, []);

  const canvasRect = computeCanvasRect(containerSize.width, containerSize.height, activeFormat);

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
          motion: { speed: motionSpeed, style: motionStyle },
        });
        setBrand(b);
      } catch (e) {
        console.error('Brand creation failed:', e);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [name, logoFont, colorPrimary, colorAccent, colorBackground, energy, organic, density, motionStyle, motionSpeed]);

  // Context options include shape transforms and dot sizes
  const contextOptions = useMemo(() => ({
    twist: twist || undefined,
    bend: bend || undefined,
    mirrorX: mirrorX || undefined,
    mirrorY: mirrorY || undefined,
    dotSizeMin,
    dotSizeMax,
    edgeSoftness,
  }), [twist, bend, mirrorX, mirrorY, dotSizeMin, dotSizeMax, edgeSoftness]);

  const config = {
    name,
    logoFont,
    colors: { primary: colorPrimary, accent: colorAccent, background: colorBackground },
    personality: { energy, organic, density },
    motion: { speed: motionSpeed, style: motionStyle },
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
        activeContext={activeContext}
        setActiveContext={setActiveContext}
        formats={OUTPUT_FORMATS}
        activeFormat={activeFormat}
        setActiveFormat={setActiveFormat}
        canvasWidth={activeFormat.aspect > 0 ? canvasRect.width : undefined}
        canvasHeight={activeFormat.aspect > 0 ? canvasRect.height : undefined}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <LeftPanel
          logoMode={logoMode}
          setLogoMode={setLogoMode}
          logoFont={logoFont}
          setLogoFont={setLogoFont}
          colorPrimary={colorPrimary}
          setColorPrimary={setColorPrimary}
          colorAccent={colorAccent}
          setColorAccent={setColorAccent}
          colorBackground={colorBackground}
          setColorBackground={setColorBackground}
          onImageLoad={setImageData}
          energy={energy}
          setEnergy={setEnergy}
          organic={organic}
          setOrganic={setOrganic}
          density={density}
          setDensity={setDensity}
          motionStyle={motionStyle}
          setMotionStyle={setMotionStyle}
          motionSpeed={motionSpeed}
          setMotionSpeed={setMotionSpeed}
          displacementAmount={displacementAmount}
          setDisplacementAmount={setDisplacementAmount}
          twist={twist}
          setTwist={setTwist}
          bend={bend}
          setBend={setBend}
          mirrorX={mirrorX}
          setMirrorX={setMirrorX}
          mirrorY={mirrorY}
          setMirrorY={setMirrorY}
          dotSizeMin={dotSizeMin}
          setDotSizeMin={setDotSizeMin}
          dotSizeMax={dotSizeMax}
          setDotSizeMax={setDotSizeMax}
          edgeSoftness={edgeSoftness}
          setEdgeSoftness={setEdgeSoftness}
          particleMode={particleMode}
          setParticleMode={setParticleMode}
          hasImage={imageData !== null}
          imageResolution={imageResolution}
          setImageResolution={setImageResolution}
          colorFromImage={colorFromImage}
          setColorFromImage={setColorFromImage}
        />

        {/* Canvas container */}
        <div ref={canvasContainerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Canvas3D
            brand={brand}
            activeContext={activeContext}
            pointerEnabled={pointerEnabled}
            colorPrimary={colorPrimary}
            colorAccent={colorAccent}
            isLoading={isLoading}
            particleMode={particleMode}
            imageData={imageData}
            format={activeFormat}
            contextOptions={contextOptions}
          />
        </div>
      </div>

      <BottomBar
        pointerEnabled={pointerEnabled}
        setPointerEnabled={setPointerEnabled}
        colorBackground={colorBackground}
        config={config as Record<string, unknown>}
        brand={brand}
        activeContext={activeContext}
        format={activeFormat}
      />
    </div>
  );
}

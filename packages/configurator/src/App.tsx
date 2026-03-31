import React, { useState, useEffect, useRef, useMemo } from 'react';
import { defineBrand, text, type Brand, type BrandContext, type ImageFieldData, type LogoInput } from '@bigpuddle/dot-engine-brand';
import { TopBar } from './components/TopBar';
import { Canvas3D, computeCanvasRect } from './components/Canvas3D';
import { BottomBar } from './components/BottomBar';
import { LeftPanel } from './components/LeftPanel';
import { OUTPUT_FORMATS, type OutputFormat } from './formats';
import { VIBES, applyIntensity, type Vibe, type VibeSettings } from './vibes';

export function App() {
  const [name, setName] = useState('DOT ENGINE');
  const [logoMode, setLogoMode] = useState<'text' | 'file' | 'image'>('text');
  const [logoFont, setLogoFont] = useState('system-ui');
  const [colorPrimary, setColorPrimary] = useState('#4a9eff');
  const [colorAccent, setColorAccent] = useState('#ff6b4a');
  const [colorBackground, setColorBackground] = useState('#06060a');
  const [activeContext, setActiveContext] = useState<BrandContext>('logo');
  const [pointerEnabled, setPointerEnabled] = useState(true);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageData, setImageData] = useState<ImageFieldData | null>(null);
  const [fileLogoInput, setFileLogoInput] = useState<LogoInput | null>(null);
  const [imageResolution, setImageResolution] = useState(128);
  const [colorFromImage, setColorFromImage] = useState(true);
  const [fontWeight, setFontWeight] = useState(600);
  const [activeFormat, setActiveFormat] = useState<OutputFormat>(OUTPUT_FORMATS[0]);

  // Color mode and opacity
  const [colorMode, setColorMode] = useState<'depth' | 'position' | 'noise' | 'uniform'>('depth');
  const [opacityMin, setOpacityMin] = useState(0.3);
  const [opacityMax, setOpacityMax] = useState(1.0);
  const [opacityMode, setOpacityMode] = useState<'depth' | 'edgeGlow' | 'uniform'>('depth');
  const [contextShapes, setContextShapes] = useState<Partial<Record<BrandContext, string | null>>>({});

  // Clear image data when switching back to text mode
  useEffect(() => {
    if (logoMode === 'text') {
      setImageData(null);
    }
  }, [logoMode]);

  // Vibe system
  const [activeVibe, setActiveVibe] = useState<Vibe>(VIBES.find(v => v.name === 'organic')!);
  const [intensity, setIntensity] = useState(0.5);

  // Computed settings from vibe + intensity
  const computedSettings = useMemo(() => applyIntensity(activeVibe, intensity), [activeVibe, intensity]);

  // Advanced settings — start from computed, user can override
  const [advancedSettings, setAdvancedSettings] = useState<VibeSettings>(computedSettings);

  // Sync advanced settings when vibe or intensity changes (unless user has manually overridden)
  // We reset advanced settings whenever the vibe changes or intensity changes
  const prevVibeRef = useRef(activeVibe.name);
  const prevIntensityRef = useRef(intensity);
  useEffect(() => {
    if (prevVibeRef.current !== activeVibe.name || prevIntensityRef.current !== intensity) {
      setAdvancedSettings(computedSettings);
      prevVibeRef.current = activeVibe.name;
      prevIntensityRef.current = intensity;
    }
  }, [activeVibe, intensity, computedSettings]);

  // When vibe changes, apply its suggested colors
  function handleVibeChange(vibe: Vibe) {
    setActiveVibe(vibe);
    setColorPrimary(vibe.suggestedPrimary);
    setColorAccent(vibe.suggestedAccent);
  }

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
          logo: logoMode === 'file' && fileLogoInput
            ? fileLogoInput
            : text(name, { font: logoFont, weight: fontWeight }),
          colors: {
            primary: colorPrimary,
            accent: colorAccent,
            background: colorBackground,
          },
          personality: {
            energy: advancedSettings.energy,
            organic: advancedSettings.organic,
            density: advancedSettings.density,
          },
          motion: {
            speed: advancedSettings.motionSpeed,
            style: advancedSettings.motionStyle,
          },
          contextShapes: Object.fromEntries(
            Object.entries(contextShapes).filter(([, v]) => v != null)
          ),
        });
        setBrand(b);
      } catch (e) {
        console.error('Brand creation failed:', e);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [
    name,
    logoMode,
    fileLogoInput,
    logoFont,
    fontWeight,
    colorPrimary,
    colorAccent,
    colorBackground,
    advancedSettings.energy,
    advancedSettings.organic,
    advancedSettings.density,
    advancedSettings.motionStyle,
    advancedSettings.motionSpeed,
    contextShapes,
  ]);

  // Context options include shape transforms, dot sizes, color mode, and opacity
  const contextOptions = useMemo(() => ({
    twist: advancedSettings.twist || undefined,
    bend: advancedSettings.bend || undefined,
    mirrorX: advancedSettings.mirrorX || undefined,
    mirrorY: advancedSettings.mirrorY || undefined,
    dotSizeMin: advancedSettings.dotSizeMin,
    dotSizeMax: advancedSettings.dotSizeMax,
    edgeSoftness: advancedSettings.edgeSoftness,
    colorMode,
    opacityMin,
    opacityMax,
    opacityMode,
  }), [advancedSettings, colorMode, opacityMin, opacityMax, opacityMode]);

  const config = {
    name,
    logoFont,
    colors: { primary: colorPrimary, accent: colorAccent, background: colorBackground },
    personality: {
      energy: advancedSettings.energy,
      organic: advancedSettings.organic,
      density: advancedSettings.density,
    },
    motion: { speed: advancedSettings.motionSpeed, style: advancedSettings.motionStyle },
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
          name={name}
          setName={setName}
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
          onFileLoad={setFileLogoInput}
          activeVibe={activeVibe}
          setActiveVibe={handleVibeChange}
          intensity={intensity}
          setIntensity={setIntensity}
          advancedSettings={advancedSettings}
          setAdvancedSettings={setAdvancedSettings}
          hasImage={imageData !== null}
          imageResolution={imageResolution}
          setImageResolution={setImageResolution}
          colorFromImage={colorFromImage}
          setColorFromImage={setColorFromImage}
          fontWeight={fontWeight}
          setFontWeight={setFontWeight}
          colorMode={colorMode}
          setColorMode={setColorMode}
          opacityMin={opacityMin}
          setOpacityMin={setOpacityMin}
          opacityMax={opacityMax}
          setOpacityMax={setOpacityMax}
          opacityMode={opacityMode}
          setOpacityMode={setOpacityMode}
          activeContext={activeContext}
          contextShapes={contextShapes}
          setContextShapes={setContextShapes}
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
            particleMode={advancedSettings.particleMode}
            particleSize={(advancedSettings.dotSizeMax ?? 0.015) * 2.5}
            imageData={imageData}
            colorFromImage={colorFromImage}
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

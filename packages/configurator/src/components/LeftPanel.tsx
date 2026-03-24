import React, { useRef } from 'react';
import { ColorSwatch } from './ColorSwatch';
import { Slider } from './Slider';
import { loadImageForField } from '@dot-engine/brand';
import type { MotionStyle, ImageFieldData } from '@dot-engine/brand';
import type { ParticleMode } from '@dot-engine/brand';

const FONTS = [
  { value: 'system-ui', label: 'system-ui' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'serif', label: 'serif' },
];

const MOTION_STYLES: MotionStyle[] = ['flow', 'breathe', 'pulse', 'none'];
const PARTICLE_MODES: ParticleMode[] = ['none', 'ambient', 'burst', 'rising', 'edges'];

export interface LeftPanelProps {
  // Brand identity
  logoMode: 'text' | 'file' | 'image';
  setLogoMode: (m: 'text' | 'file' | 'image') => void;
  logoFont: string;
  setLogoFont: (f: string) => void;
  colorPrimary: string;
  setColorPrimary: (c: string) => void;
  colorAccent: string;
  setColorAccent: (c: string) => void;
  colorBackground: string;
  setColorBackground: (c: string) => void;
  onImageLoad: (data: ImageFieldData) => void;

  // Personality
  energy: number;
  setEnergy: (v: number) => void;
  organic: number;
  setOrganic: (v: number) => void;
  density: number;
  setDensity: (v: number) => void;

  // Motion
  motionStyle: MotionStyle;
  setMotionStyle: (s: MotionStyle) => void;
  motionSpeed: number;
  setMotionSpeed: (v: number) => void;
  displacementAmount: number;
  setDisplacementAmount: (v: number) => void;

  // Shape transforms
  twist: number;
  setTwist: (v: number) => void;
  bend: number;
  setBend: (v: number) => void;
  mirrorX: boolean;
  setMirrorX: (v: boolean) => void;
  mirrorY: boolean;
  setMirrorY: (v: boolean) => void;

  // Dots
  dotSizeMin: number;
  setDotSizeMin: (v: number) => void;
  dotSizeMax: number;
  setDotSizeMax: (v: number) => void;
  edgeSoftness: number;
  setEdgeSoftness: (v: number) => void;

  // Particles
  particleMode: ParticleMode;
  setParticleMode: (m: ParticleMode) => void;

  // Image
  hasImage: boolean;
  imageResolution: number;
  setImageResolution: (r: number) => void;
  colorFromImage: boolean;
  setColorFromImage: (v: boolean) => void;
}

export function LeftPanel({
  logoMode,
  setLogoMode,
  logoFont,
  setLogoFont,
  colorPrimary,
  setColorPrimary,
  colorAccent,
  setColorAccent,
  colorBackground,
  setColorBackground,
  onImageLoad,
  energy,
  setEnergy,
  organic,
  setOrganic,
  density,
  setDensity,
  motionStyle,
  setMotionStyle,
  motionSpeed,
  setMotionSpeed,
  displacementAmount,
  setDisplacementAmount,
  twist,
  setTwist,
  bend,
  setBend,
  mirrorX,
  setMirrorX,
  mirrorY,
  setMirrorY,
  dotSizeMin,
  setDotSizeMin,
  dotSizeMax,
  setDotSizeMax,
  edgeSoftness,
  setEdgeSoftness,
  particleMode,
  setParticleMode,
  hasImage,
  imageResolution,
  setImageResolution,
  colorFromImage,
  setColorFromImage,
}: LeftPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const data = await loadImageForField(url, imageResolution);
      onImageLoad(data);
      setLogoMode('image');
    } catch (err) {
      console.error('Failed to load image for field:', err);
    } finally {
      URL.revokeObjectURL(url);
      e.target.value = '';
    }
  }

  return (
    <div className="left-panel">
      {/* Brand Identity */}
      <div className="panel-section">
        <div className="section-title" style={{ color: 'var(--accent-blue)' }}>Identity</div>

        {/* Logo mode pills */}
        <div className="input-row" style={{ marginBottom: 8 }}>
          <span className="panel-label">Logo</span>
          <div className="mini-pills">
            <button
              className={`mini-pill${logoMode === 'text' ? ' active' : ''}`}
              onClick={() => setLogoMode('text')}
            >
              Text
            </button>
            <button
              className={`mini-pill${logoMode === 'file' ? ' active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              File
            </button>
            <button
              className={`mini-pill${logoMode === 'image' ? ' active' : ''}`}
              onClick={() => imageInputRef.current?.click()}
            >
              Image
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,.png,.jpg"
          style={{ display: 'none' }}
          onChange={() => setLogoMode('file')}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept=".png,.jpg,.webp"
          style={{ display: 'none' }}
          onChange={handleImageChange}
        />

        {/* Font dropdown (text mode only) */}
        {logoMode === 'text' && (
          <div className="input-row" style={{ marginBottom: 8 }}>
            <span className="panel-label">Font</span>
            <select
              className="panel-select"
              value={logoFont}
              onChange={e => setLogoFont(e.target.value)}
              aria-label="Logo font"
            >
              {FONTS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Color swatches */}
        <div className="panel-label" style={{ marginBottom: 6 }}>Colors</div>
        <div className="panel-swatches">
          <ColorSwatch color={colorPrimary} onChange={setColorPrimary} label="primary" />
          <ColorSwatch color={colorAccent} onChange={setColorAccent} label="accent" />
          <ColorSwatch color={colorBackground} onChange={setColorBackground} label="bg" />
        </div>
      </div>

      {/* Personality */}
      <div className="panel-section">
        <div className="section-title" style={{ color: 'var(--accent-orange)' }}>Personality</div>
        <Slider label="Energy" value={energy} onChange={setEnergy} accent="var(--accent-orange)" />
        <Slider label="Organic" value={organic} onChange={setOrganic} accent="var(--accent-green)" />
        <Slider label="Density" value={density} onChange={setDensity} accent="var(--accent-blue)" />
      </div>

      {/* Motion */}
      <div className="panel-section">
        <div className="section-title" style={{ color: 'var(--accent-green)' }}>Motion</div>
        <div className="input-row" style={{ marginBottom: 8 }}>
          <span className="panel-label">Style</span>
          <div className="mini-pills">
            {MOTION_STYLES.map(s => (
              <button
                key={s}
                className={`mini-pill${motionStyle === s ? ' active' : ''}`}
                onClick={() => setMotionStyle(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <Slider label="Speed" value={motionSpeed} onChange={setMotionSpeed} accent="var(--accent-green)" min={0} max={1} />
        <Slider label="Displacement" value={displacementAmount} onChange={setDisplacementAmount} accent="var(--accent-green)" min={0} max={0.3} />
      </div>

      {/* Shape Transforms */}
      <div className="panel-section">
        <div className="section-title" style={{ color: 'var(--accent-blue)' }}>Transforms</div>
        <Slider label="Twist" value={twist} onChange={setTwist} accent="var(--accent-blue)" min={0} max={3} />
        <Slider label="Bend" value={bend} onChange={setBend} accent="var(--accent-blue)" min={0} max={3} />
        <div className="toggle-row">
          <span className="panel-label">Mirror X</span>
          <button
            className={`panel-toggle${mirrorX ? ' active' : ''}`}
            onClick={() => setMirrorX(!mirrorX)}
            aria-label="Mirror X toggle"
          >
            {mirrorX ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="toggle-row">
          <span className="panel-label">Mirror Y</span>
          <button
            className={`panel-toggle${mirrorY ? ' active' : ''}`}
            onClick={() => setMirrorY(!mirrorY)}
            aria-label="Mirror Y toggle"
          >
            {mirrorY ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Dots */}
      <div className="panel-section">
        <div className="section-title" style={{ color: 'var(--accent-orange)' }}>Dots</div>
        <Slider label="Size min" value={dotSizeMin} onChange={setDotSizeMin} accent="var(--accent-orange)" min={0.001} max={0.01} />
        <Slider label="Size max" value={dotSizeMax} onChange={setDotSizeMax} accent="var(--accent-orange)" min={0.005} max={0.05} />
        <Slider label="Edge softness" value={edgeSoftness} onChange={setEdgeSoftness} accent="var(--accent-orange)" min={0.01} max={0.2} />
      </div>

      {/* Particles */}
      <div className="panel-section">
        <div className="section-title" style={{ color: 'var(--accent-green)' }}>Particles</div>
        <div className="mini-pills" style={{ flexWrap: 'wrap', gap: 3 }}>
          {PARTICLE_MODES.map(m => (
            <button
              key={m}
              className={`mini-pill${particleMode === m ? ' active' : ''}`}
              onClick={() => setParticleMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Image Source (only when image is loaded) */}
      {hasImage && (
        <div className="panel-section">
          <div className="section-title" style={{ color: 'var(--accent-blue)' }}>Image Source</div>
          <div className="input-row" style={{ marginBottom: 8 }}>
            <span className="panel-label">Resolution</span>
            <select
              className="panel-select"
              value={imageResolution}
              onChange={e => setImageResolution(Number(e.target.value))}
              aria-label="Image resolution"
            >
              {[64, 128, 256, 512].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="toggle-row">
            <span className="panel-label">Color from image</span>
            <button
              className={`panel-toggle${colorFromImage ? ' active' : ''}`}
              onClick={() => setColorFromImage(!colorFromImage)}
              aria-label="Color from image toggle"
            >
              {colorFromImage ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

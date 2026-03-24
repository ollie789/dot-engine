import React, { useRef, useState } from 'react';
import { ColorSwatch } from './ColorSwatch';
import { Slider } from './Slider';
import { loadImageForField } from '@dot-engine/brand';
import type { MotionStyle, ImageFieldData } from '@dot-engine/brand';
import type { ParticleMode } from '@dot-engine/brand';
import { VIBES, type Vibe, type VibeSettings } from '../vibes';

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
  // Brand
  name: string;
  setName: (n: string) => void;
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

  // Vibe system
  activeVibe: Vibe;
  setActiveVibe: (v: Vibe) => void;
  intensity: number;
  setIntensity: (v: number) => void;

  // Advanced (derived from vibe + intensity, but overridable)
  advancedSettings: VibeSettings;
  setAdvancedSettings: (s: VibeSettings) => void;

  // Image
  hasImage: boolean;
  imageResolution: number;
  setImageResolution: (r: number) => void;
  colorFromImage: boolean;
  setColorFromImage: (v: boolean) => void;
}

export function LeftPanel({
  name,
  setName,
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
  activeVibe,
  setActiveVibe,
  intensity,
  setIntensity,
  advancedSettings,
  setAdvancedSettings,
  hasImage,
  imageResolution,
  setImageResolution,
  colorFromImage,
  setColorFromImage,
}: LeftPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
        <div className="section-title" style={{ color: 'var(--accent-blue)' }}>Brand</div>

        {/* Brand name input */}
        <div className="input-row" style={{ marginBottom: 8 }}>
          <span className="panel-label">Name</span>
          <input
            className="brand-name-input"
            style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.04em', textTransform: 'none', padding: '2px 6px' }}
            value={name}
            onChange={e => setName(e.target.value)}
            aria-label="Brand name"
          />
        </div>

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

      {/* Vibe Picker */}
      <div className="panel-section">
        <div className="section-title" style={{ color: 'var(--accent-orange)' }}>Vibe</div>
        <div className="vibe-grid">
          {VIBES.map(vibe => (
            <button
              key={vibe.name}
              className={`vibe-card${activeVibe.name === vibe.name ? ' active' : ''}`}
              onClick={() => setActiveVibe(vibe)}
              title={vibe.description}
            >
              <span className="vibe-icon">{vibe.icon}</span>
              <span className="vibe-name">{vibe.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Intensity Slider */}
      <div className="panel-section">
        <div className="section-title" style={{ color: 'var(--text-muted)' }}>Intensity</div>
        <div className="intensity-slider-wrapper">
          <div className="slider-header">
            <span className="slider-label">Intensity</span>
            <span className="slider-value">{intensity.toFixed(2)}</span>
          </div>
          <div className="slider-track-wrapper intensity-track">
            <div
              className="slider-fill"
              style={{
                width: `${intensity * 100}%`,
                background: 'linear-gradient(90deg, rgba(74,158,255,0.5), var(--accent-blue))',
              }}
            />
            <input
              type="range"
              className="slider-input"
              min={0}
              max={1}
              step={0.01}
              value={intensity}
              onChange={e => setIntensity(parseFloat(e.target.value))}
              style={{ cursor: 'pointer' }}
              aria-label="Intensity"
            />
          </div>
        </div>
      </div>

      {/* Advanced (collapsible) */}
      <div className="panel-section">
        <button
          className="advanced-toggle"
          onClick={() => setAdvancedOpen(o => !o)}
          aria-expanded={advancedOpen}
        >
          <span style={{ fontSize: 9 }}>{advancedOpen ? '▾' : '▸'}</span>
          Advanced
        </button>

        {advancedOpen && (
          <div className="advanced-content">
            <Slider
              label="Energy"
              value={advancedSettings.energy}
              onChange={v => setAdvancedSettings({ ...advancedSettings, energy: v })}
              accent="var(--accent-orange)"
            />
            <Slider
              label="Organic"
              value={advancedSettings.organic}
              onChange={v => setAdvancedSettings({ ...advancedSettings, organic: v })}
              accent="var(--accent-green)"
            />
            <Slider
              label="Density"
              value={advancedSettings.density}
              onChange={v => setAdvancedSettings({ ...advancedSettings, density: v })}
              accent="var(--accent-blue)"
            />

            {/* Motion style */}
            <div className="input-row" style={{ marginBottom: 8 }}>
              <span className="panel-label">Style</span>
              <div className="mini-pills">
                {MOTION_STYLES.map(s => (
                  <button
                    key={s}
                    className={`mini-pill${advancedSettings.motionStyle === s ? ' active' : ''}`}
                    onClick={() => setAdvancedSettings({ ...advancedSettings, motionStyle: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <Slider
              label="Speed"
              value={advancedSettings.motionSpeed}
              onChange={v => setAdvancedSettings({ ...advancedSettings, motionSpeed: v })}
              accent="var(--accent-green)"
              min={0}
              max={1}
            />
            <Slider
              label="Twist"
              value={advancedSettings.twist}
              onChange={v => setAdvancedSettings({ ...advancedSettings, twist: v })}
              accent="var(--accent-blue)"
              min={0}
              max={3}
            />
            <Slider
              label="Bend"
              value={advancedSettings.bend}
              onChange={v => setAdvancedSettings({ ...advancedSettings, bend: v })}
              accent="var(--accent-blue)"
              min={0}
              max={3}
            />

            {/* Mirror toggles */}
            <div className="toggle-row">
              <span className="panel-label">Mirror X</span>
              <button
                className={`panel-toggle${advancedSettings.mirrorX ? ' active' : ''}`}
                onClick={() => setAdvancedSettings({ ...advancedSettings, mirrorX: !advancedSettings.mirrorX })}
                aria-label="Mirror X toggle"
              >
                {advancedSettings.mirrorX ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="toggle-row">
              <span className="panel-label">Mirror Y</span>
              <button
                className={`panel-toggle${advancedSettings.mirrorY ? ' active' : ''}`}
                onClick={() => setAdvancedSettings({ ...advancedSettings, mirrorY: !advancedSettings.mirrorY })}
                aria-label="Mirror Y toggle"
              >
                {advancedSettings.mirrorY ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Dot sizes */}
            <Slider
              label="Size min"
              value={advancedSettings.dotSizeMin}
              onChange={v => setAdvancedSettings({ ...advancedSettings, dotSizeMin: v })}
              accent="var(--accent-orange)"
              min={0.001}
              max={0.01}
            />
            <Slider
              label="Size max"
              value={advancedSettings.dotSizeMax}
              onChange={v => setAdvancedSettings({ ...advancedSettings, dotSizeMax: v })}
              accent="var(--accent-orange)"
              min={0.005}
              max={0.05}
            />
            <Slider
              label="Edge softness"
              value={advancedSettings.edgeSoftness}
              onChange={v => setAdvancedSettings({ ...advancedSettings, edgeSoftness: v })}
              accent="var(--accent-orange)"
              min={0.01}
              max={0.2}
            />

            {/* Particle mode */}
            <div className="panel-label" style={{ marginBottom: 4 }}>Particles</div>
            <div className="mini-pills" style={{ flexWrap: 'wrap', gap: 3 }}>
              {PARTICLE_MODES.map(m => (
                <button
                  key={m}
                  className={`mini-pill${advancedSettings.particleMode === m ? ' active' : ''}`}
                  onClick={() => setAdvancedSettings({ ...advancedSettings, particleMode: m })}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
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

import React, { useState } from 'react';
import { ColorSwatch } from './ColorSwatch';
import { Slider } from './Slider';
import type { MotionStyle, ParticlePresetName } from '@dot-engine/brand';

const MOTION_STYLES: MotionStyle[] = ['flow', 'breathe', 'pulse', 'none'];
const PARTICLE_OPTIONS: Array<ParticlePresetName | 'none'> = ['none', 'ambientDrift', 'burst', 'rising'];

export interface BottomBarProps {
  colorPrimary: string;
  setColorPrimary: (c: string) => void;
  colorAccent: string;
  setColorAccent: (c: string) => void;
  colorBackground: string;
  setColorBackground: (c: string) => void;
  energy: number;
  setEnergy: (v: number) => void;
  organic: number;
  setOrganic: (v: number) => void;
  density: number;
  setDensity: (v: number) => void;
  motionStyle: MotionStyle;
  setMotionStyle: (s: MotionStyle) => void;
  pointerEnabled: boolean;
  setPointerEnabled: (e: boolean) => void;
  particlePreset: ParticlePresetName | 'none';
  setParticlePreset: (p: ParticlePresetName | 'none') => void;
  config: Record<string, unknown>;
}

export function BottomBar({
  colorPrimary,
  setColorPrimary,
  colorAccent,
  setColorAccent,
  colorBackground,
  setColorBackground,
  energy,
  setEnergy,
  organic,
  setOrganic,
  density,
  setDensity,
  motionStyle,
  setMotionStyle,
  pointerEnabled,
  setPointerEnabled,
  particlePreset,
  setParticlePreset,
  config,
}: BottomBarProps) {
  const [applyLabel, setApplyLabel] = useState('Apply');

  async function handleApply() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setApplyLabel('Copied!');
      setTimeout(() => setApplyLabel('Apply'), 1500);
    } catch {
      console.error('Clipboard write failed');
    }
  }

  function handleExport() {
    alert('Export coming soon');
  }

  return (
    <div className="bottom-bar">
      {/* Color swatches */}
      <div className="color-swatches">
        <ColorSwatch color={colorPrimary} onChange={setColorPrimary} label="primary" />
        <ColorSwatch color={colorAccent} onChange={setColorAccent} label="accent" />
        <ColorSwatch color={colorBackground} onChange={setColorBackground} label="bg" />
      </div>

      <div className="hud-separator" />

      {/* Personality sliders */}
      <div className="sliders-group">
        <Slider
          label="Energy"
          value={energy}
          onChange={setEnergy}
          accent="var(--accent-blue)"
        />
        <Slider
          label="Organic"
          value={organic}
          onChange={setOrganic}
          accent="var(--accent-green)"
        />
        <Slider
          label="Density"
          value={density}
          onChange={setDensity}
          accent="var(--accent-orange)"
        />
      </div>

      <div className="hud-separator" />

      {/* Motion style pills */}
      <div className="motion-pills">
        {MOTION_STYLES.map(s => (
          <button
            key={s}
            className={`motion-pill${motionStyle === s ? ' active' : ''}`}
            onClick={() => setMotionStyle(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="hud-separator" />

      {/* Particle effect pills */}
      <div className="motion-pills">
        {PARTICLE_OPTIONS.map(p => (
          <button
            key={p}
            className={`motion-pill${particlePreset === p ? ' active' : ''}`}
            onClick={() => setParticlePreset(p)}
            title={p === 'none' ? 'No particles' : `Particles: ${p}`}
          >
            {p === 'none' ? 'no fx' : p}
          </button>
        ))}
      </div>

      <div className="hud-separator" />

      {/* Pointer toggle */}
      <button
        className={`pointer-toggle${pointerEnabled ? ' active' : ''}`}
        onClick={() => setPointerEnabled(!pointerEnabled)}
        title={pointerEnabled ? 'Disable pointer influence' : 'Enable pointer influence'}
        aria-label="Toggle pointer influence"
      >
        ⊕
      </button>

      {/* Right-side actions */}
      <div className="bottom-bar-actions">
        <button className="action-btn" onClick={handleExport}>
          Export
        </button>
        <button
          className={`action-btn primary${applyLabel === 'Copied!' ? ' flash' : ''}`}
          onClick={handleApply}
        >
          {applyLabel}
        </button>
      </div>
    </div>
  );
}

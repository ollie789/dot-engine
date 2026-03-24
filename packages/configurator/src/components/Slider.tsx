import React from 'react';

export interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: string;
  min?: number;
  max?: number;
}

export function Slider({ label, value, onChange, accent, min = 0, max = 1 }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="slider-wrapper">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{value.toFixed(2)}</span>
      </div>
      <div className="slider-track-wrapper">
        <div
          className="slider-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accent}88, ${accent})`,
          }}
        />
        <input
          type="range"
          className="slider-input"
          min={min}
          max={max}
          step={0.01}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ cursor: 'pointer' }}
        />
      </div>
    </div>
  );
}

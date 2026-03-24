import React, { useRef } from 'react';

export interface ColorSwatchProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  active?: boolean;
}

export function ColorSwatch({ color, onChange, label, active }: ColorSwatchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="color-swatch-wrapper">
      <div
        className={`color-swatch${active ? ' active' : ''}`}
        style={{ background: color }}
        onClick={() => inputRef.current?.click()}
        title={label ? `${label}: ${color}` : color}
      />
      <input
        ref={inputRef}
        type="color"
        className="hidden-color-input"
        value={color}
        onChange={e => onChange(e.target.value)}
      />
      {label && <span className="color-swatch-label">{label}</span>}
    </div>
  );
}

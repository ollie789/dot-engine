import React, { useState, useRef } from 'react';

export interface ColorSwatchProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  active?: boolean;
}

export function ColorSwatch({ color, onChange, label, active }: ColorSwatchProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(color);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    let hex = inputValue.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onChange(hex);
    }
    setEditing(false);
  };

  return (
    <div className="color-swatch-wrapper">
      {label && <span className="color-swatch-label">{label}</span>}
      <div
        className={`color-swatch${active ? ' active' : ''}`}
        style={{ background: color }}
        onClick={() => { setInputValue(color); setEditing(!editing); }}
        onDoubleClick={() => colorInputRef.current?.click()}
        title={label ? `${label}: ${color}` : color}
      />
      <input
        ref={colorInputRef}
        type="color"
        className="hidden-color-input"
        value={color}
        onChange={e => onChange(e.target.value)}
      />
      {editing && (
        <input
          className="color-hex-input"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
          spellCheck={false}
          maxLength={7}
        />
      )}
    </div>
  );
}

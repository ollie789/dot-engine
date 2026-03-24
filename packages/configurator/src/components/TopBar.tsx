import React from 'react';
import type { BrandContext } from '@bigpuddle/dot-engine-brand';
import type { OutputFormat } from '../formats';

const ALL_CONTEXTS: BrandContext[] = ['logo', 'hero', 'loading', 'banner', 'data'];

export interface TopBarProps {
  name: string;
  setName: (n: string) => void;
  activeContext: BrandContext;
  setActiveContext: (c: BrandContext) => void;
  formats: OutputFormat[];
  activeFormat: OutputFormat;
  setActiveFormat: (f: OutputFormat) => void;
  canvasWidth?: number;
  canvasHeight?: number;
  dotCount?: number;
}

export function TopBar({
  name,
  setName,
  activeContext,
  setActiveContext,
  formats,
  activeFormat,
  setActiveFormat,
  canvasWidth,
  canvasHeight,
  dotCount,
}: TopBarProps) {
  return (
    <div className="top-bar">
      <div className="pulse-dot" />

      <input
        className="brand-name-input"
        value={name}
        onChange={e => setName(e.target.value)}
        size={Math.max(name.length, 8)}
        spellCheck={false}
        aria-label="Brand name"
      />

      <div className="hud-separator" />

      <div className="context-tabs">
        {ALL_CONTEXTS.map(ctx => (
          <button
            key={ctx}
            className={`context-tab${activeContext === ctx ? ' active' : ''}`}
            onClick={() => setActiveContext(ctx)}
          >
            {ctx}
          </button>
        ))}
      </div>

      <div className="hud-separator" />

      {/* Format pills */}
      <div className="format-pills">
        {formats.map(f => (
          <button
            key={f.name}
            className={`format-pill${activeFormat.name === f.name ? ' active' : ''}`}
            onClick={() => setActiveFormat(f)}
            title={f.label}
          >
            {f.icon}
          </button>
        ))}
      </div>

      <div className="top-bar-meta">
        {activeFormat.aspect > 0 && canvasWidth && canvasHeight && (
          <div className="meta-item">
            <span className="meta-value">{canvasWidth}×{canvasHeight}</span>
          </div>
        )}
        {dotCount !== undefined && (
          <div className="meta-item">
            <span className="meta-label">dots</span>
            <span className="meta-value">{dotCount.toLocaleString()}</span>
          </div>
        )}
        <div className="meta-item">
          <span className="meta-value">v0.9</span>
        </div>
      </div>
    </div>
  );
}

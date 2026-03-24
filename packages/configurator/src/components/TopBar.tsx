import React, { useRef } from 'react';
import type { BrandContext, ImageFieldData } from '@dot-engine/brand';
import { loadImageForField } from '@dot-engine/brand';

const ALL_CONTEXTS: BrandContext[] = ['logo', 'hero', 'loading', 'banner', 'data'];

const FONTS = [
  { value: 'system-ui', label: 'system-ui' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'serif', label: 'serif' },
];

export interface TopBarProps {
  name: string;
  setName: (n: string) => void;
  logoMode: 'text' | 'file';
  setLogoMode: (m: 'text' | 'file') => void;
  logoFont: string;
  setLogoFont: (f: string) => void;
  activeContext: BrandContext;
  setActiveContext: (c: BrandContext) => void;
  dotCount?: number;
  onImageLoad?: (data: ImageFieldData | null) => void;
}

export function TopBar({
  name,
  setName,
  logoMode,
  setLogoMode,
  logoFont,
  setLogoFont,
  activeContext,
  setActiveContext,
  dotCount,
  onImageLoad,
}: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setLogoMode('file');
      // File import is complex — show coming soon
      console.info('File logo import coming soon');
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const data = await loadImageForField(url, 256);
      onImageLoad?.(data);
    } catch (err) {
      console.error('Failed to load image for field:', err);
    } finally {
      URL.revokeObjectURL(url);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    }
  }

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

      {logoMode === 'text' && (
        <select
          className="font-select"
          value={logoFont}
          onChange={e => setLogoFont(e.target.value)}
          aria-label="Logo font"
        >
          {FONTS.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      )}

      <div className="logo-mode-group">
        <button
          className={`logo-mode-btn${logoMode === 'text' ? ' active' : ''}`}
          onClick={() => setLogoMode('text')}
          title="Text logo"
          aria-label="Text logo mode"
        >
          T
        </button>
        <button
          className={`logo-mode-btn${logoMode === 'file' ? ' active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          title="File logo"
          aria-label="File logo mode"
        >
          ◻
        </button>
      </div>

      <button
        className="file-upload-btn"
        onClick={() => fileInputRef.current?.click()}
        title="Upload logo file"
        aria-label="Upload logo file"
      >
        ↑
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,.png,.jpg"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <button
        className="file-upload-btn"
        onClick={() => imageInputRef.current?.click()}
        title="Load image as dots"
        aria-label="Load image as dots"
      >
        ⬚
      </button>
      <input
        ref={imageInputRef}
        type="file"
        accept=".png,.jpg,.webp"
        style={{ display: 'none' }}
        onChange={handleImageChange}
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

      <div className="top-bar-meta">
        {dotCount !== undefined && (
          <div className="meta-item">
            <span className="meta-label">dots</span>
            <span className="meta-value">{dotCount.toLocaleString()}</span>
          </div>
        )}
        <div className="meta-item">
          <span className="meta-value">v0.8</span>
        </div>
      </div>
    </div>
  );
}

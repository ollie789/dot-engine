import React, { useState, useRef, useEffect } from 'react';
import type { Brand, BrandContext } from '@bigpuddle/dot-engine-brand';
import type { OutputFormat } from '../formats';
import { VERSION } from '../version';

export interface BottomBarProps {
  pointerEnabled: boolean;
  setPointerEnabled: (e: boolean) => void;
  colorBackground: string;
  config: Record<string, unknown>;
  brand?: Brand | null;
  activeContext?: BrandContext;
  format?: OutputFormat;
}

export function BottomBar({
  pointerEnabled,
  setPointerEnabled,
  colorBackground,
  config,
  brand,
  activeContext = 'logo',
  format,
}: BottomBarProps) {
  const [applyLabel, setApplyLabel] = useState('Apply');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    if (!exportMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportMenuOpen]);

  async function handleApply() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setApplyLabel('Copied!');
      setTimeout(() => setApplyLabel('Apply'), 1500);
    } catch {
      console.error('Clipboard write failed');
    }
  }

  const aspect = format?.aspect ?? 0;
  const brandName = (config as Record<string, unknown>).name as string ?? 'export';

  async function handleExportPNG() {
    setExportMenuOpen(false);
    if (!brand || isExporting) return;
    setIsExporting(true);
    try {
      const colors = brand.config.colors;
      const fieldRoot = brand.field(activeContext, { canvasAspect: aspect || 16 / 9 });
      const { exportPNG } = await import('@bigpuddle/dot-engine-export');

      // Build texture map from brand logo
      const textures: Record<string, { data: Float32Array; width: number; height: number; depth: number; aspectRatio: number }> = {};
      if (brand.logo.sdfTexture && brand.logo.textureId) {
        const sdfNode = brand.logo.sdfNode as { depth: number; aspectRatio: number };
        textures[brand.logo.textureId] = {
          data: brand.logo.sdfTexture,
          width: brand.logo.width,
          height: brand.logo.height,
          depth: sdfNode.depth ?? 0.5,
          aspectRatio: sdfNode.aspectRatio ?? 1,
        };
      }

      const blob = await exportPNG(fieldRoot, {
        width: aspect >= 1 ? 2048 : (aspect > 0 ? Math.round(2048 * aspect) : 2048),
        height: aspect >= 1 ? Math.round(2048 / aspect) : 2048,
        background: colorBackground,
        colorPrimary: colors.primary,
        colorAccent: colors.accent,
        textures,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brandName.toLowerCase().replace(/\s+/g, '-')}-${activeContext}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportSVG() {
    setExportMenuOpen(false);
    if (!brand || isExporting) return;
    setIsExporting(true);
    try {
      const fieldRoot = brand.field(activeContext);
      const { exportSVG } = await import('@bigpuddle/dot-engine-export');
      const result = exportSVG(fieldRoot, {
        width: 1200,
        height: aspect > 0 ? Math.round(1200 / aspect) : 1200,
        background: colorBackground,
      });
      const blob = new Blob([result.svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brandName.toLowerCase().replace(/\s+/g, '-')}-${activeContext}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('SVG export failed:', err);
      alert('SVG export is only available for geometric SDF shapes. Text and image logos require PNG export.');
    } finally {
      setIsExporting(false);
    }
  }

  function handleExportJSON() {
    setExportMenuOpen(false);
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brandName.toLowerCase().replace(/\s+/g, '-')}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bottom-bar slim">
      {/* Pointer toggle */}
      <button
        className={`pointer-toggle${pointerEnabled ? ' active' : ''}`}
        onClick={() => setPointerEnabled(!pointerEnabled)}
        title={pointerEnabled ? 'Disable pointer influence' : 'Enable pointer influence'}
        aria-label="Toggle pointer influence"
      >
        ⊕
      </button>

      {/* Status */}
      <span className="bottom-status">dot-engine v{VERSION}</span>

      {/* Right-side actions */}
      <div className="bottom-bar-actions">
        <div ref={exportRef} style={{ position: 'relative', display: 'inline-block' }}>
          <button
            className="action-btn"
            onClick={() => !isExporting && setExportMenuOpen(!exportMenuOpen)}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
          {exportMenuOpen && (
            <div className="export-menu" style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: 4,
              background: 'var(--bg-panel, #0d0d12)',
              border: '1px solid rgba(74, 158, 255, 0.2)',
              borderRadius: 4,
              padding: '4px 0',
              zIndex: 100,
              minWidth: 100,
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}>
              <button
                className="export-menu-item"
                onClick={handleExportPNG}
                style={{
                  display: 'block', width: '100%', padding: '6px 12px',
                  background: 'none', border: 'none', color: 'var(--text-primary, #e0e0e0)',
                  fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'left', cursor: 'pointer',
                }}
              >
                PNG
              </button>
              <button
                className="export-menu-item"
                onClick={handleExportSVG}
                style={{
                  display: 'block', width: '100%', padding: '6px 12px',
                  background: 'none', border: 'none', color: 'var(--text-primary, #e0e0e0)',
                  fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'left', cursor: 'pointer',
                }}
              >
                SVG
              </button>
              <button
                className="export-menu-item"
                onClick={handleExportJSON}
                style={{
                  display: 'block', width: '100%', padding: '6px 12px',
                  background: 'none', border: 'none', color: 'var(--text-primary, #e0e0e0)',
                  fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'left', cursor: 'pointer',
                }}
              >
                JSON
              </button>
            </div>
          )}
        </div>
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

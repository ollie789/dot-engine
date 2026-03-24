import { useState } from 'react';
import { BrandMoment } from '@bigpuddle/dot-engine-brand';
import type { Brand, BrandContext } from '@bigpuddle/dot-engine-brand';
import { qivrBrandPromise } from '../qivr-brand';

// ─── Single mark at a fixed context ──────────────────────────────────────────

interface QivrMarkProps {
  context?: BrandContext;
  width?: number;
  height?: number;
  interactive?: boolean;
}

export function QivrMark({
  context = 'logo',
  width = 400,
  height = 400,
  interactive = false,
}: QivrMarkProps) {
  return (
    <div style={{ width, height }}>
      <BrandMoment
        brand={qivrBrand}
        context={context}
        interactive={interactive}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

// ─── Wordmark — mark + logotype ───────────────────────────────────────────────
//
// The dot field Q sits left; "ivr" in Geist Light tracks right.
// The field bleeds slightly into the text zone — intentional.

export function QivrWordmark({ width = 640, height = 160 }) {
  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        background: '#F4F2EE',
        gap: 0,
      }}
    >
      {/* The Q mark — square crop */}
      <div style={{ width: height, height, flexShrink: 0 }}>
        <BrandMoment
          brand={qivrBrand}
          context="logo"
          options={{ canvasAspect: 1 }}
          interactive={false}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* "ivr" — ultra-light, wide tracking */}
      <span
        style={{
          fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
          fontWeight: 200,
          fontSize: height * 0.62,
          letterSpacing: '0.04em',
          color: '#0B1526',
          lineHeight: 1,
          marginLeft: -(height * 0.08),  // slight overlap — the Q bleeds into it
          userSelect: 'none',
        }}
      >
        ivr
      </span>
    </div>
  );
}

// ─── Context explorer (dev / brand review) ───────────────────────────────────

const CONTEXTS: { id: BrandContext; label: string; aspect: number }[] = [
  { id: 'logo',    label: 'Logo 1:1',   aspect: 1 },
  { id: 'hero',    label: 'Hero 16:9',  aspect: 16 / 9 },
  { id: 'loading', label: 'Loading',    aspect: 1 },
  { id: 'banner',  label: 'Banner 4:1', aspect: 4 },
];

export function QivrBrandExplorer() {
  const [active, setActive] = useState<BrandContext>('logo');
  const current = CONTEXTS.find(c => c.id === active)!;

  const canvasWidth  = 720;
  const canvasHeight = Math.round(canvasWidth / current.aspect);

  return (
    <div
      style={{
        fontFamily: "'Geist', system-ui, sans-serif",
        background: '#F4F2EE',
        minHeight: '100vh',
        padding: '48px 40px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <QivrWordmark width={320} height={80} />
      </div>

      {/* Canvas */}
      <div
        style={{
          width: canvasWidth,
          height: canvasHeight,
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: 20,
          transition: 'height 0.4s ease',
        }}
      >
        <BrandMoment
          brand={qivrBrand}
          context={active}
          options={{ canvasAspect: current.aspect }}
          interactive={true}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Context switcher */}
      <div style={{ display: 'flex', gap: 8 }}>
        {CONTEXTS.map(c => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            style={{
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: active === c.id ? 500 : 400,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '6px 16px',
              border: `1px solid ${active === c.id ? '#0B1526' : '#C8C5BE'}`,
              borderRadius: 2,
              background: active === c.id ? '#0B1526' : 'transparent',
              color: active === c.id ? '#F4F2EE' : '#0B1526',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Params readout */}
      <div
        style={{
          marginTop: 32,
          fontFamily: "'Geist Mono', monospace",
          fontSize: 11,
          color: '#888',
          lineHeight: 2,
        }}
      >
        <div>energy   0.35  — measured, clinical</div>
        <div>organic  0.72  — breathes, not ticks</div>
        <div>density  0.62  — form readable, dots visible</div>
        <div>motion   breathe @ 0.28×</div>
      </div>
    </div>
  );
}

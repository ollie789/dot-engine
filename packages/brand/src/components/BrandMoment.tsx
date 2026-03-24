import { useMemo } from 'react';
import { DotFieldCanvas } from '@bigpuddle/dot-engine-renderer';
import type { LodOverride } from '@bigpuddle/dot-engine-renderer';
import type { Brand, BrandContext, ContextOptions } from '../brand/types.js';

export interface BrandMomentProps {
  brand: Brand;
  context?: BrandContext;
  options?: ContextOptions;
  lod?: 'auto' | LodOverride;
  className?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
}

export function BrandMoment({
  brand,
  context = 'logo',
  options,
  lod = 'auto',
  className,
  style,
  interactive = true,
}: BrandMomentProps) {
  const fromField = useMemo(
    () => (context === 'transition' && options?.from ? brand.field(options.from, options) : null),
    [brand, context, options],
  );

  const toField = useMemo(
    () => (context === 'transition' && options?.to ? brand.field(options.to, options) : null),
    [brand, context, options],
  );

  const fieldRoot = useMemo(
    () => (context !== 'transition' ? brand.field(context, options) : null),
    [brand, context, options],
  );

  if (context === 'transition' && fromField && toField) {
    const progress = options?.progress ?? 0;
    return (
      <div
        className={className}
        style={{ width: '100%', height: '100%', position: 'relative', ...style }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - progress }}>
          <DotFieldCanvas
            field={fromField}
            colorPrimary={brand.config.colors.primary}
            colorAccent={brand.config.colors.accent}
            background="transparent"
            lod={lod}
            controls={false}
          />
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: progress }}>
          <DotFieldCanvas
            field={toField}
            colorPrimary={brand.config.colors.primary}
            colorAccent={brand.config.colors.accent}
            background={brand.config.colors.background ?? '#0a0a0a'}
            lod={lod}
            controls={interactive}
          />
        </div>
      </div>
    );
  }

  return (
    <DotFieldCanvas
      field={fieldRoot!}
      colorPrimary={brand.config.colors.primary}
      colorAccent={brand.config.colors.accent}
      background={brand.config.colors.background ?? '#0a0a0a'}
      lod={lod}
      controls={interactive}
      className={className}
      style={style}
    />
  );
}

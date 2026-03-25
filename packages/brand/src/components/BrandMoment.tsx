import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { DotFieldCanvas, MorphField, DotFieldErrorBoundary } from '@bigpuddle/dot-engine-renderer';
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
  onError?: (error: Error) => void;
}

export function BrandMoment({
  brand,
  context = 'logo',
  options,
  lod = 'auto',
  className,
  style,
  interactive = true,
  onError,
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
    const bg = brand.config.colors.background ?? '#0a0a0a';
    return (
      <div className={className} style={{ width: '100%', height: '100%', background: bg, ...style }}>
        <DotFieldErrorBoundary onError={onError} resetKey={`${fromField.id}-${toField.id}`}>
          <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <MorphField
              from={fromField}
              to={toField}
              progress={progress}
              colorFrom={{ primary: brand.config.colors.primary, accent: brand.config.colors.accent }}
              colorTo={{ primary: brand.config.colors.primary, accent: brand.config.colors.accent }}
            />
          </Canvas>
        </DotFieldErrorBoundary>
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
      onError={onError}
      className={className}
      style={style}
    />
  );
}

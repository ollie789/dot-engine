import { useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { DotField, MorphField, DotFieldErrorBoundary } from '@bigpuddle/dot-engine-renderer';
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

/**
 * Round to two decimal places so small sub-pixel jitter doesn't trigger
 * a field recompute (which is expensive).
 */
function roundAspect(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Derive a stable canvasAspect from the R3F canvas size. Explicit option wins. */
function useCanvasAspect(options: ContextOptions | undefined): number | undefined {
  const { size } = useThree();

  return useMemo(() => {
    if (options?.canvasAspect) return options.canvasAspect;
    if (size.width === 0 || size.height === 0) return undefined;
    return roundAspect(size.width / size.height);
  }, [options?.canvasAspect, size.width, size.height]);
}

function AdaptiveDotField({
  brand,
  context,
  options,
  lod,
  interactive,
}: {
  brand: Brand;
  context: BrandContext;
  options: ContextOptions | undefined;
  lod: 'auto' | LodOverride;
  interactive: boolean;
}) {
  const canvasAspect = useCanvasAspect(options);

  const field = useMemo(
    () => brand.field(context, canvasAspect !== undefined ? { ...options, canvasAspect } : options),
    [brand, context, options, canvasAspect],
  );

  if (canvasAspect === undefined) return null;

  return (
    <>
      <DotField
        field={field}
        colorPrimary={brand.config.colors.primary}
        colorAccent={brand.config.colors.accent}
        lod={lod}
      />
      {interactive && <OrbitControls />}
    </>
  );
}

function AdaptiveMorphField({
  brand,
  options,
}: {
  brand: Brand;
  options: ContextOptions | undefined;
}) {
  const canvasAspect = useCanvasAspect(options);
  const resolved = canvasAspect !== undefined ? { ...options, canvasAspect } : options;

  const fromField = useMemo(
    () => (resolved?.from ? brand.field(resolved.from, resolved) : null),
    [brand, options, canvasAspect],
  );

  const toField = useMemo(
    () => (resolved?.to ? brand.field(resolved.to, resolved) : null),
    [brand, options, canvasAspect],
  );

  if (canvasAspect === undefined) return null;
  if (!fromField || !toField) return null;

  return (
    <MorphField
      from={fromField}
      to={toField}
      progress={options?.progress ?? 0}
      colorFrom={{ primary: brand.config.colors.primary, accent: brand.config.colors.accent }}
      colorTo={{ primary: brand.config.colors.primary, accent: brand.config.colors.accent }}
    />
  );
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
  const bg = brand.config.colors.background ?? '#0a0a0a';

  return (
    <div className={className} style={{ width: '100%', height: '100%', background: bg, ...style }}>
      <DotFieldErrorBoundary onError={onError} resetKey={context}>
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          {context === 'transition'
            ? <AdaptiveMorphField brand={brand} options={options} />
            : <AdaptiveDotField brand={brand} context={context} options={options} lod={lod} interactive={interactive} />
          }
        </Canvas>
      </DotFieldErrorBoundary>
    </div>
  );
}

# Error Boundary + edgeSoftness — Design Spec

## Overview

Two independent, small improvements to the renderer and brand packages:

1. **Error Boundary** — catch R3F/shader crashes silently instead of crashing the app
2. **edgeSoftness** — wire the personality-computed edge softness value into the shader via compile-time template substitution

---

## 1. Error Boundary

### Goal

When a shader compilation error, Three.js exception, or R3F crash occurs inside the dot field canvas, catch it gracefully and render a silent transparent fallback instead of crashing the consumer's app.

### Architecture

New class component `DotFieldErrorBoundary` in `packages/renderer/src/components/DotFieldErrorBoundary.tsx`.

React error boundaries require class components (true in React 19) — this is the only class component in the project.

### Behavior

- Wraps the `<Canvas>` inside `DotFieldCanvas` (must be outside the R3F reconciler to catch errors from the R3F tree)
- On error: logs to `console.error`, renders a `<div style={{ width: '100%', height: '100%', background: 'transparent' }}>`
- No visible text, icons, or indicators in the fallback — silent replacement
- Exposes `onError?: (error: Error) => void` callback prop on `DotFieldCanvas` for consumers who want custom logging/telemetry
- Error state resets when `field` prop changes (via `getDerivedStateFromProps` comparing field reference by identity)

### Limitation

React error boundaries catch component-tree errors (including shader compilation failures that throw during render/useFrame). They do NOT catch WebGL context loss events, which fire outside React's lifecycle. This is acceptable — context loss is rare and has its own event-based recovery path if needed in the future.

### Props

```ts
interface DotFieldErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}
```

### Integration

`DotFieldCanvas` wraps its `<Canvas>` with `<DotFieldErrorBoundary>`. The `onError` prop is threaded through from `DotFieldCanvas` props. Consumers get error protection automatically with no API change.

`BrandMoment` in the brand package also gets `onError` threaded through to ALL `DotFieldCanvas` instances (both transition canvases and the normal-mode canvas).

### Files Changed

- Create: `packages/renderer/src/components/DotFieldErrorBoundary.tsx`
- Modify: `packages/renderer/src/components/DotFieldCanvas.tsx` — wrap Canvas, add onError prop
- Modify: `packages/renderer/src/index.ts` — export DotFieldErrorBoundary
- Modify: `packages/brand/src/components/BrandMoment.tsx` — thread onError to all DotFieldCanvas instances

### Testing

Unit test with a component that throws during render, wrapped in the error boundary. Verify:
- Error is caught (no uncaught exception)
- Fallback div is rendered
- `onError` callback is called with the error
- Error resets when key changes (new field prop)

---

## 2. edgeSoftness (Compile-Time)

### Goal

Replace the hardcoded `float edgeSoftness = 0.05` in the vertex shader with a compile-time value driven by the brand's personality system. The personality module already computes `edgeSoftness: lerp(0.02, 0.1, traits.organic)` but the value is never used.

### Approach: Compile-Time Template Substitution

This follows the existing pattern used by `{{SIZE_EXPR}}` — the compiler bakes the value into the shader string. No new uniforms needed. The material is already re-created via `useMemo` when the field changes, so the value updates correctly.

### Data Flow

```
personality.ts                    → MappedParams.edgeSoftness (0.02–0.1)
  ↓
contexts.ts (buildLogoField etc.) → { ...field(...children), edgeSoftness }
  ↓                                 (precedence: options?.edgeSoftness ?? params.edgeSoftness)
FieldRoot.edgeSoftness            → optional number, default 0.05
  ↓
compiler.ts (compileField)        → substitutes {{EDGE_SOFTNESS}} with float literal
  ↓
base-vertex.ts template           → float edgeSoftness = {{EDGE_SOFTNESS}};
```

### Type Changes

`FieldRoot` in `packages/core/src/nodes/types.ts`:
```ts
export interface FieldRoot extends BaseNode {
  readonly type: 'field';
  readonly children: readonly FieldChildNode[];
  readonly edgeSoftness?: number;  // NEW — defaults to 0.05 in compiler
}
```

The `field()` builder signature does NOT change. Context builders spread the value onto the result:
```ts
const edgeSoftness = options?.edgeSoftness ?? params.edgeSoftness;
return { ...field(...children), edgeSoftness };
```

### Shader Changes

**GLSL (base-vertex.ts):**
- Replace: `float edgeSoftness = 0.05;`
- With: `float edgeSoftness = {{EDGE_SOFTNESS}};`

**WGSL (wgsl-compiler.ts):**
- Replace: `let edgeSoftness = 0.05;` in `COMPUTE_TEMPLATE`
- With: `let edgeSoftness = {{EDGE_SOFTNESS}};`
- Substituted by `compileFieldWgsl()` the same way as the GLSL compiler

### Compiler Changes

`compileField` in `packages/renderer/src/compiler/compiler.ts`:
- Reads `root.edgeSoftness ?? 0.05`
- Adds `.replace('{{EDGE_SOFTNESS}}', f(root.edgeSoftness ?? 0.05))` to the vertex shader assembly (same pattern as `{{SIZE_EXPR}}`)

`compileFieldWgsl` in `packages/renderer/src/compiler/wgsl-compiler.ts`:
- Same substitution in the compute shader template

### DotField Changes

None — the value is baked into the shader at compile time. `DotField` already re-creates the material when `compiled` changes.

### Brand Integration

Context builders in `contexts.ts` pass edgeSoftness with precedence:
- `options?.edgeSoftness` (configurator slider / user override) takes priority
- Falls back to `params.edgeSoftness` (personality-computed)

Applied in all context builders: `buildLogoField`, `buildHeroField`, `buildLoadingField`, `buildBannerField`.

`buildDataField` in `data-field.ts` also gets the same treatment.

### Files Changed

- Modify: `packages/core/src/nodes/types.ts` — add `edgeSoftness?: number` to `FieldRoot`
- Modify: `packages/renderer/src/shaders/base-vertex.ts` — `{{EDGE_SOFTNESS}}` placeholder
- Modify: `packages/renderer/src/compiler/compiler.ts` — substitute edgeSoftness value
- Modify: `packages/renderer/src/compiler/wgsl-compiler.ts` — substitute in WGSL template
- Modify: `packages/brand/src/brand/contexts.ts` — pass edgeSoftness to field in all builders
- Modify: `packages/brand/src/brand/data-field.ts` — pass edgeSoftness to field

### Backwards Compatible

- `FieldRoot.edgeSoftness` is optional, defaults to `0.05`
- Existing serialized fields without `edgeSoftness` render identically
- The `field()` builder signature is unchanged
- Serialization works automatically (plain number property survives JSON round-trip)

### Testing

- Compiler test: verify `edgeSoftness` appears in compiled vertex shader with custom value
- Compiler test: verify default 0.05 when not provided
- Serialization round-trip: verify edgeSoftness survives toJSON/fromJSON

---

## Scope Exclusions

- No changes to the configurator UI (the slider already exists and passes edgeSoftness via ContextOptions — the brand backend change makes it work)
- No changes to the export pipeline (PNG/SVG don't use edgeSoftness)
- No new dependencies
- No changes to the `field()` builder signature

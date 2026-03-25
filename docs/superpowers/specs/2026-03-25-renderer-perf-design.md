# Renderer Performance Fixes — Design Spec

## Overview

Two independent performance fixes to DotField.tsx that eliminate unnecessary GPU resource teardowns during normal use.

## 1. Dynamic Uniform Updates

### Problem

The ShaderMaterial `useMemo` has 6 dependency triggers: `[compiled, colorPrimary, colorAccent, textures, imageFieldNode, imageTextures]`. Any color or texture change recreates the entire material (new GPU shader program compilation). Color changes are the most common user interaction (configurator slider, brand switching).

### Fix

Material `useMemo` depends ONLY on `compiled`. All other values are updated dynamically:

- Colors: updated in `useFrame` via `material.uniforms.uColorPrimary.value`
- Textures: updated via refs when props change, using `useEffect` to sync new texture uniforms
- Pointer: already updated in `useFrame` (no change needed)

The material is only rebuilt when the shader source code itself changes (SDF tree change, displacement change, LOD-driven flow field stripping).

### Files

- Modify: `packages/renderer/src/components/DotField.tsx`

## 2. Pre-allocated Instanced Mesh

### Problem

`<instancedMesh args={[geometry, material, totalDots]}>` tears down and recreates the entire mesh whenever geometry, material, or totalDots changes. LOD shifts, color changes, and dotComplexity changes all trigger full mesh reconstruction with new GPU buffer allocation.

### Fix

- Create the mesh imperatively with max capacity (from LOD tier, up to 300k)
- Use `mesh.count = actualDots` to control visible instances
- Swap `mesh.geometry` and `mesh.material` directly — no teardown
- Pre-allocate all 3 geometry variants on mount, dispose on unmount
- Add mesh to the R3F scene via `useThree` + `scene.add/remove`

The mesh instance is created once and never destroyed during the component's lifetime. Only `count`, `geometry`, and `material` are swapped as needed.

### Files

- Modify: `packages/renderer/src/components/DotField.tsx`

## Combined Approach

Both fixes modify DotField.tsx and are best implemented together since the imperative mesh management replaces the JSX pattern and the dynamic uniform updates change how the material is created.

The new DotField flow:
1. `compiled = useMemo(() => compileField(effectiveField), [effectiveField])` — only recompiles on field changes
2. `material = useMemo(() => new ShaderMaterial({ ... }), [compiled])` — only rebuilds on shader source changes
3. Geometries pre-allocated on mount, swapped via `mesh.geometry`
4. Mesh created imperatively with max capacity, `mesh.count` set per frame
5. Colors, textures updated in `useFrame` / `useEffect`

## Scope

- DotField.tsx only — MorphField and VideoField can follow the same pattern later
- No changes to the compiler, shader templates, or public API
- No new files

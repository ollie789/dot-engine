# API reference

Complete reference for every exported function, type, and component across all dot-engine
packages. Organized by package, then by category.

---

## @dot-engine/core

### Field builders

#### `field(...children: FieldChildNode[]): FieldRoot`

Creates the root node of a dot field.

```ts
const f = field(shape(sphere(0.7)), grid({ type: 'uniform', resolution: [40, 40, 40] }));
```

---

#### `shape(sdf: SdfNode): ShapeNode`

Wraps an SDF tree as the field's geometry source. Every `FieldRoot` must contain exactly one
`ShapeNode`.

```ts
shape(smoothUnion(sphere(0.5), box([0.3, 0.3, 0.3]), 0.1))
```

---

#### `grid(options: GridOptions): GridNode`

Defines the uniform dot sampling grid.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `type` | `'uniform'` | — | Grid strategy (only `'uniform'` supported) |
| `resolution` | `[number, number, number]` | — | Dot count along X, Y, Z |
| `bounds` | `[number, number, number]` | `[2,2,2]` | World-space extents in each axis |

Returns: `GridNode`

```ts
grid({ type: 'uniform', resolution: [40, 40, 10], bounds: [4, 2, 0.5] })
```

---

#### `animate(options: AnimateOptions): AnimateNode`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `speed` | `number` | — | Time multiplier for `uTime` uniform |
| `reducedMotion` | `'static' \| 'reduced'` | — | Motion reduction hint |

Returns: `AnimateNode`

---

#### `displace(noise: NoiseConfig, opts?: { amount?: number }): DisplaceNode`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `noise` | `NoiseConfig` | — | Noise configuration |
| `opts.amount` | `number` | `1` | Displacement magnitude multiplier |

Returns: `DisplaceNode`

---

### SDF Primitives

#### `sphere(radius: number): SphereNode`

Sphere centered at the origin.

---

#### `box(halfExtents: [x,y,z], edgeRadius?: number): BoxNode`

Axis-aligned box. `edgeRadius` rounds the edges.

---

#### `torus(majorR: number, minorR: number): TorusNode`

Torus on the XZ plane. `majorR` = distance from center to tube center; `minorR` = tube radius.

---

#### `cylinder(radius: number, height: number): CylinderNode`

Capped cylinder along the Y axis.

---

#### `capsule(radius: number, height: number): CapsuleNode`

Cylinder with hemispherical caps. `height` is the length of the cylindrical body.

---

#### `cone(radius: number, height: number): ConeNode`

Cone along Y, tip pointing up. `radius` is the base radius.

---

#### `plane(normal: [x,y,z], offset: number): PlaneNode`

Infinite half-space. `normal` must be a unit vector. Points on the plane satisfy
`dot(p, normal) = offset`.

---

#### `metaball(centers: {position,radius}[], threshold?: number): MetaballNode`

Implicit metaball field. Each center contributes `r² / (d² + ε)` to a potential sum.
`threshold` (default `1.0`) is the iso-surface value.

---

### SDF Booleans

All boolean functions take two `SdfNode` children `a` and `b`.

#### `union(a, b): UnionNode`

Hard minimum. Returns the closer of the two surfaces.

---

#### `smoothUnion(a, b, k: number): SmoothUnionNode`

Blended union. `k > 0` controls the blend radius. Throws if `k <= 0`.

---

#### `subtract(a, b): SubtractNode`

Carves `b` out of `a`. Returns the region inside `a` and outside `b`.

---

#### `smoothSubtract(a, b, k: number): SmoothSubtractNode`

Smooth carve. `k > 0` controls smoothing. Throws if `k <= 0`.

---

#### `intersect(a, b): IntersectNode`

Returns only the region inside both `a` and `b`.

---

#### `smoothIntersect(a, b, k: number): SmoothIntersectNode`

Smooth intersection. `k > 0` controls smoothing. Throws if `k <= 0`.

---

#### `onion(child: SdfNode, thickness: number): OnionNode`

Creates a shell at `thickness` distance from the child surface.

---

### SDF Transforms

All transforms take a `child: SdfNode` as first parameter.

#### `translate(child, offset: [x,y,z]): TranslateNode`

Moves the child in world space by `offset`.

---

#### `rotate(child, angles: [x,y,z]): RotateNode`

Euler rotation in radians. Applied as X then Y then Z (inverse applied to query point).

---

#### `scale(child, factor: number): ScaleNode`

Uniform scale. `factor > 1` makes the shape larger.

---

#### `twist(child, amount: number): TwistNode`

Twists the child around the Y axis. `amount` is the rotation in radians per unit of Y.

---

#### `bend(child, amount: number): BendNode`

Bends the child in the XY plane. `amount` is the bend curvature.

---

#### `repeat(child, spacing: [x,y,z]): RepeatNode`

Infinitely repeats the child at the given spacing in each axis.

---

#### `mirror(child, axis: 'x'|'y'|'z'): MirrorNode`

Mirrors the child across the given axis plane.

---

#### `elongate(child, amount: [x,y,z]): ElongateNode`

Stretches the child by clamping the query point in each axis before evaluation.

---

### Displacement noise configs

#### `simplex3D(opts): Simplex3DConfig`

| Parameter | Type | Description |
|---|---|---|
| `scale` | `number` | Spatial frequency |
| `speed` | `number` | Time evolution speed |

---

#### `domainWarp3D(opts): DomainWarp3DConfig`

| Parameter | Type | Description |
|---|---|---|
| `octaves` | `number` | Number of noise octaves |
| `scale` | `number` | Base spatial frequency |
| `speed` | `number` | Optional time evolution speed |

---

#### `flowField3D(opts): FlowField3DConfig`

Curl noise — divergence-free, good for organic flow.

| Parameter | Type | Description |
|---|---|---|
| `scale` | `number` | Spatial frequency |
| `speed` | `number` | Time evolution speed |

---

#### `attract(target: [x,y,z], opts): AttractConfig`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `target` | `[x,y,z]` | — | World-space attraction point |
| `strength` | `number` | — | Pull magnitude |
| `falloff` | `'inverse' \| 'linear' \| 'exponential'` | `'inverse'` | Distance falloff model |

---

### Color nodes

#### `color(opts): ColorNode`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `primary` | `string` | — | Hex color for interior |
| `accent` | `string` | — | Hex color for exterior |
| `mode` | `ColorMode` | `'depth'` | `'depth' \| 'position' \| 'noise' \| 'uniform'` |

---

#### `gradient(opts): GradientColorNode`

| Parameter | Type | Description |
|---|---|---|
| `axis` | `'x' \| 'y' \| 'z'` | World axis to sample along |
| `stops` | `[string, number][]` | `[hexColor, position]` pairs |

---

#### `noiseColor(opts): NoiseColorNode`

| Parameter | Type | Description |
|---|---|---|
| `palette` | `string[]` | Array of hex colors |
| `scale` | `number` | Noise spatial frequency |
| `speed` | `number` | Animation speed |

---

### Size and opacity

#### `size(opts): SizeNode`

| Parameter | Type | Description |
|---|---|---|
| `min` | `number` | Minimum dot radius |
| `max` | `number` | Maximum dot radius |
| `mode` | `'depth' \| 'uniform'` | Size variation mode |

---

#### `opacity(opts): OpacityNode`

| Parameter | Type | Description |
|---|---|---|
| `min` | `number` | Minimum opacity |
| `max` | `number` | Maximum opacity |
| `mode` | `'depth' \| 'edgeGlow' \| 'uniform'` | Opacity variation mode |

---

### Particles

#### `particles(opts): ParticleNode`

| Parameter | Type | Description |
|---|---|---|
| `emitter` | `ParticleEmitter` | Spawn strategy and rate |
| `lifecycle` | `ParticleLifecycle` | Lifetime, fade in/out |
| `motion` | `ParticleMotion` | Velocity, gravity, drag, turbulence |
| `maxParticles` | `number` | Pool ceiling |

---

#### `pointEmitter(position: [x,y,z], rate: number): ParticleEmitter`

Emits `rate` particles per second from a fixed point.

---

#### `surfaceEmitter(rate: number): ParticleEmitter`

Emits `rate` particles per second from random positions in the unit cube.

---

#### `burstEmitter(position: [x,y,z], count: number): ParticleEmitter`

One-shot burst of `count` particles from the given position. Rate is `0`.

---

### Image field

#### `imageField(textureId: string, opts?): ImageFieldNode`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `textureId` | `string` | — | Texture identifier (matches `DotField.imageTextures` key) |
| `opts.mode` | `'brightness' \| 'alpha'` | `'brightness'` | Which channel drives dot visibility |
| `opts.threshold` | `number` | `0.1` | Minimum value for dot inclusion |
| `opts.depth` | `number` | `0.1` | Z-depth of the image field |
| `opts.colorFromImage` | `boolean` | `false` | Use image RGB as dot color |

---

### Presets

#### `definePreset(config: PresetConfig): FieldRoot`

| Field | Type | Default | Description |
|---|---|---|---|
| `shape` | `SdfNode` | — | Root SDF |
| `grid` | `{ type, resolution }` | `30³` | Grid config |
| `color` | `{ primary, accent, mode? }` | — | Color config |
| `displace` | `{ noise, amount? }[]` | — | Displacement layers |
| `animate` | `{ speed }` | — | Animation speed |

---

#### `presets`

| Key | Shape | Color |
|---|---|---|
| `crystal` | `smoothUnion(box, sphere, 0.15)` | `#88ccff` / `#ffffff` |
| `organic` | `smoothUnion(sphere, torus, 0.3)` | `#2D7A4A` / `#E07A5F` |
| `minimal` | `sphere(0.7)` | `#e0e0e0` / `#808080` |

---

### CPU evaluator

#### `evaluateSdf(node: SdfNode, p: [x,y,z]): number`

Evaluates the SDF tree at point `p`. Returns negative values inside the surface, positive
outside. Throws for `textureSdf`, `customSdf`, and `fromField2D` nodes.

---

### Serialization

#### `toJSON(node: Serializable): string`

Serializes any `FieldRoot`, `SdfNode`, or `FieldChildNode` to a JSON string.

---

#### `fromJSON<T>(json: string): T`

Parses a JSON string and reassigns all node IDs to fresh values. Cast to the expected type.

---

### ID utilities

#### `nodeId(): string`

Generates a unique node ID string (`node_N`). Called automatically by all builder functions.

#### `_resetIds(): void`

Resets the ID counter to zero. For testing only.

---

## @dot-engine/renderer

### Components

#### `<DotField>`

Must be used inside a React Three Fiber `<Canvas>`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `field` | `FieldRoot` | required | Field DAG |
| `colorPrimary` | `string` | `'#4a9eff'` | Primary color uniform override |
| `colorAccent` | `string` | `'#ff6b4a'` | Accent color uniform override |
| `lod` | `'auto' \| LodOverride` | `'auto'` | LOD tier |
| `backend` | `'auto' \| 'webgl2' \| 'webgpu'` | `'auto'` | Rendering backend |
| `pointerPosition` | `{ x: number; y: number }` | — | NDC pointer for repulsion |
| `pointerStrength` | `number` | `0` | Repulsion strength 0–1 |
| `textures` | `Record<string, { texture, depth, aspectRatio }>` | — | `DataTexture` bindings |
| `imageTextures` | `Record<string, THREE.Texture>` | — | Image/video texture bindings |

---

#### `<DotFieldCanvas>`

Standalone canvas wrapper. Creates `<Canvas>`, mounts `<DotField>`, optionally adds `<OrbitControls>`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `field` | `FieldRoot` | required | Field DAG |
| `colorPrimary` | `string` | — | Primary color |
| `colorAccent` | `string` | — | Accent color |
| `lod` | `'auto' \| LodOverride` | `'auto'` | LOD tier |
| `background` | `string` | `'#0a0a0a'` | Background color |
| `className` | `string` | — | CSS class |
| `style` | `React.CSSProperties` | — | Inline styles |
| `controls` | `boolean` | `true` | Enable OrbitControls |
| `camera` | `{ position?, fov? }` | `[0,0,3], 50` | Camera config |

---

#### `<ParticleSystem>`

Renders a `ParticleNode` as an instanced mesh.

| Prop | Type | Default | Description |
|---|---|---|---|
| `config` | `ParticleNode` | required | Particle config |
| `color` | `string` | `'#4a9eff'` | Particle color |
| `size` | `number` | `0.015` | Base radius |

---

#### `<VideoField>`

Live video-to-dots renderer.

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | required | Video URL |
| `field` | `FieldRoot` | required | Base field (grid + animate) |
| `resolution` | `number` | `128` | Internal texture resolution |
| `colorPrimary` | `string` | — | Primary color |
| `colorAccent` | `string` | — | Accent color |
| `lod` | `'auto' \| LodOverride` | `'auto'` | LOD tier |

---

### Compiler

#### `compileField(root: FieldRoot): CompiledField`

Compiles a field DAG to GLSL shaders.

**Returns** `CompiledField`:

| Field | Type | Description |
|---|---|---|
| `vertexShader` | `string` | GLSL vertex shader |
| `fragmentShader` | `string` | GLSL fragment shader |
| `resolution` | `[number, number, number]` | Grid dimensions |
| `bounds` | `[number, number, number]` | World extents |
| `totalDots` | `number` | Total instance count |
| `extraUniforms` | `Record<string, ExtraUniform>` | Texture uniform declarations |

Throws if `FieldRoot` is missing a `ShapeNode` or `GridNode`.

---

#### `compileFieldWgsl(root: FieldRoot): CompiledWgslField`

Compiles a field DAG to WGSL (WebGPU). Runtime not yet fully implemented.

---

### LOD

#### `computeLodTier(frameMs, benchDots, override?): LodTier`

| Parameter | Type | Description |
|---|---|---|
| `frameMs` | `number` | Measured frame time in milliseconds |
| `benchDots` | `number` | Dot count used for measurement |
| `override` | `LodOverride` | Optional manual override |

**`LodTier`**

| Field | Type | Description |
|---|---|---|
| `quality` | `'high' \| 'medium' \| 'low'` | Tier label |
| `maxDots` | `number` | Maximum dot instances |
| `dotComplexity` | `number` | Triangles per dot (8, 20, or 80) |
| `includeFlowField` | `boolean` | Whether curl noise is enabled |

**`LodOverride`**

| Field | Type | Description |
|---|---|---|
| `dots` | `number` | Maximum dot count |
| `quality` | `'high' \| 'medium' \| 'low'` | Tier |

---

### Hooks

#### `usePointerInfluence(options?): PointerInfluence`

Tracks pointer NDC position with smoothing. Must be inside `<Canvas>`.

**Options** (`PointerInfluenceOptions`):

| Option | Type | Default | Description |
|---|---|---|---|
| `smoothing` | `number` | `0.85` | Exponential smoothing 0–1 |
| `enabled` | `boolean` | `true` | Active flag |

**Returns** (`PointerInfluence`):

| Field | Type | Description |
|---|---|---|
| `position` | `THREE.Vector2` | Smoothed NDC position |
| `isOver` | `React.RefObject<boolean>` | Pointer over canvas flag |

---

#### `useScrollInfluence(options?): ScrollInfluence`

Tracks scroll progress 0–1 with smoothing. Must be inside `<Canvas>`.

**Options** (`ScrollInfluenceOptions`):

| Option | Type | Default | Description |
|---|---|---|---|
| `target` | `HTMLElement \| null` | `window` | Scroll target |
| `range` | `number` | document height | Pixel range for 0→1 |
| `offset` | `number` | `0` | Pixel offset |
| `smoothing` | `number` | `0.9` | Smoothing 0–1 |
| `enabled` | `boolean` | `true` | Active flag |

**Returns** (`ScrollInfluence`):

| Field | Type | Description |
|---|---|---|
| `progress` | `RefObject<number>` | Smoothed progress 0–1 |
| `scrollY` | `RefObject<number>` | Raw scroll position in pixels |

---

#### `useSpring3D(options?): Spring3D`

Critically-damped spring for 3D position. Must be inside `<Canvas>`.

**Options** (`Spring3DOptions`):

| Option | Type | Default | Description |
|---|---|---|---|
| `stiffness` | `number` | `120` | Spring stiffness |
| `damping` | `number` | `14` | Damping coefficient |
| `initial` | `[x,y,z]` | `[0,0,0]` | Initial position |
| `enabled` | `boolean` | `true` | Active flag |

**Returns** (`Spring3D`):

| Field | Type | Description |
|---|---|---|
| `position` | `THREE.Vector3` | Current position |
| `velocity` | `THREE.Vector3` | Current velocity |
| `setTarget(x,y,z)` | `function` | Set spring target |
| `snap(x,y,z)` | `function` | Teleport instantly |

---

### Particle pool

#### `createParticlePool(maxParticles: number): ParticlePoolState`

Allocates a particle pool.

#### `updateParticlePool(state, dt, config, maxParticles): { alive: number }`

Advances the simulation by `dt` seconds.

#### `getParticleAlpha(pool, index, fadeIn, fadeOut): number`

Returns the fade-in/fade-out opacity for particle at `index`.

#### `PARTICLE_STRIDE: 8`

Floats per particle: `[x, y, z, vx, vy, vz, age, lifetime]`.

---

## @dot-engine/brand

### Brand definition

#### `defineBrand(config: BrandConfig): Promise<Brand>`

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Brand name (optional) |
| `logo` | `LogoInput` | `svg() \| image() \| text()` |
| `colors.primary` | `string` | Primary hex color |
| `colors.accent` | `string` | Accent hex color |
| `colors.background` | `string` | Background hex color |
| `personality.energy` | `number` | 0–1 energy level |
| `personality.organic` | `number` | 0–1 organic softness |
| `personality.density` | `number` | 0–1 dot density |
| `motion.style` | `MotionStyle` | `'flow' \| 'breathe' \| 'pulse' \| 'none'` |
| `motion.speed` | `number` | Base speed multiplier |

Returns: `Promise<Brand>`

---

#### `Brand` (interface)

| Member | Signature | Description |
|---|---|---|
| `config` | `BrandConfig` | Original config |
| `logo` | `ProcessedLogo` | Processed logo data |
| `field` | `(context?, options?) => FieldRoot` | Generate field for context |
| `particles` | `(mode: ParticleMode) => ParticleNode \| null` | Generate particle node |

---

### Logo helpers

#### `svg(source: string): SvgInput`

#### `image(source: string): ImageInput`

#### `text(text: string, opts?): TextInput`

| Option | Type | Default |
|---|---|---|
| `font` | `string` | system sans-serif |
| `weight` | `number` | `700` |

#### `importLogo(input: LogoInput, opts?: ImportOptions): Promise<ProcessedLogo>`

| Option | Type | Default |
|---|---|---|
| `resolution` | `number` | `256` |
| `depth` | `number` | `0.1` |

---

### Component

#### `<BrandMoment>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `brand` | `Brand` | required | Brand object |
| `context` | `BrandContext` | `'logo'` | Display context |
| `options` | `ContextOptions` | — | Context options |
| `lod` | `'auto' \| LodOverride` | `'auto'` | LOD tier |
| `className` | `string` | — | CSS class |
| `style` | `React.CSSProperties` | — | Inline styles |
| `interactive` | `boolean` | `true` | Enable OrbitControls |

---

### Context options

#### `ContextOptions` (interface)

| Field | Type | Description |
|---|---|---|
| `canvasAspect` | `number` | Width/height ratio for grid adaptation |
| `data` | `DataPoint[]` | Data points for `data` context |
| `from` | `BrandContext` | Transition source context |
| `to` | `BrandContext` | Transition target context |
| `progress` | `number` | Transition progress 0–1 |
| `twist` | `number` | SDF twist amount |
| `bend` | `number` | SDF bend amount |
| `mirrorX` | `boolean` | Mirror across X |
| `mirrorY` | `boolean` | Mirror across Y |
| `dotSizeMin` | `number` | Override minimum dot radius |
| `dotSizeMax` | `number` | Override maximum dot radius |
| `edgeSoftness` | `number` | Override edge softness |

---

### Particles

#### `buildParticles(mode: ParticleMode, config: BrandConfig, params: MappedParams): ParticleNode | null`

Builds a particle node tuned to the brand parameters. Use `brand.particles(mode)` instead.

#### `particlePresets: Record<string, ParticleNode>`

Pre-built particles with neutral defaults: `ambientDrift`, `burst`, `rising`, `edges`.

---

### Data visualization

#### `DataPoint` (interface)

| Field | Type | Description |
|---|---|---|
| `position` | `[x,y,z]` | Normalized 0–1 position mapped to world [-1,1] |
| `value` | `number` | Influence strength |
| `radius` | `number` | Reserved |
| `category` | `string` | Reserved |

---

### Personality

#### `mapPersonality(traits: PersonalityTraits): MappedParams`

Maps 0–1 personality traits to concrete shader parameters.

**Input** (`PersonalityTraits`): `{ energy, organic, density }`

**Output** (`MappedParams`):

| Field | Description |
|---|---|
| `animateSpeed` | Time multiplier |
| `displacementAmount` | Noise displacement magnitude |
| `edgeSoftness` | SDF surface softness |
| `useFlowField` | Whether to use curl noise |
| `gridResolution` | Grid dots along shortest axis |

---

### Motion

#### `motionToDisplacements(style, speed, amount, useFlowField): DisplaceNode[]`

Converts a `MotionStyle` into the corresponding `DisplaceNode` array.

#### `MotionStyle`

`'flow' | 'breathe' | 'pulse' | 'none'`

---

### Image field

#### `loadImageForField(source: string, resolution?: number): Promise<ImageFieldData>`

Browser-only. Loads an image URL into RGBA Float32Array pixel data.

#### `grabVideoFrame(video: HTMLVideoElement, resolution?: number): ImageFieldData`

Browser-only. Captures one frame from a video element.

---

## @dot-engine/export

### SVG export

#### `exportSVG(fieldRoot: FieldRoot, options: ExportSVGOptions): SVGResult`

CPU-side export. Works in any environment.

**Options** (`ExportSVGOptions`):

| Field | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | required | Output width in pixels |
| `height` | `number` | required | Output height in pixels |
| `background` | `string` | none | Background fill color |
| `dotRadius` | `number` | `3` | Base dot radius |
| `camera.position` | `[x,y,z]` | `[0,0,3]` | Camera position |
| `camera.fov` | `number` | `60` | Vertical FOV in degrees |

**Returns** (`SVGResult`):

| Field | Type | Description |
|---|---|---|
| `svg` | `string` | SVG markup string |
| `dotCount` | `number` | Number of rendered dots |

---

### PNG export

#### `exportPNG(fieldRoot: FieldRoot, options: ExportPNGOptions): Promise<Blob>`

Browser-only. Offscreen WebGL render.

**Options** (`ExportPNGOptions`):

| Field | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | required | Output width in pixels |
| `height` | `number` | required | Output height in pixels |
| `background` | `string` | `'#000000'` | Background color |

Returns: `Promise<Blob>` (PNG format)

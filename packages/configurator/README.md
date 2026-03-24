# @dot-engine/configurator

Visual brand configurator for dot-engine. A gritty-futuristic HUD interface for exploring
vibes, tweaking parameters, and exporting brand assets — without writing code.

---

## Running

```bash
pnpm --filter @dot-engine/configurator dev
```

Or from the repo root:

```bash
pnpm dev
```

The configurator is a private Vite + React application. It is not published to npm.

---

## UI layout

**Top bar** — Brand name input, context switcher (logo / hero / loading / banner), export
buttons (PNG, SVG, JSON).

**Left panel** — Vibe selector grid with 12 preset cards. Intensity slider below the grid.
Advanced controls section (collapsible): motion style, particle mode, dot size min/max, edge
softness, twist, bend, mirror X/Y.

**Canvas** — Live 3D dot field preview with OrbitControls. Format preset selector overlaid
at the bottom.

**Bottom bar** — Active vibe name, current intensity value, format label.

---

## Vibes

A vibe is a named preset that sets all visual parameters at once. Select one from the left
panel grid.

| Name | Description | Motion | Particles |
|---|---|---|---|
| Minimal | Clean, precise, understated | breathe | none |
| Elegant | Refined, flowing, luxurious | flow | ambient |
| Bold | Strong, confident, impactful | pulse | edges |
| Organic | Natural, alive, breathing | flow | ambient |
| Energetic | Dynamic, fast, explosive | pulse | burst |
| Cosmic | Ethereal, vast, mysterious | flow | rising |
| Industrial | Raw, mechanical, structured | none | none |
| Neon | Electric, glowing, cyberpunk | pulse | edges |
| Zen | Calm, balanced, meditative | breathe | ambient |
| Glitch | Broken, distorted, chaotic | pulse | burst |
| Frost | Cold, crystalline, delicate | breathe | rising |
| Ember | Warm, smoldering, intense | flow | rising |

Each vibe also suggests a primary and accent color pair, which loads into the color pickers.

---

## Intensity slider

The intensity slider (0–1) scales all energy-related parameters of the active vibe:

- `energy` and `motionSpeed` scale by `0.3 + intensity * 1.4` (range 0.3×–1.7×)
- `density` scales by `0.7 + intensity * 0.6`
- `dotSizeMax` scales by `0.5 + intensity`
- `edgeSoftness` scales by `0.3 + intensity * 1.4`
- `twist` and `bend` scale by the same energy factor

At `intensity = 0.5` the vibe plays exactly as designed. Lower values calm everything down;
higher values crank up the motion and size.

---

## Format presets

The format selector in the canvas area constrains the preview aspect ratio.

| Name | Aspect ratio | Use case |
|---|---|---|
| Responsive | unconstrained | Full-browser preview |
| Logo 1:1 | 1:1 | Square logo mark |
| Logo 2:1 | 2:1 | Wide logo lockup |
| Banner 4:1 | 4:1 | Site banner, email header |
| Hero 16:9 | 16:9 | Video thumbnail, hero section |
| Social 1.91:1 | 1.91:1 | Open Graph / social card |
| Story 9:16 | 9:16 | Instagram / TikTok story |
| Poster 2:3 | 2:3 | Print poster, app store artwork |

---

## Advanced controls

Available in the collapsible "Advanced" section of the left panel:

| Control | Description |
|---|---|
| Motion style | `flow`, `breathe`, `pulse`, `none` — overrides the vibe default |
| Particle mode | `none`, `ambient`, `burst`, `rising`, `edges` |
| Dot size min | Minimum dot radius in world units |
| Dot size max | Maximum dot radius in world units |
| Edge softness | SDF surface smoothing amount |
| Twist | Twist deformation along Y axis (radians per unit) |
| Bend | Bend deformation in the XY plane |
| Mirror X | Symmetric reflection across the X axis |
| Mirror Y | Symmetric reflection across the Y axis |

---

## Export

**PNG** — Renders the current canvas at 1× pixel ratio and triggers a browser download of a
PNG file. Uses `@dot-engine/export`'s `exportPNG`.

**SVG** — Evaluates the dot field on the CPU and downloads an SVG. Useful for print and
vector editing workflows. Note: `textureSdf` (logo/text shapes) are GPU-only and fall back to
a geometric placeholder in SVG export.

**JSON** — Downloads the serialized `FieldRoot` DAG as a `.json` file using `toJSON` from
`@dot-engine/core`. The JSON can be loaded with `fromJSON` in any dot-engine application.

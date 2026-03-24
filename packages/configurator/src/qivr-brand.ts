import { defineBrand, customField } from '@bigpuddle/dot-engine-brand';
import {
  onion, sphere, subtract, smoothUnion,
  box, capsule, translate, rotate, elongate,
  displace, simplex3D, flowField3D,
  field, shape, grid, color, animate, size, opacity,
} from '@bigpuddle/dot-engine-core';

// ─── Q shape from SDF primitives ─────────────────────────────────────────────
//
// Concept: organic outer wall (not a perfect sphere — slightly elongated on the
// left spine), offset counter, gap at ~4 o'clock, cantilevered tail.
//
// All coords are in world space [-1, 1]³

// 1. Outer form — elongate left to make it less circular, more architectural
const outerSphere = elongate(sphere(0.42), [0.04, 0.0, 0]);

// 2. Shell the outer form — onion gives us wall thickness
//    Thick wall (0.12) so the dot density reads as structural mass
const ring = onion(outerSphere, 0.12);

// 3. Punch the gap — rotated box at ~4 o'clock position
//    Angle: ~-40° from horizontal (4:30 on a clock face)
const gapAngle = -0.72; // radians ≈ -41°
const gap = rotate(
  translate(box([0.22, 0.14, 0.6]), [0.38, -0.26, 0]),
  [0, 0, gapAngle]
);

const ringWithGap = subtract(ring, gap);

// 4. Tail — a thin horizontal capsule, exits at equator-right
//    Not a bar — tapered by using a very thin capsule with elongation
const tail = translate(
  rotate(
    elongate(capsule(0.038, 0.18), [0.12, 0, 0]),
    [0, 0, Math.PI / 2]
  ),
  [0.62, -0.10, 0]
);

// 5. Unite ring and tail with a soft blend so they're one continuous form
const qSdf = smoothUnion(ringWithGap, tail, 0.04);

// ─── Field assembly ───────────────────────────────────────────────────────────

const qField = field(
  shape(qSdf),
  grid({
    type: 'uniform',
    resolution: [48, 48, 24],   // denser XY, shallow Z — reads as a mark not a volume
    bounds: [2.2, 2.2, 1.0],
  }),
  color({
    primary: '#0B1526',         // deep navy — clinical, not black
    accent: '#4A9B8E',          // medical teal at the edges
    mode: 'depth',
  }),
  displace(simplex3D({ scale: 2.8, speed: 0.18 }), { amount: 0.06 }),
  displace(flowField3D({ scale: 1.6, speed: 0.08 }), { amount: 0.04 }),
  size({ min: 0.018, max: 0.048, mode: 'depth' }),
  opacity({ min: 0.6, max: 1.0, mode: 'edgeGlow' }),
  animate({ speed: 0.3 }),
);

// ─── Brand definition ─────────────────────────────────────────────────────────

export const qivrBrandPromise = defineBrand({
  name: 'Qivr',
  logo: customField(qField),    // pass the pre-built field directly
  colors: {
    primary: '#0B1526',
    accent: '#4A9B8E',
    background: '#F4F2EE',      // warm off-white — the print stock from our wordmark direction
  },
  personality: {
    energy: 0.35,   // measured, not frantic — clinical precision
    organic: 0.72,  // high — the wall breathes, it doesn't tick
    density: 0.62,  // dense enough to read the form, sparse enough to see individual dots
  },
  motion: {
    style: 'breathe',  // slow simplex — the mark is alive, not performing
    speed: 0.28,
  },
});

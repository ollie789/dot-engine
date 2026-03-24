import { describe, it, expect, beforeEach } from 'vitest';
import { _resetIds } from '../src/nodes/types.js';
import { sphere, box, torus, cylinder, capsule, cone, plane, metaball } from '../src/sdf/primitives.js';
import { union, smoothUnion, subtract, onion } from '../src/sdf/boolean.js';
import { translate, scale, rotate, twist, bend, repeat, mirror, elongate } from '../src/sdf/transforms.js';
import { evaluateSdf } from '../src/evaluate.js';

beforeEach(() => {
  _resetIds();
});

describe('evaluateSdf — sphere', () => {
  it('returns -1 at origin (inside)', () => {
    expect(evaluateSdf(sphere(1), [0, 0, 0])).toBeCloseTo(-1);
  });

  it('returns 0 on surface', () => {
    expect(evaluateSdf(sphere(1), [1, 0, 0])).toBeCloseTo(0);
  });

  it('returns 1 outside', () => {
    expect(evaluateSdf(sphere(1), [2, 0, 0])).toBeCloseTo(1);
  });
});

describe('evaluateSdf — box', () => {
  it('returns negative at origin (inside)', () => {
    expect(evaluateSdf(box([1, 1, 1]), [0, 0, 0])).toBeLessThan(0);
  });

  it('returns ~1 outside along x', () => {
    expect(evaluateSdf(box([1, 1, 1]), [2, 0, 0])).toBeCloseTo(1);
  });
});

describe('evaluateSdf — torus', () => {
  it('returns -minorR at centre of tube', () => {
    // torus(majorR=0.5, minorR=0.2): point [0.5,0,0] lies at the ring centre
    expect(evaluateSdf(torus(0.5, 0.2), [0.5, 0, 0])).toBeCloseTo(-0.2);
  });
});

describe('evaluateSdf — union', () => {
  it('returns -0.5 at origin (inside first sphere)', () => {
    const sdf = union(sphere(0.5), translate(sphere(0.5), [2, 0, 0]));
    expect(evaluateSdf(sdf, [0, 0, 0])).toBeCloseTo(-0.5);
  });

  it('returns 0.5 between the two spheres', () => {
    const sdf = union(sphere(0.5), translate(sphere(0.5), [2, 0, 0]));
    expect(evaluateSdf(sdf, [1, 0, 0])).toBeCloseTo(0.5);
  });
});

describe('evaluateSdf — smoothUnion', () => {
  it('smooth result is <= hard union near seam', () => {
    const hardResult = evaluateSdf(
      union(sphere(0.5), translate(sphere(0.5), [2, 0, 0])),
      [1, 0, 0],
    );
    const smoothResult = evaluateSdf(
      smoothUnion(sphere(0.5), translate(sphere(0.5), [2, 0, 0]), 0.5),
      [1, 0, 0],
    );
    expect(smoothResult).toBeLessThanOrEqual(hardResult + 1e-10);
  });
});

describe('evaluateSdf — subtract', () => {
  it('returns 0.5 at origin (carved-out shell)', () => {
    // sphere(1) - sphere(0.5): at origin, sphere(1)=-1, -sphere(0.5)=0.5 → max(-1,0.5)=0.5
    const sdf = subtract(sphere(1), sphere(0.5));
    expect(evaluateSdf(sdf, [0, 0, 0])).toBeCloseTo(0.5);
  });
});

describe('evaluateSdf — onion', () => {
  it('returns 0.9 far from shell (inside sphere, inside shell)', () => {
    // onion(sphere(1), 0.1): at origin, sphere=-1, abs(-1)-0.1 = 0.9
    expect(evaluateSdf(onion(sphere(1), 0.1), [0, 0, 0])).toBeCloseTo(0.9);
  });

  it('returns -0.1 just inside the shell surface', () => {
    // At [1,0,0]: sphere=0, abs(0)-0.1 = -0.1
    expect(evaluateSdf(onion(sphere(1), 0.1), [1, 0, 0])).toBeCloseTo(-0.1);
  });
});

describe('evaluateSdf — translate', () => {
  it('evaluates child at shifted position', () => {
    const sdf = translate(sphere(0.5), [1, 0, 0]);
    expect(evaluateSdf(sdf, [1, 0, 0])).toBeCloseTo(-0.5);
  });
});

describe('evaluateSdf — scale', () => {
  it('returns -1 at origin (scaled sphere)', () => {
    // scale(sphere(0.5), 2): evaluate sphere(0.5) at [0,0,0]/2=[0,0,0] → -0.5, multiply by 2 → -1
    expect(evaluateSdf(scale(sphere(0.5), 2), [0, 0, 0])).toBeCloseTo(-1);
  });

  it('returns 0 on scaled surface', () => {
    // scale(sphere(0.5), 2): evaluate sphere(0.5) at [1,0,0]/2=[0.5,0,0] → 0, multiply by 2 → 0
    expect(evaluateSdf(scale(sphere(0.5), 2), [1, 0, 0])).toBeCloseTo(0);
  });
});

describe('evaluateSdf — cone', () => {
  // cone(r=0.5, h=1.0): tip at [0,-0.5,0], base (large end) at [0,+0.5,0]
  it('returns ~0 at the apex (tip)', () => {
    expect(evaluateSdf(cone(0.5, 1.0), [0, -0.5, 0])).toBeCloseTo(0);
  });

  it('returns positive outside beyond tip', () => {
    // Directly below the tip, 0.5 units away
    expect(evaluateSdf(cone(0.5, 1.0), [0, -1.0, 0])).toBeCloseTo(0.5);
  });

  it('returns negative inside the cone', () => {
    expect(evaluateSdf(cone(0.5, 1.0), [0, 0, 0])).toBeCloseTo(-0.2236);
  });

  it('returns positive outside the side', () => {
    expect(evaluateSdf(cone(0.5, 1.0), [1.0, 0, 0])).toBeGreaterThan(0);
  });
});

describe('evaluateSdf — cylinder', () => {
  // cylinder(r=0.5, h=2.0): center at origin, extends ±1 along y
  it('returns -0.5 at center (inside)', () => {
    expect(evaluateSdf(cylinder(0.5, 2.0), [0, 0, 0])).toBeCloseTo(-0.5);
  });

  it('returns 0 on the cylindrical surface', () => {
    expect(evaluateSdf(cylinder(0.5, 2.0), [0.5, 0, 0])).toBeCloseTo(0);
  });

  it('returns positive outside', () => {
    expect(evaluateSdf(cylinder(0.5, 2.0), [1.0, 0, 0])).toBeCloseTo(0.5);
  });
});

describe('evaluateSdf — capsule', () => {
  // capsule(r=0.25, h=1.0): cylindrical part ±0.5 along y, hemispherical caps
  it('returns -0.25 at center (inside)', () => {
    expect(evaluateSdf(capsule(0.25, 1.0), [0, 0, 0])).toBeCloseTo(-0.25);
  });

  it('returns 0 on the cylindrical surface', () => {
    expect(evaluateSdf(capsule(0.25, 1.0), [0.25, 0, 0])).toBeCloseTo(0);
  });

  it('returns positive outside', () => {
    expect(evaluateSdf(capsule(0.25, 1.0), [1.0, 0, 0])).toBeCloseTo(0.75);
  });

  it('returns positive above top hemisphere', () => {
    // Top cap center at [0, 0.5, 0], going up 1 more → [0, 1.5, 0]: dist = 1.5 - 0.5 - 0.25 = 0.75
    expect(evaluateSdf(capsule(0.25, 1.0), [0, 1.5, 0])).toBeCloseTo(0.75);
  });
});

describe('evaluateSdf — plane', () => {
  // plane(normal=[0,1,0], offset=0): the xz-plane
  it('returns 0 at the origin (on plane)', () => {
    expect(evaluateSdf(plane([0, 1, 0], 0), [0, 0, 0])).toBeCloseTo(0);
  });

  it('returns positive above the plane', () => {
    expect(evaluateSdf(plane([0, 1, 0], 0), [0, 1, 0])).toBeCloseTo(1);
  });

  it('returns negative below the plane', () => {
    expect(evaluateSdf(plane([0, 1, 0], 0), [0, -1, 0])).toBeCloseTo(-1);
  });
});

describe('evaluateSdf — rotate', () => {
  // Rotating a translated box by 90° around Z should transform the offset direction.
  // A box at offset [1, 0, 0] rotated 90° around Z: the center moves to [0, 1, 0].
  it('rotates a translated sphere 90° around Z — center moves to [0,1,0]', () => {
    const PI_OVER_2 = Math.PI / 2;
    // rotate(translate(sphere(0.3), [1, 0, 0]), [0, 0, PI/2])
    // After rotation, the sphere center is at [0, 1, 0].
    const sdf = rotate(translate(sphere(0.3), [1, 0, 0]), [0, 0, PI_OVER_2]);
    // At [0, 1, 0] (new center) → should be -0.3 (inside sphere)
    expect(evaluateSdf(sdf, [0, 1, 0])).toBeCloseTo(-0.3);
    // At [0, 0, 0] (old center, now far from sphere) → should be > 0
    expect(evaluateSdf(sdf, [1, 0, 0])).toBeGreaterThan(0);
  });
});

describe('evaluateSdf — twist', () => {
  it('at y=0 twist has no effect (angle=0)', () => {
    // twist with any amount: at y=0, the rotation angle is 0, so the point is unchanged
    const sdf = twist(sphere(1), 2.0);
    expect(evaluateSdf(sdf, [0, 0, 0])).toBeCloseTo(-1);
  });

  it('twists the xz plane around y', () => {
    // A box centered at origin. twist rotates xz based on y.
    // At y=0, no rotation. At y!=0, rotation occurs.
    const sdf = twist(box([0.5, 1, 0.5]), Math.PI / 2);
    // At origin, no twist → inside box
    expect(evaluateSdf(sdf, [0, 0, 0])).toBeLessThan(0);
  });
});

describe('evaluateSdf — bend', () => {
  it('at y=0 bend has no effect', () => {
    const sdf = bend(sphere(1), 1.0);
    expect(evaluateSdf(sdf, [0, 0, 0])).toBeCloseTo(-1);
  });

  it('bends a cylinder', () => {
    const sdf = bend(cylinder(0.3, 2.0), 0.5);
    // At origin, still inside
    expect(evaluateSdf(sdf, [0, 0, 0])).toBeLessThan(0);
  });
});

describe('evaluateSdf — repeat', () => {
  it('repeats a sphere at origin', () => {
    const sdf = repeat(sphere(0.3), [2, 2, 2]);
    // At origin, should be inside sphere
    expect(evaluateSdf(sdf, [0, 0, 0])).toBeCloseTo(-0.3);
  });

  it('repeats a sphere at one period away', () => {
    const sdf = repeat(sphere(0.3), [2, 2, 2]);
    // At [2, 0, 0], it wraps back to origin in the repeated domain
    expect(evaluateSdf(sdf, [2, 0, 0])).toBeCloseTo(-0.3);
  });

  it('between repeats should be outside', () => {
    const sdf = repeat(sphere(0.3), [2, 2, 2]);
    // At [1, 0, 0], midpoint between repeats — should be outside
    expect(evaluateSdf(sdf, [1, 0, 0])).toBeGreaterThan(0);
  });
});

describe('evaluateSdf — mirror', () => {
  it('mirrors along x — negative x maps to positive', () => {
    // Translate sphere to [1,0,0], then mirror x
    // At [-1,0,0] (mirrored to [1,0,0]) should be inside
    const sdf = mirror(translate(sphere(0.3), [1, 0, 0]), 'x');
    expect(evaluateSdf(sdf, [-1, 0, 0])).toBeCloseTo(-0.3);
    expect(evaluateSdf(sdf, [1, 0, 0])).toBeCloseTo(-0.3);
  });

  it('mirrors along y', () => {
    const sdf = mirror(translate(sphere(0.3), [0, 1, 0]), 'y');
    expect(evaluateSdf(sdf, [0, -1, 0])).toBeCloseTo(-0.3);
  });

  it('mirrors along z', () => {
    const sdf = mirror(translate(sphere(0.3), [0, 0, 1]), 'z');
    expect(evaluateSdf(sdf, [0, 0, -1])).toBeCloseTo(-0.3);
  });
});

describe('evaluateSdf — elongate', () => {
  it('elongated sphere becomes capsule-like', () => {
    // elongate(sphere(0.5), [0, 0.5, 0]) stretches sphere along y by 0.5
    // At origin, the clamped value is 0, so q = [0,0,0], sphere = -0.5
    const sdf = elongate(sphere(0.5), [0, 0.5, 0]);
    expect(evaluateSdf(sdf, [0, 0, 0])).toBeCloseTo(-0.5);
  });

  it('elongated sphere: inside the elongated region', () => {
    // At [0, 0.3, 0]: q = [0, 0.3 - clamp(0.3, -0.5, 0.5), 0] = [0, 0, 0]
    // sphere at [0,0,0] = -0.5
    const sdf = elongate(sphere(0.5), [0, 0.5, 0]);
    expect(evaluateSdf(sdf, [0, 0.3, 0])).toBeCloseTo(-0.5);
  });

  it('elongated sphere: outside beyond elongation', () => {
    // At [0, 2, 0]: q = [0, 2 - 0.5, 0] = [0, 1.5, 0]
    // sphere at [0,1.5,0] = 1.5 - 0.5 = 1.0
    const sdf = elongate(sphere(0.5), [0, 0.5, 0]);
    expect(evaluateSdf(sdf, [0, 2, 0])).toBeCloseTo(1.0);
  });
});

describe('evaluateSdf — metaball', () => {
  it('returns negative at center of single ball (inside)', () => {
    const sdf = metaball([{ position: [0, 0, 0], radius: 1 }], 1.0);
    // At origin: sum = (1^2) / (0 + 1e-10) → very large → threshold - sum << 0
    expect(evaluateSdf(sdf, [0, 0, 0])).toBeLessThan(0);
  });

  it('returns positive far away (outside)', () => {
    const sdf = metaball([{ position: [0, 0, 0], radius: 0.5 }], 1.0);
    // At [10, 0, 0]: sum = 0.25 / 100 = 0.0025, result = 1.0 - 0.0025 > 0
    expect(evaluateSdf(sdf, [10, 0, 0])).toBeGreaterThan(0);
  });

  it('two balls merge in the middle', () => {
    const sdf = metaball([
      { position: [-0.5, 0, 0], radius: 0.5 },
      { position: [0.5, 0, 0], radius: 0.5 },
    ], 1.0);
    // At origin: midpoint of two balls
    // sum = 0.25/0.25 + 0.25/0.25 = 1 + 1 = 2
    // result = 1.0 - 2 = -1.0 (inside merged blob)
    expect(evaluateSdf(sdf, [0, 0, 0])).toBeCloseTo(-1.0);
  });

  it('uses custom threshold', () => {
    const sdf = metaball([{ position: [0, 0, 0], radius: 0.5 }], 2.0);
    // At [1, 0, 0]: sum = 0.25 / 1 = 0.25, result = 2.0 - 0.25 = 1.75
    expect(evaluateSdf(sdf, [1, 0, 0])).toBeCloseTo(1.75);
  });
});

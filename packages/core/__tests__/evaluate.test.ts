import { describe, it, expect, beforeEach } from 'vitest';
import { _resetIds } from '../src/nodes/types.js';
import { sphere, box, torus, cylinder, capsule, cone, plane } from '../src/sdf/primitives.js';
import { union, smoothUnion, subtract, onion } from '../src/sdf/boolean.js';
import { translate, scale, rotate } from '../src/sdf/transforms.js';
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

import { describe, it, expect, beforeEach } from 'vitest';
import { _resetIds } from '../src/nodes/types.js';
import { color, gradient, noiseColor } from '../src/nodes/color.js';
import { size } from '../src/nodes/size.js';
import { opacity } from '../src/nodes/opacity.js';
import { field } from '../src/nodes/field.js';
import { shape } from '../src/nodes/shape.js';
import { grid } from '../src/nodes/grid.js';
import { sphere } from '../src/sdf/primitives.js';

beforeEach(() => {
  _resetIds();
});

describe('color()', () => {
  it('returns correct type', () => {
    const n = color({ primary: '#ff0000', accent: '#0000ff' });
    expect(n.type).toBe('color');
  });

  it('default mode is "depth"', () => {
    const n = color({ primary: '#ff0000', accent: '#0000ff' });
    expect(n.mode).toBe('depth');
  });

  it('stores primary and accent', () => {
    const n = color({ primary: '#ff0000', accent: '#00ff00' });
    expect(n.primary).toBe('#ff0000');
    expect(n.accent).toBe('#00ff00');
  });

  it('accepts explicit mode', () => {
    const n = color({ primary: '#ff0000', accent: '#0000ff', mode: 'position' });
    expect(n.mode).toBe('position');
  });

  it('has a unique id', () => {
    const n1 = color({ primary: '#ff0000', accent: '#0000ff' });
    const n2 = color({ primary: '#ff0000', accent: '#0000ff' });
    expect(n1.id).not.toBe(n2.id);
  });
});

describe('gradient()', () => {
  it('returns correct type', () => {
    const n = gradient({ axis: 'y', stops: [['#ff0000', 0], ['#0000ff', 1]] });
    expect(n.type).toBe('gradientColor');
  });

  it('stores axis', () => {
    const n = gradient({ axis: 'x', stops: [['#ff0000', 0], ['#0000ff', 1]] });
    expect(n.axis).toBe('x');
  });

  it('stores stops', () => {
    const stops: [string, number][] = [['#ff0000', 0], ['#00ff00', 0.5], ['#0000ff', 1]];
    const n = gradient({ axis: 'z', stops });
    expect(n.stops).toEqual(stops);
  });

  it('has a unique id', () => {
    const n1 = gradient({ axis: 'y', stops: [['#ff0000', 0], ['#0000ff', 1]] });
    const n2 = gradient({ axis: 'y', stops: [['#ff0000', 0], ['#0000ff', 1]] });
    expect(n1.id).not.toBe(n2.id);
  });
});

describe('noiseColor()', () => {
  it('returns correct type', () => {
    const n = noiseColor({ palette: ['#ff0000', '#00ff00', '#0000ff'], scale: 1.5, speed: 0.3 });
    expect(n.type).toBe('noiseColor');
  });

  it('stores palette, scale, speed', () => {
    const palette = ['#aabbcc', '#112233'];
    const n = noiseColor({ palette, scale: 2.0, speed: 0.5 });
    expect(n.palette).toEqual(palette);
    expect(n.scale).toBe(2.0);
    expect(n.speed).toBe(0.5);
  });

  it('has a unique id', () => {
    const n1 = noiseColor({ palette: ['#ff0000'], scale: 1.0, speed: 0.5 });
    const n2 = noiseColor({ palette: ['#ff0000'], scale: 1.0, speed: 0.5 });
    expect(n1.id).not.toBe(n2.id);
  });
});

describe('size()', () => {
  it('returns correct type', () => {
    const n = size({ min: 0.1, max: 1.0 });
    expect(n.type).toBe('size');
  });

  it('stores min and max', () => {
    const n = size({ min: 0.2, max: 0.8 });
    expect(n.min).toBe(0.2);
    expect(n.max).toBe(0.8);
  });

  it('default mode is "depth"', () => {
    const n = size({ min: 0.1, max: 1.0 });
    expect(n.mode).toBe('depth');
  });

  it('accepts explicit mode "uniform"', () => {
    const n = size({ min: 0.5, max: 0.5, mode: 'uniform' });
    expect(n.mode).toBe('uniform');
  });

  it('has a unique id', () => {
    const n1 = size({ min: 0.1, max: 1.0 });
    const n2 = size({ min: 0.1, max: 1.0 });
    expect(n1.id).not.toBe(n2.id);
  });
});

describe('opacity()', () => {
  it('returns correct type', () => {
    const n = opacity({ min: 0.0, max: 1.0 });
    expect(n.type).toBe('opacity');
  });

  it('stores min and max', () => {
    const n = opacity({ min: 0.3, max: 0.9 });
    expect(n.min).toBe(0.3);
    expect(n.max).toBe(0.9);
  });

  it('default mode is "depth"', () => {
    const n = opacity({ min: 0.0, max: 1.0 });
    expect(n.mode).toBe('depth');
  });

  it('accepts mode "edgeGlow"', () => {
    const n = opacity({ min: 0.2, max: 1.0, mode: 'edgeGlow' });
    expect(n.mode).toBe('edgeGlow');
  });

  it('accepts mode "uniform"', () => {
    const n = opacity({ min: 0.5, max: 0.5, mode: 'uniform' });
    expect(n.mode).toBe('uniform');
  });

  it('has a unique id', () => {
    const n1 = opacity({ min: 0.0, max: 1.0 });
    const n2 = opacity({ min: 0.0, max: 1.0 });
    expect(n1.id).not.toBe(n2.id);
  });
});

describe('color nodes compose in field()', () => {
  it('color node composes in field', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      color({ primary: '#ff0000', accent: '#0000ff' }),
    );
    expect(f.type).toBe('field');
    expect(f.children).toHaveLength(3);
    expect(f.children[2].type).toBe('color');
  });

  it('gradient node composes in field', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      gradient({ axis: 'y', stops: [['#ff0000', 0], ['#0000ff', 1]] }),
    );
    expect(f.children[2].type).toBe('gradientColor');
  });

  it('noiseColor node composes in field', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      noiseColor({ palette: ['#ff0000', '#00ff00'], scale: 1.0, speed: 0.5 }),
    );
    expect(f.children[2].type).toBe('noiseColor');
  });

  it('size node composes in field', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      size({ min: 0.5, max: 1.0 }),
    );
    expect(f.children[2].type).toBe('size');
  });

  it('opacity node composes in field', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      opacity({ min: 0.3, max: 1.0, mode: 'edgeGlow' }),
    );
    expect(f.children[2].type).toBe('opacity');
  });

  it('all node types compose together', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      color({ primary: '#ff0000', accent: '#0000ff', mode: 'depth' }),
      size({ min: 0.5, max: 1.0 }),
      opacity({ min: 0.2, max: 1.0, mode: 'edgeGlow' }),
    );
    expect(f.children).toHaveLength(5);
  });
});

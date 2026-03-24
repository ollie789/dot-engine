import { describe, it, expect, beforeEach } from 'vitest';
import { imageField } from '../src/nodes/image-field.js';
import { field, shape, sphere, grid } from '../src/index.js';
import { _resetIds } from '../src/nodes/types.js';

beforeEach(() => {
  _resetIds();
});

describe('imageField()', () => {
  it('creates a node with type "imageField"', () => {
    const n = imageField('my_texture');
    expect(n.type).toBe('imageField');
  });

  it('stores textureId', () => {
    const n = imageField('my_texture');
    expect(n.textureId).toBe('my_texture');
  });

  it('default mode is "brightness"', () => {
    const n = imageField('my_texture');
    expect(n.mode).toBe('brightness');
  });

  it('default colorFromImage is false', () => {
    const n = imageField('my_texture');
    expect(n.colorFromImage).toBe(false);
  });

  it('default threshold is undefined (uses shader default)', () => {
    const n = imageField('my_texture');
    expect(n.threshold).toBeUndefined();
  });

  it('accepts mode "alpha"', () => {
    const n = imageField('my_texture', { mode: 'alpha' });
    expect(n.mode).toBe('alpha');
  });

  it('accepts colorFromImage: true', () => {
    const n = imageField('my_texture', { colorFromImage: true });
    expect(n.colorFromImage).toBe(true);
  });

  it('accepts threshold option', () => {
    const n = imageField('my_texture', { threshold: 0.3 });
    expect(n.threshold).toBe(0.3);
  });

  it('accepts depth option', () => {
    const n = imageField('my_texture', { depth: 0.2 });
    expect(n.depth).toBe(0.2);
  });

  it('assigns a unique id', () => {
    const a = imageField('my_texture');
    const b = imageField('my_texture');
    expect(a.id).not.toBe(b.id);
  });

  it('composes in field()', () => {
    const f = field(
      shape(sphere(0.5)),
      grid({ type: 'uniform', resolution: [10, 10, 10] }),
      imageField('tex1'),
    );
    const imgNode = f.children.find((c) => c.type === 'imageField');
    expect(imgNode).toBeDefined();
    expect((imgNode as ReturnType<typeof imageField>).textureId).toBe('tex1');
  });
});

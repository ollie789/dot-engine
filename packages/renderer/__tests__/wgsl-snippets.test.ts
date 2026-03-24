import { describe, it, expect } from 'vitest';
import {
  sphere,
  torus,
  smoothUnion,
  translate,
  box,
  union,
  subtract,
  intersect,
  smoothSubtract,
  smoothIntersect,
  onion,
} from '../../core/src/index.js';
import { wgslForNode, collectWgslSnippets } from '../src/compiler/wgsl-snippets.js';

describe('wgslForNode', () => {
  it('sphere emits WGSL fn with length(p)', () => {
    const node = sphere(0.5);
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('fn sdf_');
    expect(wgsl).toContain('(p: vec3f) -> f32');
    expect(wgsl).toContain('length(p)');
    expect(wgsl).toContain('0.5');
  });

  it('torus emits vec2f and length(p.xz)', () => {
    const node = torus(1.0, 0.25);
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('vec2f(length(p.xz)');
    expect(wgsl).toContain('1.0');
    expect(wgsl).toContain('0.25');
  });

  it('smoothUnion emits smin call with k value', () => {
    const node = smoothUnion(sphere(0.5), sphere(0.3), 0.2);
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('smin(');
    expect(wgsl).toContain('0.2');
  });

  it('translate emits vec3f offset subtraction', () => {
    const node = translate(sphere(0.5), [1, 2, 3]);
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('p - vec3f(');
    expect(wgsl).toContain('1.0');
    expect(wgsl).toContain('2.0');
    expect(wgsl).toContain('3.0');
  });

  it('box emits abs(p) pattern with vec3f', () => {
    const node = box([0.5, 0.5, 0.5]);
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('abs(p)');
    expect(wgsl).toContain('vec3f(');
  });

  it('union emits min() call', () => {
    const node = union(sphere(0.5), sphere(0.3));
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('min(');
  });

  it('subtract emits max(a, -b) pattern', () => {
    const node = subtract(sphere(0.5), sphere(0.3));
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('max(');
    expect(wgsl).toContain('-sdf_');
  });

  it('intersect emits max() call', () => {
    const node = intersect(sphere(0.5), sphere(0.3));
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('max(');
  });

  it('smoothSubtract emits -smin pattern', () => {
    const node = smoothSubtract(sphere(0.5), sphere(0.3), 0.1);
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('-smin(');
  });

  it('smoothIntersect emits -smin with negated args', () => {
    const node = smoothIntersect(sphere(0.5), sphere(0.3), 0.1);
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('-smin(-');
  });

  it('onion emits abs(child(p)) pattern', () => {
    const node = onion(sphere(0.5), 0.1);
    const wgsl = wgslForNode(node);
    expect(wgsl).toContain('abs(');
  });
});

describe('collectWgslSnippets', () => {
  it('returns root function name', () => {
    const node = sphere(0.5);
    const { root, snippets } = collectWgslSnippets(node);
    expect(root).toBe(`sdf_${node.id}`);
    expect(snippets).toHaveLength(1);
    expect(snippets[0].fnName).toBe(root);
  });

  it('orders child snippets before parent for smoothUnion', () => {
    const a = sphere(0.5);
    const b = sphere(0.3);
    const su = smoothUnion(a, b, 0.1);
    const { root, snippets } = collectWgslSnippets(su);
    const names = snippets.map((s) => s.fnName);
    const rootIdx = names.indexOf(root);
    const aIdx = names.indexOf(`sdf_${a.id}`);
    const bIdx = names.indexOf(`sdf_${b.id}`);
    expect(aIdx).toBeLessThan(rootIdx);
    expect(bIdx).toBeLessThan(rootIdx);
  });

  it('each snippet references function name in code', () => {
    const node = sphere(0.5);
    const { snippets } = collectWgslSnippets(node);
    for (const snippet of snippets) {
      expect(snippet.code).toContain(snippet.fnName);
    }
  });

  it('all boolean ops emit correct WGSL function signatures', () => {
    const a = sphere(0.4);
    const b = sphere(0.3);

    for (const node of [
      union(a, b),
      subtract(a, b),
      intersect(a, b),
      smoothUnion(a, b, 0.1),
      smoothSubtract(a, b, 0.1),
      smoothIntersect(a, b, 0.1),
    ]) {
      const wgsl = wgslForNode(node);
      expect(wgsl).toContain('fn sdf_');
      expect(wgsl).toContain('(p: vec3f) -> f32');
    }
  });
});

import { describe, it, expect } from 'vitest';
import { sphere, torus, smoothUnion, translate, twist, bend, repeat, mirror, elongate, metaball } from '../../core/src/index.js';
import { glslForNode, collectSnippets } from '../src/compiler/snippets.js';

describe('glslForNode', () => {
  it('sphere emits length(p) and radius value', () => {
    const node = sphere(0.5);
    const glsl = glslForNode(node);
    expect(glsl).toContain('length(p)');
    expect(glsl).toContain('0.5');
  });

  it('torus emits length(p.xz) and both radii', () => {
    const node = torus(1.0, 0.25);
    const glsl = glslForNode(node);
    expect(glsl).toContain('length(p.xz)');
    expect(glsl).toContain('1.0');
    expect(glsl).toContain('0.25');
  });

  it('smoothUnion emits smin call with k value', () => {
    const node = smoothUnion(sphere(0.5), sphere(0.3), 0.2);
    const glsl = glslForNode(node);
    expect(glsl).toContain('smin(');
    expect(glsl).toContain('0.2');
  });

  it('translate emits vec3 offset subtraction', () => {
    const node = translate(sphere(0.5), [1, 2, 3]);
    const glsl = glslForNode(node);
    expect(glsl).toContain('p - vec3(');
    expect(glsl).toContain('1.0');
    expect(glsl).toContain('2.0');
    expect(glsl).toContain('3.0');
  });

  it('twist emits cos/sin rotation of xz plane', () => {
    const node = twist(sphere(0.5), 1.5);
    const glsl = glslForNode(node);
    expect(glsl).toContain('cos(angle)');
    expect(glsl).toContain('sin(angle)');
    expect(glsl).toContain('1.5');
  });

  it('bend emits cos/sin bending', () => {
    const node = bend(sphere(0.5), 0.8);
    const glsl = glslForNode(node);
    expect(glsl).toContain('cos(');
    expect(glsl).toContain('sin(');
    expect(glsl).toContain('0.8');
  });

  it('repeat emits mod pattern', () => {
    const node = repeat(sphere(0.3), [2, 2, 2]);
    const glsl = glslForNode(node);
    expect(glsl).toContain('mod(');
    expect(glsl).toContain('2.0');
  });

  it('mirror emits abs on axis', () => {
    const node = mirror(sphere(0.5), 'x');
    const glsl = glslForNode(node);
    expect(glsl).toContain('abs(q.x)');
  });

  it('mirror y emits abs on y axis', () => {
    const node = mirror(sphere(0.5), 'y');
    const glsl = glslForNode(node);
    expect(glsl).toContain('abs(q.y)');
  });

  it('elongate emits clamp pattern', () => {
    const node = elongate(sphere(0.5), [0.1, 0.2, 0.3]);
    const glsl = glslForNode(node);
    expect(glsl).toContain('clamp(p, -amt, amt)');
    expect(glsl).toContain('0.1');
    expect(glsl).toContain('0.2');
    expect(glsl).toContain('0.3');
  });

  it('metaball emits sum pattern with centers', () => {
    const node = metaball([
      { position: [0, 0, 0], radius: 0.5 },
      { position: [1, 0, 0], radius: 0.3 },
    ]);
    const glsl = glslForNode(node);
    expect(glsl).toContain('sum');
    expect(glsl).toContain('dist2');
    // Should have two center blocks
    expect(glsl).toContain('0.25'); // 0.5^2
    expect(glsl).toContain('0.09'); // 0.3^2
  });
});

describe('collectSnippets — GLSL', () => {
  it('returns root function name', () => {
    const node = sphere(0.5);
    const { root, snippets } = collectSnippets(node);
    expect(root).toBe(`sdf_${node.id}`);
    expect(snippets).toHaveLength(1);
    expect(snippets[0].fnName).toBe(root);
  });

  it('orders child snippets before parent for smoothUnion', () => {
    const a = sphere(0.5);
    const b = sphere(0.3);
    const su = smoothUnion(a, b, 0.1);
    const { root, snippets } = collectSnippets(su);
    const names = snippets.map((s) => s.fnName);
    const rootIdx = names.indexOf(root);
    const aIdx = names.indexOf(`sdf_${a.id}`);
    const bIdx = names.indexOf(`sdf_${b.id}`);
    expect(aIdx).toBeLessThan(rootIdx);
    expect(bIdx).toBeLessThan(rootIdx);
  });

  it('each snippet references function name in code', () => {
    const node = sphere(0.5);
    const { snippets } = collectSnippets(node);
    for (const snippet of snippets) {
      expect(snippet.code).toContain(snippet.fnName);
    }
  });
});

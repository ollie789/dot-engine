import { describe, it, expect } from 'vitest';
import { sphere, torus, smoothUnion, translate } from '../../core/src/index.js';
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
});

describe('collectSnippets', () => {
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

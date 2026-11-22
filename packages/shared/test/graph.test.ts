import { describe, expect, it } from 'vitest';
import { MultiUndirectedGraph } from 'graphology';
import { buildPlayerGraph, isTicketComplete } from '../src/graph/playerGraph';
import { longestTrail, longestTrailRoutes } from '../src/graph/longest';
import { makeState } from './helpers';

function graphOf(edges: [string, string, number][]) {
  const g = new MultiUndirectedGraph();
  edges.forEach(([a, b, length], i) => {
    g.mergeNode(a);
    g.mergeNode(b);
    g.addEdgeWithKey(`e${i}`, a, b, { length });
  });
  return g;
}

describe('player graph', () => {
  it('contains only that player\'s routes, weighted by length', () => {
    const G = makeState({ claims: { 'LV-PHX': '0', 'PHX-ELP': '0', 'STL-MEM': '1' } });
    const g = buildPlayerGraph(G, '0');
    expect(g.size).toBe(2);
    expect(g.hasNode('STL')).toBe(false);
    expect(g.getEdgeAttribute('PHX-ELP', 'length')).toBe(3);
  });

  it('a ticket is complete when a chain of the player\'s routes joins its cities', () => {
    const G = makeState({ claims: { 'LA-LV': '0', 'LV-PHX': '0', 'PHX-ELP': '0', 'AMA-OKC': '0' } });
    const g = buildPlayerGraph(G, '0');
    expect(isTicketComplete(g, { a: 'LA', b: 'ELP' })).toBe(true);
    expect(isTicketComplete(g, { a: 'LA', b: 'OKC' })).toBe(false);
    expect(isTicketComplete(g, { a: 'SEA', b: 'POR' })).toBe(false);
  });
});

describe('longest continuous trail', () => {
  it('is 0 with no routes', () => {
    expect(longestTrail(new MultiUndirectedGraph())).toBe(0);
  });

  it('follows a simple path', () => {
    expect(longestTrail(graphOf([['A', 'B', 3], ['B', 'C', 2], ['C', 'D', 4]]))).toBe(9);
  });

  it('counts every edge of a loop', () => {
    expect(longestTrail(graphOf([['A', 'B', 2], ['B', 'C', 2], ['C', 'A', 2], ['C', 'D', 5]]))).toBe(11);
  });

  it('a T-junction counts the stem plus only the longer branch', () => {
    expect(longestTrail(graphOf([['A', 'B', 4], ['B', 'C', 3], ['B', 'D', 1]]))).toBe(7);
  });

  it('a figure-eight passes the shared city twice using every edge once', () => {
    const g = graphOf([['A', 'B', 1], ['B', 'X', 1], ['X', 'A', 1], ['X', 'C', 1], ['C', 'D', 1], ['D', 'X', 1]]);
    expect(longestTrail(g)).toBe(6);
  });

  it('never reuses an edge (a star cannot be walked out and back)', () => {
    expect(longestTrail(graphOf([['H', 'A', 5], ['H', 'B', 5], ['H', 'C', 5]]))).toBe(10);
  });

  it('counts parallel edges between the same cities separately', () => {
    expect(longestTrail(graphOf([['A', 'B', 2], ['A', 'B', 2], ['B', 'C', 1]]))).toBe(5);
  });

  it('takes the best of disconnected pieces', () => {
    expect(longestTrail(graphOf([['A', 'B', 2], ['C', 'D', 6]]))).toBe(6);
  });
});

describe('longestTrailRoutes', () => {
  const len = (g: MultiUndirectedGraph, ids: string[]) => ids.reduce((s, e) => s + (g.getEdgeAttribute(e, 'length') as number), 0);

  it('is empty for an empty graph', () => {
    expect(longestTrailRoutes(new MultiUndirectedGraph())).toEqual([]);
  });

  it.each([
    [[['A', 'B', 3], ['B', 'C', 2], ['C', 'D', 4]]],
    [[['A', 'B', 2], ['B', 'C', 2], ['C', 'A', 2], ['C', 'D', 5]]],
    [[['A', 'B', 4], ['B', 'C', 3], ['B', 'D', 1]]],
    [[['H', 'A', 5], ['H', 'B', 5], ['H', 'C', 5]]],
    [[['A', 'B', 2], ['C', 'D', 6]]],
  ] as [string, string, number][][][])('returns distinct edges adding up to the longest trail', (edges) => {
    const g = graphOf(edges);
    const ids = longestTrailRoutes(g);
    expect(new Set(ids).size).toBe(ids.length);
    expect(len(g, ids)).toBe(longestTrail(g));
  });
});

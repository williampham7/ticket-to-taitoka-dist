import type { MultiUndirectedGraph } from 'graphology';

/**
 * Longest continuous path as an edge-disjoint trail: cities may repeat (loops allowed),
 * but no route is used twice. Exhaustive DFS from every city — player graphs are small (≤50 trains).
 */
export function longestTrail(g: MultiUndirectedGraph): number {
  const used = new Set<string>();
  let best = 0;

  const dfs = (node: string, total: number) => {
    if (total > best) best = total;
    g.forEachEdge(node, (edge, attr, source, target) => {
      if (used.has(edge)) return;
      used.add(edge);
      dfs(source === node ? target : source, total + (attr.length as number));
      used.delete(edge);
    });
  };

  g.forEachNode((n) => dfs(n, 0));
  return best;
}

/** The edges (route ids) of one longest trail, in walking order; [] for an empty graph. */
export function longestTrailRoutes(g: MultiUndirectedGraph): string[] {
  const used: string[] = [];
  let best = 0, bestEdges: string[] = [];

  const dfs = (node: string, total: number) => {
    if (total > best) { best = total; bestEdges = [...used]; }
    g.forEachEdge(node, (edge, attr, source, target) => {
      if (used.includes(edge)) return;
      used.push(edge);
      dfs(source === node ? target : source, total + (attr.length as number));
      used.pop();
    });
  };

  g.forEachNode((n) => dfs(n, 0));
  return bestEdges;
}

/**
 * Dijkstra - Reference shortest path
 * O((V+E) log V) with binary heap
 * Returns identical shape to A* for direct comparability
 */

import type { Graph } from './Graph';
import { BinaryHeap } from './BinaryHeap';
import type { PathResult } from '../domain/types';

interface DijkstraNode {
  id: string;
  cost: number;
}

export function dijkstra(
  graph: Graph,
  start: string,
  goal: string
): PathResult {
  const t0 = performance.now();
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();
  let visitedCount = 0;

  // Init
  for (const node of graph.getAllNodes()) {
    dist.set(node.id, Infinity);
    prev.set(node.id, null);
  }
  dist.set(start, 0);

  const heap = new BinaryHeap<DijkstraNode>(
    (a, b) => a.cost - b.cost,
    (n) => n.id
  );
  heap.push({ id: start, cost: 0 });

  while (!heap.isEmpty()) {
    const current = heap.pop()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    visitedCount++;

    if (current.id === goal) break;

    // If we popped a stale entry with higher cost than known, skip
    if (current.cost > (dist.get(current.id) ?? Infinity)) continue;

    // neighbors() already skips closed edges structurally
    for (const edge of graph.neighbors(current.id)) {
      if (visited.has(edge.to)) continue;
      const alt = (dist.get(current.id) ?? Infinity) + edge.travelTime;
      if (alt < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, current.id);
        heap.push({ id: edge.to, cost: alt });
      }
    }
  }

  const totalCost = dist.get(goal) ?? Infinity;
  const feasible = totalCost !== Infinity;

  // Reconstruct path
  const path: string[] = [];
  if (feasible) {
    let cur: string | null = goal;
    while (cur) {
      path.unshift(cur);
      cur = prev.get(cur) ?? null;
    }
  }

  const t1 = performance.now();
  return {
    path,
    totalCost: feasible ? totalCost : Infinity,
    visitedNodes: visitedCount,
    executionTimeMs: t1 - t0,
    feasible,
  };
}

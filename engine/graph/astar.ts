/**
 * A* - Primary pathfinder
 * f(n) = g(n) + h(n), Euclidean heuristic admissible
 * O((V+E) log V) with binary heap
 */

import type { Graph } from './Graph';
import { BinaryHeap } from './BinaryHeap';
import type { PathResult } from '../domain/types';

interface AStarNode {
  id: string;
  f: number; // g + h
  g: number;
}

type HeuristicFn = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => number;

function euclideanHeuristic(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  // Euclidean distance in degree space scaled to approximate travel time
  // Admissible: never overestimates if scale factor <= min edge time per degree
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  const degDist = Math.sqrt(dLat * dLat + dLng * dLng);
  // Rough conversion: 1 degree ~ 111km, assume 60km/h avg => ~1.85h per degree ~111 min
  // Use 30 min per degree to stay admissible (underestimate)
  return degDist * 30;
}

export function astar(
  graph: Graph,
  start: string,
  goal: string,
  heuristicFn: HeuristicFn = euclideanHeuristic
): PathResult {
  const t0 = performance.now();

  const startNode = graph.getNode(start);
  const goalNode = graph.getNode(goal);

  if (!startNode || !goalNode) {
    return {
      path: [],
      totalCost: Infinity,
      visitedNodes: 0,
      executionTimeMs: performance.now() - t0,
      feasible: false,
    };
  }

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();
  const inOpenSet = new Set<string>();
  let visitedCount = 0;

  for (const node of graph.getAllNodes()) {
    gScore.set(node.id, Infinity);
    fScore.set(node.id, Infinity);
    prev.set(node.id, null);
  }

  gScore.set(start, 0);
  const hStart = heuristicFn(startNode, goalNode);
  fScore.set(start, hStart);

  const openHeap = new BinaryHeap<AStarNode>(
    (a, b) => a.f - b.f,
    (n) => n.id
  );
  openHeap.push({ id: start, f: hStart, g: 0 });
  inOpenSet.add(start);

  while (!openHeap.isEmpty()) {
    const current = openHeap.pop()!;
    inOpenSet.delete(current.id);

    if (visited.has(current.id)) continue;
    visited.add(current.id);
    visitedCount++;

    if (current.id === goal) break;

    // Skip stale entries
    if (current.g > (gScore.get(current.id) ?? Infinity)) continue;

    for (const edge of graph.neighbors(current.id)) {
      if (visited.has(edge.to)) continue;
      const tentativeG = (gScore.get(current.id) ?? Infinity) + edge.travelTime;
      if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
        prev.set(edge.to, current.id);
        gScore.set(edge.to, tentativeG);
        const toNode = graph.getNode(edge.to);
        const h = toNode ? heuristicFn(toNode, goalNode) : 0;
        const f = tentativeG + h;
        fScore.set(edge.to, f);
        if (!inOpenSet.has(edge.to)) {
          openHeap.push({ id: edge.to, f, g: tentativeG });
          inOpenSet.add(edge.to);
        } else {
          // Update existing
          openHeap.decreaseKey(edge.to, { id: edge.to, f, g: tentativeG });
        }
      }
    }
  }

  const totalCost = gScore.get(goal) ?? Infinity;
  const feasible = totalCost !== Infinity;

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

export { euclideanHeuristic };

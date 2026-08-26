/**
 * runBenchmark - Live proof of correctness and efficiency
 * Runs A* and Dijkstra across batch of random origin/destination pairs
 * Returns { avgMs, p95Ms, nodesVisitedAvg, requestsPerSecond } for both + costsMatch
 */

import { Graph } from '../graph/Graph';
import { dijkstra } from '../graph/dijkstra';
import { astar } from '../graph/astar';
import { generateSyntheticGraph } from '../graph/syntheticGraph';

export interface AlgorithmMetrics {
  avgMs: number;
  p95Ms: number;
  p50Ms: number;
  nodesVisitedAvg: number;
  requestsPerSecond: number;
  totalMs: number;
}

export interface BenchmarkResult {
  graphSize: { nodes: number; edges: number };
  pairCount: number;
  aStar: AlgorithmMetrics;
  dijkstra: AlgorithmMetrics;
  costsMatch: boolean;
  mismatches: number;
  speedUp: number; // dijkstra avg / aStar avg
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export function runBenchmark(
  graphOrSize: Graph | number,
  pairCount: number = 50,
  seed: number = 123
): BenchmarkResult {
  let graph: Graph;
  let nodes: number;

  if (typeof graphOrSize === 'number') {
    nodes = graphOrSize;
    // O(n log n) generation, well under a second for 50k nodes per requirement
    const t0 = performance.now();
    graph = generateSyntheticGraph(nodes, 4, seed);
    const genTime = performance.now() - t0;
    console.log(`[Benchmark] Generated ${nodes} nodes in ${genTime.toFixed(1)}ms`);
  } else {
    graph = graphOrSize;
    nodes = graph.nodeCount();
  }

  const allNodes = graph.getAllNodes();
  const edges = graph.edgeCount();

  // Generate random pairs deterministically
  const pairs: [string, string][] = [];
  let rngState = seed;
  const rng = () => {
    rngState ^= rngState << 13;
    rngState ^= rngState >>> 17;
    rngState ^= rngState << 5;
    rngState >>>= 0;
    return rngState / 0xffffffff;
  };

  for (let i = 0; i < pairCount; i++) {
    const a = allNodes[Math.floor(rng() * allNodes.length)];
    let b = allNodes[Math.floor(rng() * allNodes.length)];
    // Ensure different nodes
    let attempts = 0;
    while (b.id === a.id && attempts < 10) {
      b = allNodes[Math.floor(rng() * allNodes.length)];
      attempts++;
    }
    pairs.push([a.id, b.id]);
  }

  const aStarTimes: number[] = [];
  const dijkstraTimes: number[] = [];
  const aStarVisited: number[] = [];
  const dijkstraVisited: number[] = [];
  let mismatches = 0;

  // Run Dijkstra batch
  const dijkstraStart = performance.now();
  const dijkstraCosts: number[] = [];
  for (const [from, to] of pairs) {
    const res = dijkstra(graph, from, to);
    dijkstraTimes.push(res.executionTimeMs);
    dijkstraVisited.push(res.visitedNodes);
    dijkstraCosts.push(res.totalCost);
  }
  const dijkstraTotal = performance.now() - dijkstraStart;

  // Run A* batch
  const aStarStart = performance.now();
  const aStarCosts: number[] = [];
  for (const [from, to] of pairs) {
    const res = astar(graph, from, to);
    aStarTimes.push(res.executionTimeMs);
    aStarVisited.push(res.visitedNodes);
    aStarCosts.push(res.totalCost);
  }
  const aStarTotal = performance.now() - aStarStart;

  // Check costs match (allow tiny floating point epsilon)
  for (let i = 0; i < pairCount; i++) {
    const d = dijkstraCosts[i];
    const a = aStarCosts[i];
    if (d === Infinity && a === Infinity) continue;
    if (Math.abs(d - a) > 0.001) mismatches++;
  }

  const costsMatch = mismatches === 0;

  const aStarMetrics: AlgorithmMetrics = {
    avgMs: aStarTimes.reduce((s, v) => s + v, 0) / aStarTimes.length,
    p95Ms: percentile(aStarTimes, 95),
    p50Ms: percentile(aStarTimes, 50),
    nodesVisitedAvg: aStarVisited.reduce((s, v) => s + v, 0) / aStarVisited.length,
    requestsPerSecond: (pairCount / aStarTotal) * 1000,
    totalMs: aStarTotal,
  };

  const dijkstraMetrics: AlgorithmMetrics = {
    avgMs: dijkstraTimes.reduce((s, v) => s + v, 0) / dijkstraTimes.length,
    p95Ms: percentile(dijkstraTimes, 95),
    p50Ms: percentile(dijkstraTimes, 50),
    nodesVisitedAvg: dijkstraVisited.reduce((s, v) => s + v, 0) / dijkstraVisited.length,
    requestsPerSecond: (pairCount / dijkstraTotal) * 1000,
    totalMs: dijkstraTotal,
  };

  return {
    graphSize: { nodes, edges },
    pairCount,
    aStar: aStarMetrics,
    dijkstra: dijkstraMetrics,
    costsMatch,
    mismatches,
    speedUp: dijkstraMetrics.avgMs / Math.max(aStarMetrics.avgMs, 0.001),
  };
}

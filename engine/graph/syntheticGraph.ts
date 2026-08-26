/**
 * syntheticGraph - Generates road-like network, not random noise
 * - Poisson-disc-ish spacing via grid jitter
 * - k-nearest neighbor connections
 * - Union-Find connectivity guarantee
 * Deterministic via seeded RNG
 * Performance: O(n log n) for kNN (with spatial buckets), O(n α(n)) for union-find
 */

import { Graph } from './Graph';
import type { GraphNode, RoadEdge } from '../domain/types';

class SeededRNG {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    // xorshift32
    this.s ^= this.s << 13;
    this.s ^= this.s >>> 17;
    this.s ^= this.s << 5;
    this.s >>>= 0;
    return this.s / 0xffffffff;
  }
  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

class UnionFind {
  parent: number[];
  rank: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }
  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;
    else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;
    else {
      this.parent[rb] = ra;
      this.rank[ra]++;
    }
    return true;
  }
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function travelTimeFromDistance(distDeg: number, rng: SeededRNG): number {
  // Convert degree distance to minutes: ~111km per degree, 40km/h rural avg => ~2.7min per km? Actually 60km/h => 1min per km
  // Use 50km/h base: distKm = distDeg * 111, time = distKm / 50 * 60
  const km = distDeg * 111;
  const base = (km / 50) * 60;
  // Jitter 0.8x-1.4x for road quality
  return base * rng.nextRange(0.8, 1.4);
}

export function generateSyntheticGraph(
  nodeCount: number,
  avgDegree: number = 4,
  seed: number = 42
): Graph {
  const rng = new SeededRNG(seed);
  const graph = new Graph();

  // Region: rural Maharashtra-ish lat/lng bounds
  const latMin = 18.5;
  const latMax = 20.5;
  const lngMin = 73.5;
  const lngMax = 75.5;

  const nodes: GraphNode[] = [];
  const cols = Math.ceil(Math.sqrt(nodeCount));
  const rows = Math.ceil(nodeCount / cols);
  const cellLat = (latMax - latMin) / rows;
  const cellLng = (lngMax - lngMin) / cols;

  // Poisson-disc-ish: grid + jitter
  // O(n)
  let id = 0;
  for (let r = 0; r < rows && nodes.length < nodeCount; r++) {
    for (let c = 0; c < cols && nodes.length < nodeCount; c++) {
      const jitterLat = rng.nextRange(-cellLat * 0.4, cellLat * 0.4);
      const jitterLng = rng.nextRange(-cellLng * 0.4, cellLng * 0.4);
      const lat = latMin + r * cellLat + cellLat * 0.5 + jitterLat;
      const lng = lngMin + c * cellLng + cellLng * 0.5 + jitterLng;
      const type = rng.next() < 0.15 ? 'hospital' : 'village'; // 15% hospitals
      nodes.push({
        id: `node-${id}`,
        lat,
        lng,
        type,
        name: type === 'hospital' ? `Hospital ${id}` : `Village ${id}`,
      });
      id++;
    }
  }

  for (const n of nodes) graph.addNode(n);

  // Spatial index for kNN: simple grid buckets for O(n log n) avg
  // For simplicity at 50k nodes, O(n^2) would be too slow, so we use bucket search
  // Build buckets
  const bucketSize = 0.2; // degrees
  const buckets = new Map<string, GraphNode[]>();
  const bucketKey = (lat: number, lng: number) =>
    `${Math.floor(lat / bucketSize)}:${Math.floor(lng / bucketSize)}`;
  for (const n of nodes) {
    const k = bucketKey(n.lat, n.lng);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(n);
  }

  // For each node, find k nearest neighbors
  // O(n * k * bucketSearch)
  const k = Math.max(2, Math.round(avgDegree));
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const candidates: { other: GraphNode; dist: number }[] = [];

    // Search neighboring buckets (3x3)
    const baseLatBucket = Math.floor(node.lat / bucketSize);
    const baseLngBucket = Math.floor(node.lng / bucketSize);
    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLng = -1; dLng <= 1; dLng++) {
        const key = `${baseLatBucket + dLat}:${baseLngBucket + dLng}`;
        const bucketNodes = buckets.get(key);
        if (!bucketNodes) continue;
        for (const other of bucketNodes) {
          if (other.id === node.id) continue;
          const d = haversineDistance(node.lat, node.lng, other.lat, other.lng);
          candidates.push({ other, dist: d });
        }
      }
    }

    // Sort and take k nearest
    candidates.sort((a, b) => a.dist - b.dist);
    const nearest = candidates.slice(0, k);

    for (const { other, dist } of nearest) {
      const edgeId = `${node.id}->${other.id}`;
      const revId = `${other.id}->${node.id}`;
      if (graph.getEdge(edgeId) || graph.getEdge(revId)) continue;
      const travelTime = travelTimeFromDistance(dist, rng);
      const edge: RoadEdge = {
        id: edgeId,
        from: node.id,
        to: other.id,
        distance: dist * 111, // km
        travelTime,
        status: 'open',
      };
      graph.addEdge(edge);
    }
  }

  // Union-Find to guarantee connectivity
  // O((V+E) α(V))
  const uf = new UnionFind(nodes.length);
  const nodeIndex = new Map<string, number>();
  nodes.forEach((n, idx) => nodeIndex.set(n.id, idx));

  for (const edge of graph.getAllEdges()) {
    const a = nodeIndex.get(edge.from)!;
    const b = nodeIndex.get(edge.to)!;
    uf.union(a, b);
  }

  // Find components
  const components = new Map<number, number[]>();
  for (let i = 0; i < nodes.length; i++) {
    const root = uf.find(i);
    if (!components.has(root)) components.set(root, []);
    components.get(root)!.push(i);
  }

  // Stitch disconnected components to nearest neighbor in another component
  const compRoots = Array.from(components.keys());
  for (let i = 1; i < compRoots.length; i++) {
    const compA = components.get(compRoots[i - 1])!;
    const compB = components.get(compRoots[i])!;
    // Find closest pair between compA and compB
    let bestDist = Infinity;
    let bestPair: [number, number] | null = null;
    // Sample limited for performance at large scale: take first 20 from each
    const sampleA = compA.slice(0, Math.min(20, compA.length));
    const sampleB = compB.slice(0, Math.min(20, compB.length));
    for (const aIdx of sampleA) {
      for (const bIdx of sampleB) {
        const aNode = nodes[aIdx];
        const bNode = nodes[bIdx];
        const d = haversineDistance(aNode.lat, aNode.lng, bNode.lat, bNode.lng);
        if (d < bestDist) {
          bestDist = d;
          bestPair = [aIdx, bIdx];
        }
      }
    }
    if (bestPair) {
      const [aIdx, bIdx] = bestPair;
      const aNode = nodes[aIdx];
      const bNode = nodes[bIdx];
      const travelTime = travelTimeFromDistance(bestDist, rng);
      const edge: RoadEdge = {
        id: `${aNode.id}->${bNode.id}`,
        from: aNode.id,
        to: bNode.id,
        distance: bestDist * 111,
        travelTime,
        status: 'open',
      };
      graph.addEdge(edge);
      uf.union(aIdx, bIdx);
    }
  }

  return graph;
}

/**
 * Graph - Weighted adjacency list
 * O(V+E) space, O(1) edge add, O(degree) neighbor query
 */

import type { GraphNode, RoadEdge } from '../domain/types';

export class Graph {
  private nodes: Map<string, GraphNode> = new Map();
  private adjacency: Map<string, RoadEdge[]> = new Map();
  private edgeMap: Map<string, RoadEdge> = new Map();

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, []);
    }
  }

  addEdge(edge: RoadEdge): void {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
      throw new Error(`Cannot add edge: node ${edge.from} or ${edge.to} not found`);
    }
    // Ensure id
    const id = edge.id || `${edge.from}->${edge.to}`;
    const fullEdge: RoadEdge = { ...edge, id };

    // Add to adjacency (undirected for road network)
    this.adjacency.get(edge.from)!.push(fullEdge);
    // Reverse edge for undirected graph
    const reverseEdge: RoadEdge = {
      ...fullEdge,
      from: edge.to,
      to: edge.from,
      id: `${edge.to}->${edge.from}`,
    };
    if (!this.adjacency.has(edge.to)) this.adjacency.set(edge.to, []);
    this.adjacency.get(edge.to)!.push(reverseEdge);

    this.edgeMap.set(fullEdge.id, fullEdge);
    this.edgeMap.set(reverseEdge.id, reverseEdge);
  }

  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.adjacency.delete(nodeId);
    // Remove edges referencing this node
    for (const [from, edges] of this.adjacency) {
      this.adjacency.set(
        from,
        edges.filter((e) => e.to !== nodeId)
      );
    }
    for (const [id, edge] of this.edgeMap) {
      if (edge.from === nodeId || edge.to === nodeId) {
        this.edgeMap.delete(id);
      }
    }
  }

  removeEdge(edgeId: string): void {
    const edge = this.edgeMap.get(edgeId);
    if (!edge) return;
    this.edgeMap.delete(edgeId);
    const revId = `${edge.to}->${edge.from}`;
    this.edgeMap.delete(revId);

    const fromEdges = this.adjacency.get(edge.from);
    if (fromEdges) {
      this.adjacency.set(
        edge.from,
        fromEdges.filter((e) => e.id !== edgeId)
      );
    }
    const toEdges = this.adjacency.get(edge.to);
    if (toEdges) {
      this.adjacency.set(
        edge.to,
        toEdges.filter((e) => e.id !== revId)
      );
    }
  }

  openEdge(edgeId: string): void {
    const edge = this.edgeMap.get(edgeId);
    if (edge) edge.status = 'open';
    const revId = edge ? `${edge.to}->${edge.from}` : edgeId.split('->').reverse().join('->');
    const rev = this.edgeMap.get(revId);
    if (rev) rev.status = 'open';
    // Also update adjacency copies
    this.updateAdjacencyStatus(edgeId, 'open');
  }

  closeEdge(edgeId: string): void {
    const edge = this.edgeMap.get(edgeId);
    if (edge) edge.status = 'closed';
    const revId = edge ? `${edge.to}->${edge.from}` : edgeId.split('->').reverse().join('->');
    const rev = this.edgeMap.get(revId);
    if (rev) rev.status = 'closed';
    this.updateAdjacencyStatus(edgeId, 'closed');
  }

  private updateAdjacencyStatus(edgeId: string, status: 'open' | 'closed'): void {
    for (const edges of this.adjacency.values()) {
      for (const e of edges) {
        if (e.id === edgeId || e.id === edgeId.split('->').reverse().join('->')) {
          e.status = status;
        }
      }
    }
  }

  // Returns only OPEN edges - structural skip per requirement
  neighbors(nodeId: string): RoadEdge[] {
    const edges = this.adjacency.get(nodeId) || [];
    // Return only open edges (structural skip)
    return edges.filter((e) => e.status === 'open');
  }

  // Returns all edges including closed (for simulation controls)
  allNeighbors(nodeId: string): RoadEdge[] {
    return this.adjacency.get(nodeId) || [];
  }

  getNode(nodeId: string): GraphNode | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): RoadEdge[] {
    // Return unique edges (one direction)
    const seen = new Set<string>();
    const unique: RoadEdge[] = [];
    for (const edge of this.edgeMap.values()) {
      const canonical = [edge.from, edge.to].sort().join('<->');
      if (!seen.has(canonical)) {
        seen.add(canonical);
        unique.push(edge);
      }
    }
    return unique;
  }

  getEdge(edgeId: string): RoadEdge | undefined {
    return this.edgeMap.get(edgeId);
  }

  nodeCount(): number {
    return this.nodes.size;
  }

  edgeCount(): number {
    return this.edgeMap.size / 2; // undirected counted twice
  }

  clone(): Graph {
    const g = new Graph();
    for (const node of this.nodes.values()) g.addNode({ ...node });
    for (const edge of this.getAllEdges()) g.addEdge({ ...edge });
    // Preserve closed status
    for (const edge of this.edgeMap.values()) {
      if (edge.status === 'closed') {
        const e = g.edgeMap.get(edge.id);
        if (e) e.status = 'closed';
      }
    }
    return g;
  }
}

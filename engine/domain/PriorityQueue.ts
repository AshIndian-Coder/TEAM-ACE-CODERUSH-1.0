/**
 * PriorityQueue - Emergency triage queue
 * Wraps BinaryHeap, key = (urgencyRank, waitingTimeMs), tie-break by createdAt
 * CRITICAL < HIGH < MEDIUM < LOW as heap keys
 */

import { BinaryHeap } from '../graph/BinaryHeap';
import type { PatientRequest } from './types';
import { URGENCY_RANK } from './types';

interface QueueItem {
  request: PatientRequest;
  urgencyRank: number;
  waitingMs: number;
  createdAt: number;
  id: string;
}

function compareQueueItem(a: QueueItem, b: QueueItem): number {
  if (a.urgencyRank !== b.urgencyRank) return a.urgencyRank - b.urgencyRank;
  if (a.waitingMs !== b.waitingMs) return b.waitingMs - a.waitingMs; // longer wait first
  return a.createdAt - b.createdAt;
}

export class PriorityQueue {
  private heap: BinaryHeap<QueueItem>;
  private nowFn: () => number;

  constructor(nowFn: () => number = () => Date.now()) {
    this.nowFn = nowFn;
    this.heap = new BinaryHeap<QueueItem>(compareQueueItem, (item) => item.id);
  }

  enqueue(request: PatientRequest): void {
    const urgencyRank = URGENCY_RANK[request.urgency];
    const waitingMs = this.nowFn() - request.createdAt;
    this.heap.push({
      request,
      urgencyRank,
      waitingMs,
      createdAt: request.createdAt,
      id: request.id,
    });
  }

  dequeue(): PatientRequest | undefined {
    const item = this.heap.pop();
    return item?.request;
  }

  peek(): PatientRequest | undefined {
    return this.heap.peek()?.request;
  }

  size(): number {
    return this.heap.size();
  }

  isEmpty(): boolean {
    return this.heap.isEmpty();
  }

  clear(): void {
    this.heap.clear();
  }

  // For testing determinism - returns ordered list without mutating
  toSortedArray(): PatientRequest[] {
    const arr = this.heap.toArray();
    return [...arr]
      .sort(compareQueueItem)
      .map((i) => i.request);
  }

  // Remove specific request (e.g., after assignment)
  remove(requestId: string): boolean {
    const all = this.heap.toArray();
    const filtered = all.filter((i) => i.id !== requestId);
    if (filtered.length === all.length) return false;
    this.heap = BinaryHeap.fromArray(filtered, compareQueueItem, (item) => item.id);
    return true;
  }

  contains(requestId: string): boolean {
    return this.heap.toArray().some((i) => i.id === requestId);
  }
}

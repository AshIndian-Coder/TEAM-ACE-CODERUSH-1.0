/**
 * BinaryHeap - Generic min-heap
 * O(log n) push/pop, O(1) peek
 * Used by both Dijkstra/A* and PriorityQueue
 */

export type Comparator<T> = (a: T, b: T) => number;

export class BinaryHeap<T> {
  private heap: T[] = [];
  private comparator: Comparator<T>;
  // For decreaseKey support, track index by key function
  private indexMap: Map<string, number> = new Map();
  private keyFn?: (item: T) => string;

  constructor(comparator: Comparator<T>, keyFn?: (item: T) => string) {
    this.comparator = comparator;
    this.keyFn = keyFn;
  }

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  push(item: T): void {
    this.heap.push(item);
    const idx = this.heap.length - 1;
    if (this.keyFn) this.indexMap.set(this.keyFn(item), idx);
    this.bubbleUp(idx);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) {
      const item = this.heap.pop()!;
      if (this.keyFn) this.indexMap.delete(this.keyFn(item));
      return item;
    }
    const top = this.heap[0];
    const last = this.heap.pop()!;
    this.heap[0] = last;
    if (this.keyFn) {
      this.indexMap.delete(this.keyFn(top));
      this.indexMap.set(this.keyFn(last), 0);
    }
    this.bubbleDown(0);
    return top;
  }

  /**
   * Decrease key - O(log n) update for existing item
   * If item not found, behaves like push
   */
  decreaseKey(key: string, newItem: T): void {
    if (!this.keyFn) {
      // No keyFn, just push (fallback)
      this.push(newItem);
      return;
    }
    const idx = this.indexMap.get(key);
    if (idx === undefined) {
      this.push(newItem);
      return;
    }
    // Only allow decrease (higher priority = lower comparator value)
    if (this.comparator(newItem, this.heap[idx]) >= 0) {
      // Not actually a decrease, but allow update anyway for flexibility
      this.heap[idx] = newItem;
      this.bubbleUp(idx);
      this.bubbleDown(idx);
      return;
    }
    this.heap[idx] = newItem;
    this.bubbleUp(idx);
  }

  clear(): void {
    this.heap = [];
    this.indexMap.clear();
  }

  toArray(): T[] {
    return [...this.heap];
  }

  // O(n log n) heapify from array
  static fromArray<U>(items: U[], comparator: Comparator<U>, keyFn?: (item: U) => string): BinaryHeap<U> {
    const heap = new BinaryHeap(comparator, keyFn);
    // Floyd's heap construction O(n)
    heap.heap = [...items];
    if (keyFn) {
      heap.heap.forEach((item, idx) => heap.indexMap.set(keyFn(item), idx));
    }
    for (let i = Math.floor(heap.heap.length / 2) - 1; i >= 0; i--) {
      heap.bubbleDown(i);
    }
    return heap;
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.comparator(this.heap[idx], this.heap[parent]) >= 0) break;
      this.swap(idx, parent);
      idx = parent;
    }
  }

  private bubbleDown(idx: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < n && this.comparator(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < n && this.comparator(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === idx) break;
      this.swap(idx, smallest);
      idx = smallest;
    }
  }

  private swap(i: number, j: number): void {
    if (this.keyFn) {
      this.indexMap.set(this.keyFn(this.heap[i]), j);
      this.indexMap.set(this.keyFn(this.heap[j]), i);
    }
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
}

/**
 * True LRU (Least Recently Used) Cache implementation
 *  LRU
 *
 * Features:
 * - O(1) get and set operations using Map + doubly-linked list
 * - Automatic eviction of least recently used items
 * - TTL (Time To Live) support for automatic expiration
 * - Type-safe with TypeScript generics
 */

/**
 * Node in the doubly-linked list
 */
class LRUNode<K, V> {
  constructor(
    public key: K,
    public value: V,
    public timestamp: number = Date.now,
    public prev: LRUNode<K, V> | null = null,
    public next: LRUNode<K, V> | null = null
  ) {}
}

export interface LRUCacheOptions {
  maxSize: number;
  ttl?: number; // Time to live in milliseconds
  onEvict?: <K, V>(key: K, value: V) => void; // Callback when item is evicted
}

export class LRUCache<K, V> {
  private cache: Map<K, LRUNode<K, V>>;
  private head: LRUNode<K, V> | null = null; // Most recently used
  private tail: LRUNode<K, V> | null = null; // Least recently used
  private maxSize: number;
  private ttl: number | null;
  private onEvict?: (key: K, value: V) => void;

  constructor(options: LRUCacheOptions) {
    this.cache = new Map;
    this.maxSize = options.maxSize;
    this.ttl = options.ttl ?? null;
    this.onEvict = options.onEvict;
  }

  /**
   * Get value from cache
   * O(1) complexity
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);

    if (!node) {
      return undefined;
    }

    // Check if expired
    if (this.ttl && Date.now - node.timestamp > this.ttl) {
      this.delete(key);
      return undefined;
    }

    // Move to front (most recently used)
    this.moveToFront(node);

    return node.value;
  }

  /**
   * Set value in cache
   * O(1) complexity
   */
  set(key: K, value: V): void {
    // Check if key already exists
    const existing = this.cache.get(key);

    if (existing) {
      // Update value and move to front
      existing.value = value;
      existing.timestamp = Date.now;
      this.moveToFront(existing);
      return;
    }

    // Create new node
    const node = new LRUNode(key, value);
    this.cache.set(key, node);

    // Add to front of list
    if (this.head === null) {
      // First node
      this.head = this.tail = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }

    // Evict if over capacity
    if (this.cache.size > this.maxSize) {
      this.evictLRU;
    }
  }

  /**
   * Check if key exists (doesn't update LRU order)
   */
  has(key: K): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    // Check if expired
    if (this.ttl && Date.now - node.timestamp > this.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    // Remove from linked list
    this.removeNode(node);

    // Remove from map
    this.cache.delete(key);

    // Call eviction callback
    if (this.onEvict) {
      this.onEvict(key, node.value);
    }

    return true;
  }

  /**
   * Clear all entries
   */
  clear: void {
    // Call eviction callback for all entries if needed
    if (this.onEvict) {
      for (const [key, node] of this.cache.entries) {
        this.onEvict(key, node.value);
      }
    }

    this.cache.clear;
    this.head = null;
    this.tail = null;
  }

  /**
   * Get cache size
   */
  get size: number {
    return this.cache.size;
  }

  /**
   * Get all keys in LRU order (most recent first)
   */
  keys: K {
    const keys: K = ;
    let node = this.head;

    while (node) {
      keys.push(node.key);
      node = node.next;
    }

    return keys;
  }

  /**
   * Get all values in LRU order (most recent first)
   */
  values: V {
    const values: V = ;
    let node = this.head;

    while (node) {
      values.push(node.value);
      node = node.next;
    }

    return values;
  }

  /**
   * Get all entries in LRU order (most recent first)
   */
  entries: [K, V] {
    const entries: [K, V] = ;
    let node = this.head;

    while (node) {
      entries.push([node.key, node.value]);
      node = node.next;
    }

    return entries;
  }

  /**
   * Remove expired entries
   * Returns number of entries removed
   */
  prune: number {
    if (!this.ttl) {
      return 0;
    }

    const now = Date.now;
    const keysToDelete: K = ;

    for (const [key, node] of this.cache.entries) {
      if (now - node.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.delete(key);
    }

    return keysToDelete.length;
  }

  /**
   * Get cache statistics
   */
  stats {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: (this.cache.size / this.maxSize) * 100,
      ttl: this.ttl,
      oldestAge: this.tail ? Date.now - this.tail.timestamp : 0,
      newestAge: this.head ? Date.now - this.head.timestamp : 0,
    };
  }

  /**
   * Move node to front of list (most recently used)
   */
  private moveToFront(node: LRUNode<K, V>): void {
    if (node === this.head) {
      return; // Already at front
    }

    // Remove from current position
    this.removeNode(node);

    // Add to front
    node.next = this.head;
    node.prev = null;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    // If list was empty, this is also the tail
    if (this.tail === null) {
      this.tail = node;
    }
  }

  /**
   * Remove node from linked list (doesn't delete from map)
   */
  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      // This is the head
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      // This is the tail
      this.tail = node.prev;
    }
  }

  /**
   * Evict least recently used item
   */
  private evictLRU: void {
    if (!this.tail) {
      return;
    }

    const key = this.tail.key;
    const value = this.tail.value;

    // Remove from list
    if (this.tail.prev) {
      this.tail.prev.next = null;
      this.tail = this.tail.prev;
    } else {
      // Only one node
      this.head = this.tail = null;
    }

    // Remove from map
    this.cache.delete(key);

    // Call eviction callback
    if (this.onEvict) {
      this.onEvict(key, value);
    }
  }

  /**
   * Iterate over all entries
   */
  forEach(callback: (value: V, key: K, cache: LRUCache<K, V>) => void): void {
    let node = this.head;

    while (node) {
      callback(node.value, node.key, this);
      node = node.next;
    }
  }

  /**
   * Get peek at value without updating LRU order
   */
  peek(key: K): V | undefined {
    const node = this.cache.get(key);

    if (!node) {
      return undefined;
    }

    // Check if expired
    if (this.ttl && Date.now - node.timestamp > this.ttl) {
      return undefined;
    }

    return node.value;
  }

  /**
   * Reset TTL for a key (update timestamp)
   */
  touch(key: K): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    node.timestamp = Date.now;
    return true;
  }
}

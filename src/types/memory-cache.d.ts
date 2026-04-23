declare module 'memory-cache' {
  class MemoryCache {
    constructor();
    put(key: string, value: any, ttl?: number): void;
    get(key: string): any;
    del(key: string): boolean;
    keys(): string[];
    clear(): void;
  }
  export = MemoryCache;
}

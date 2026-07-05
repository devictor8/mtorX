export class RoundRobinBalancer {
  private currentIndex = 0;

  public pick<T>(items: readonly T[]): T | null {
    if (items.length === 0) return null;

    const item = items[this.currentIndex % items.length];
    this.currentIndex = (this.currentIndex + 1) % Number.MAX_SAFE_INTEGER;

    return item ?? null;
  }

  public fitToSize(size: number): void {
    this.currentIndex = size === 0 ? 0 : this.currentIndex % size;
  }
}

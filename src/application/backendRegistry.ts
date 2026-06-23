import type { BackendTarget } from "../domain/backendTarget.js";

export type BackendRegistration = Pick<
  BackendTarget,
  "id" | "host" | "port" | "healthPath"
>;

export class BackendRegistry {
  private readonly nodes = new Map<string, BackendTarget>();
  private currentIndex = 0;

  constructor(private readonly nodeTtlMs: number) {}

  public register(registration: BackendRegistration): BackendTarget {
    const existing = this.nodes.get(registration.id);

    if (existing) {
      Object.assign(existing, registration, { lastSeen: Date.now() });
      return existing;
    }

    const target: BackendTarget = {
      ...registration,
      isHealthy: false,
      lastSeen: Date.now(),
    };

    this.nodes.set(target.id, target);
    return target;
  }

  public getAll(): BackendTarget[] {
    return [...this.nodes.values()];
  }

  public getNextHealthy(): BackendTarget | null {
    const now = Date.now();
    const healthyNodes = this.getAll().filter(
      (node) => node.isHealthy && now - node.lastSeen <= this.nodeTtlMs,
    );

    if (healthyNodes.length === 0) return null;

    const target = healthyNodes[this.currentIndex % healthyNodes.length];
    this.currentIndex++;

    return target ?? null;
  }

  public removeExpired(): void {
    const now = Date.now();

    for (const [id, node] of this.nodes.entries()) {
      if (now - node.lastSeen > this.nodeTtlMs) {
        this.nodes.delete(id);
      }
    }
  }
}

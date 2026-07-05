import type { BackendTarget } from "./BackendTarget.js";
import { RoundRobinBalancer } from "./RoundRobinBalancer.js";

export class TargetPool {
  private targets: BackendTarget[] = [];

  constructor(private readonly balancer = new RoundRobinBalancer()) {}

  public replace(targets: BackendTarget[]): void {
    this.targets = targets;
    this.balancer.fitToSize(targets.length);
  }

  public pickNext(): BackendTarget | null {
    return this.balancer.pick(this.targets);
  }

  public count(): number {
    return this.targets.length;
  }

  public isEmpty(): boolean {
    return this.targets.length === 0;
  }
}

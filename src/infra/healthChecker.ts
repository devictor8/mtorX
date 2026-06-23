import http from "node:http";
import type { BackendRegistry } from "../application/backendRegistry.js";
import type { BackendTarget } from "../domain/backendTarget.js";

export class HealthChecker {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly registry: BackendRegistry,
    private readonly intervalMs: number,
    private readonly timeoutMs: number,
  ) {}

  public start(): void {
    if (this.timer) return;

    this.timer = setInterval(() => {
      this.registry.removeExpired();

      for (const node of this.registry.getAll()) {
        void this.check(node);
      }
    }, this.intervalMs);
  }

  public check(node: BackendTarget): Promise<void> {
    return new Promise((resolve) => {
      let finished = false;

      const finish = (isHealthy: boolean, error?: string): void => {
        if (finished) return;
        finished = true;
        node.isHealthy = isHealthy;
        node.lastChecked = Date.now();
        node.lastError = error;
        resolve();
      };

      const request = http.get(
        {
          host: node.host,
          port: node.port,
          path: node.healthPath,
          timeout: this.timeoutMs,
        },
        (response) => {
          const isHealthy = response.statusCode === 200;
          response.resume();
          finish(
            isHealthy,
            isHealthy ? undefined : `HTTP ${response.statusCode ?? "sem status"}`,
          );
        },
      );

      request.on("timeout", () => {
        finish(false, "Timeout no health check");
        request.destroy();
      });

      request.on("error", (error) => finish(false, error.message));
    });
  }
}

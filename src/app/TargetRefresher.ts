import type { TargetPool } from "../domain/TargetPool.js";
import type { DnsClient } from "../infra/dns/DnsClient.js";

export class TargetRefresher {
  private isRefreshingTargets = false;

  constructor(
    private readonly dnsClient: DnsClient,
    private readonly targetPool: TargetPool,
    private readonly serviceName: string,
    private readonly refreshIntervalMs: number,
  ) {}

  public start(): void {
    const refreshTimer = setInterval(() => {
      void this.refresh("interval");
    }, this.refreshIntervalMs);

    refreshTimer.unref();
  }

  public async refresh(reason: string): Promise<void> {
    if (this.isRefreshingTargets) return;

    this.isRefreshingTargets = true;

    try {
      console.log(
        `[dns ${reason}] Consultando lista de servidores saudaveis no DNS para ${this.serviceName}`,
      );

      const targets = await this.dnsClient.resolveHealthyTargets(this.serviceName);
      this.targetPool.replace(targets);

      console.log(
        `[dns ${reason}] Cache atualizado com ${targets.length} servidor(es) saudavel(is)`,
      );
    } catch (error) {
      console.error(
        `[dns ${reason}] Erro ao consultar DNS. Mantendo ${this.targetPool.count()} servidor(es) em cache:`,
        error,
      );
    } finally {
      this.isRefreshingTargets = false;
    }
  }
}

import net from "node:net";
import type { BackendTarget } from "../domain/backendTarget.js";
import type { DnsClient } from "./dnsClient.js";

export class DataPlaneServer {
  private currentIndex = 0;
  private requestSequence = 0;
  private healthyTargets: BackendTarget[] = [];
  private isRefreshingTargets = false;

  constructor(
    private readonly dnsClient: DnsClient,
    private readonly serviceName: string,
    private readonly port: number,
    private readonly dnsRefreshIntervalMs: number,
  ) {}

  public async start(): Promise<void> {
    await this.refreshHealthyTargets("startup");
    this.startDnsRefreshLoop();

    const server = net.createServer((client) => {
      void this.handleClient(client);
    });

    server.listen(this.port, "0.0.0.0", () => {
      console.log("Load balancer rodando na porta:", this.port);
    });
  }

  private async handleClient(client: net.Socket): Promise<void> {
    const requestId = this.nextRequestId();
    const clientAddress = this.formatClientAddress(client);

    console.log(`[req ${requestId}] Requisicao recebida de ${clientAddress}`);

    if (this.healthyTargets.length === 0) {
      console.log(
        `[req ${requestId}] Nenhum servidor saudavel disponivel para encaminhar`,
      );
      this.sendUnavailable(client);
      return;
    }

    this.proxyWithRetry(client, requestId);
  }

  private startDnsRefreshLoop(): void {
    const refreshTimer = setInterval(() => {
      void this.refreshHealthyTargets("interval");
    }, this.dnsRefreshIntervalMs);

    refreshTimer.unref();
  }

  private async refreshHealthyTargets(reason: string): Promise<void> {
    if (this.isRefreshingTargets) return;

    this.isRefreshingTargets = true;

    try {
      console.log(
        `[dns ${reason}] Consultando lista de servidores saudaveis no DNS para ${this.serviceName}`,
      );

      const targets = await this.dnsClient.resolveHealthyTargets(this.serviceName);
      this.healthyTargets = targets;
      this.currentIndex =
        targets.length === 0 ? 0 : this.currentIndex % targets.length;

      console.log(
        `[dns ${reason}] Cache atualizado com ${targets.length} servidor(es) saudavel(is)`,
      );
    } catch (error) {
      console.error(
        `[dns ${reason}] Erro ao consultar DNS. Mantendo ${this.healthyTargets.length} servidor(es) em cache:`,
        error,
      );
    } finally {
      this.isRefreshingTargets = false;
    }
  }

  private pickNextTarget(): BackendTarget | null {
    const targets = this.healthyTargets;

    if (targets.length === 0) return null;

    const target = targets[this.currentIndex % targets.length];
    this.currentIndex = (this.currentIndex + 1) % Number.MAX_SAFE_INTEGER;

    return target ?? null;
  }

  private proxyWithRetry(client: net.Socket, requestId: number): void {
    const maxAttempts = this.healthyTargets.length;
    let attempt = 0;

    const tryNextTarget = (): void => {
      if (client.destroyed) return;

      attempt += 1;

      if (attempt > maxAttempts) {
        console.log(
          `[req ${requestId}] Todas as tentativas de encaminhamento falharam`,
        );
        this.sendUnavailable(client);
        return;
      }

      const target = this.pickNextTarget();

      if (!target) {
        console.log(
          `[req ${requestId}] Nenhum servidor saudavel disponivel para tentativa ${attempt}/${maxAttempts}`,
        );
        this.sendUnavailable(client);
        return;
      }

      console.log(
        `[req ${requestId}] Servidor escolhido: ${target.host}:${target.port} (tentativa ${attempt}/${maxAttempts})`,
      );

      this.proxy(client, target, requestId, (error) => {
        if (attempt < maxAttempts) {
          console.log(
            `[req ${requestId}] Retry acionado apos falha em ${target.host}:${target.port}: ${error.message}`,
          );
        }

        tryNextTarget();
      });
    };

    tryNextTarget();
  }

  private proxy(
    client: net.Socket,
    target: BackendTarget,
    requestId: number,
    onConnectionFailed: (error: Error) => void,
  ): void {
    if (client.destroyed) return;

    const backend = net.createConnection({ host: target.host, port: target.port });
    let connected = false;

    const onClientError = (): void => {
      backend.destroy();
    };

    const onClientClose = (): void => {
      backend.destroy();
    };

    const cleanupClientListeners = (): void => {
      client.off("error", onClientError);
      client.off("close", onClientClose);
    };

    client.once("error", onClientError);
    client.once("close", onClientClose);

    backend.once("connect", () => {
      connected = true;
      console.log(
        `[req ${requestId}] Conexao estabelecida; encaminhando trafego para ${target.host}:${target.port}`,
      );
      client.pipe(backend);
      backend.pipe(client);
    });

    backend.on("error", (error) => {
      if (connected) {
        console.error(
          `[req ${requestId}] Erro ao encaminhar para ${target.host}:${target.port}:`,
          error.message,
        );
        client.destroy();
        return;
      }

      cleanupClientListeners();
      console.error(
        `[req ${requestId}] Erro ao conectar em ${target.host}:${target.port}:`,
        error.message,
      );
      onConnectionFailed(error);
    });
  }

  private sendUnavailable(client: net.Socket): void {
    if (client.destroyed) return;

    client.end("Nenhum servidor disponivel\n");
  }

  private nextRequestId(): number {
    this.requestSequence = (this.requestSequence + 1) % Number.MAX_SAFE_INTEGER;
    return this.requestSequence;
  }

  private formatClientAddress(client: net.Socket): string {
    const host = client.remoteAddress ?? "desconhecido";
    const port = client.remotePort ?? "sem-porta";

    return `${host}:${port}`;
  }
}

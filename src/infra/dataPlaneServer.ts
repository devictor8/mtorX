import net from "node:net";
import type { BackendTarget } from "../domain/backendTarget.js";
import type { DnsClient } from "./dnsClient.js";

export class DataPlaneServer {
  private currentIndex = 0;
  private requestSequence = 0;

  constructor(
    private readonly dnsClient: DnsClient,
    private readonly serviceName: string,
    private readonly port: number,
  ) {}

  public start(): void {
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

    const target = await this.resolveNextTarget(requestId);

    if (!target) {
      console.log(
        `[req ${requestId}] Nenhum servidor saudavel disponivel para encaminhar`,
      );
      this.sendUnavailable(client);
      return;
    }

    console.log(
      `[req ${requestId}] Requisicao enviada para ${target.host}:${target.port}`,
    );
    this.proxy(client, target, requestId);
  }

  private async resolveNextTarget(requestId: number): Promise<BackendTarget | null> {
    try {
      console.log(
        `[req ${requestId}] Consultando lista de servidores saudaveis no DNS para ${this.serviceName}`,
      );

      const targets = await this.dnsClient.resolveHealthyTargets(this.serviceName);
      console.log(
        `[req ${requestId}] DNS retornou ${targets.length} servidor(es) saudavel(is)`,
      );

      return this.pickNextTarget(targets);
    } catch (error) {
      console.error(`[req ${requestId}] Erro ao consultar DNS:`, error);
      return null;
    }
  }

  private pickNextTarget(targets: BackendTarget[]): BackendTarget | null {
    if (targets.length === 0) return null;

    const target = targets[this.currentIndex % targets.length];
    this.currentIndex = (this.currentIndex + 1) % Number.MAX_SAFE_INTEGER;

    return target ?? null;
  }

  private proxy(
    client: net.Socket,
    target: BackendTarget,
    requestId: number,
  ): void {
    if (client.destroyed) return;

    const backend = net.createConnection({ host: target.host, port: target.port });

    const onClientError = (): void => {
      backend.destroy();
    };

    const onClientClose = (): void => {
      backend.destroy();
    };

    client.once("error", onClientError);
    client.once("close", onClientClose);

    backend.on("error", (error) => {
      console.error(
        `[req ${requestId}] Erro ao encaminhar para ${target.host}:${target.port}:`,
        error.message,
      );
      client.destroy();
    });

    client.pipe(backend);
    backend.pipe(client);
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

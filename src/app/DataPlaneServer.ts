import net from "node:net";
import type { TargetPool } from "../domain/TargetPool.js";
import type { ProxyRouter } from "./ProxyRouter.js";
import type { TargetRefresher } from "./TargetRefresher.js";

export class DataPlaneServer {
  private requestSequence = 0;

  constructor(
    private readonly targetRefresher: TargetRefresher,
    private readonly targetPool: TargetPool,
    private readonly proxyRouter: ProxyRouter,
    private readonly port: number,
  ) {}

  public async start(): Promise<void> {
    await this.targetRefresher.refresh("startup");
    this.targetRefresher.start();

    const server = net.createServer((client) => {
      this.handleClient(client);
    });

    server.listen(this.port, "0.0.0.0", () => {
      console.log("Load balancer rodando na porta:", this.port);
    });
  }

  private handleClient(client: net.Socket): void {
    const requestId = this.nextRequestId();
    const clientAddress = this.formatClientAddress(client);

    console.log(`[req ${requestId}] Requisicao recebida de ${clientAddress}`);

    if (this.targetPool.isEmpty()) {
      console.log(
        `[req ${requestId}] Nenhum servidor saudavel disponivel para encaminhar`,
      );
      this.proxyRouter.sendUnavailable(client);
      return;
    }

    this.proxyRouter.forward(client, requestId);
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

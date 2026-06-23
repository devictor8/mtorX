import net from "node:net";
import type { BackendRegistry } from "../application/backendRegistry.js";
import type { BackendTarget } from "../domain/backendTarget.js";

export class DataPlaneServer {
  constructor(
    private readonly registry: BackendRegistry,
    private readonly port: number,
  ) {}

  public start(): void {
    const server = net.createServer((client) => {
      const target = this.registry.getNextHealthy();

      if (!target) {
        this.sendUnavailable(client);
        return;
      }

      this.proxy(client, target);
    });

    server.listen(this.port, "0.0.0.0", () => {
      console.log("Data plane rodando na porta:", this.port);
    });
  }

  private proxy(client: net.Socket, target: BackendTarget): void {
    const backend = net.createConnection({ host: target.host, port: target.port });

    backend.on("error", (error) => {
      target.isHealthy = false;
      target.lastError = error.message;
      client.destroy();
    });

    client.on("error", () => backend.destroy());
    client.pipe(backend);
    backend.pipe(client);
  }

  private sendUnavailable(client: net.Socket): void {
    const body = "Nenhum servidor disponivel";

    client.end(
      "HTTP/1.1 503 Service Unavailable\r\n" +
        "Content-Type: text/plain; charset=utf-8\r\n" +
        `Content-Length: ${Buffer.byteLength(body)}\r\n` +
        "Connection: close\r\n" +
        "\r\n" +
        body,
    );
  }
}

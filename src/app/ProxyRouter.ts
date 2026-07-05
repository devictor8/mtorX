import net from "node:net";
import type { TargetPool } from "../domain/TargetPool.js";
import type { TcpProxy } from "../infra/tcp/TcpProxy.js";

export class ProxyRouter {
  constructor(
    private readonly targetPool: TargetPool,
    private readonly tcpProxy: TcpProxy,
  ) {}

  public forward(client: net.Socket, requestId: number): void {
    const maxAttempts = this.targetPool.count();
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

      const target = this.targetPool.pickNext();

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

      this.tcpProxy.proxy(client, target, requestId, (error) => {
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

  public sendUnavailable(client: net.Socket): void {
    if (client.destroyed) return;

    client.end("Nenhum servidor disponivel\n");
  }
}

import net from "node:net";
import type { BackendTarget } from "../../domain/BackendTarget.js";

export class TcpProxy {
  public proxy(
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
}

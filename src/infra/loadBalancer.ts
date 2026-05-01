import { envVariables } from "../config/envLoader";
import { BackendTarget } from "../types/backendTarget";
import net from "net";

export class LoadBalancer {
  private readonly pool: BackendTarget[];
  private currentIndex: number = 0;

  constructor(pool: BackendTarget[]) {
    this.pool = pool;
    console.log(pool);
  }

  public start() {
    this.serversHealthChecker(5000);

    const server = net.createServer((socket) => {
      console.log(
        `Cliente conectado: ${socket.remoteAddress}:${socket.remotePort}`,
      );

      const target = this.getNextServer();
      this.createProxy(socket, target);

      socket.on("end", () => {
        console.log(`Cliente desconectado: ${socket.remoteAddress}`);
      });

      socket.on("error", (err) => {
        console.error("Erro na conexão:", err);
      });
    });

    server.listen(envVariables.PORT, () => {
      console.log("Servidor rodando em:", envVariables.PORT);
    });
  }

  private createProxy(client: net.Socket, target: BackendTarget) {
    const backendSocket = net.createConnection(target);
    client.pipe(backendSocket);
    backendSocket.pipe(client);
  }

  private getNextServer(): BackendTarget | null {
    const healthyServers = this.pool.filter((server) => server.isHealthy);

    if (healthyServers.length === 0) {
      return null;
    }

    const nextServer =
      healthyServers[this.currentIndex % healthyServers.length];

    this.currentIndex++;

    return nextServer;
  }

  private serversHealthChecker(intervalMs: number = 5000): void {
    setInterval(() => {
      this.pool.forEach((server) => {
        const socket = net.createConnection({
          host: server.host,
          port: server.port,
          timeout: 2000,
        });

        socket.on("connect", () => {
          server.isHealthy = true;
          console.log(`Servidor ${server.host}:${server.port} está saudável`);
          socket.destroy();
        });

        socket.on("error", (err) => {
          console.error(
            `Servidor ${server.host}:${server.port} está inativo: ${err.message}`,
          );
          server.isHealthy = false;
          socket.destroy();
        });

        socket.on("timeout", () => {
          console.error(
            `Servidor ${server.host}:${server.port} expirou o timeout`,
          );
          server.isHealthy = false;
          socket.destroy();
        });
      });
    }, intervalMs);
  }
}

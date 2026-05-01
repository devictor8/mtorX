import { spawn } from "child_process";
import { BackendTarget } from "../types/backendTarget";
import { envVariables } from "../config/envLoader";

export class ServerPool {
  private basePort: number = envVariables.SERVER_BASE_PORT;
  private servers: BackendTarget[] = [];
  private containerNames: string[] = [];
  private containerNamePrefix: string = "ticket-server";

  public async createServers(count: number): Promise<BackendTarget[]> {
    await this.cleanupExistingContainers();

    const promises = Array.from({ length: count }).map((_, i) => {
      const port = this.basePort + i;
      const containerName = `${this.containerNamePrefix}-${port}`;
      return this.createServer(port, containerName);
    });

    const results = await Promise.allSettled(promises);

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        this.servers.push(result.value);
      }
    });

    return this.servers;
  }

  private createServer(
    port: number,
    containerName: string,
  ): Promise<BackendTarget> {
    return new Promise((resolve, reject) => {
      const args = [
        "run",
        "-d",
        "--rm",
        "--name",
        containerName,
        "-p",
        `${port}:${envVariables.CONTAINER_LOCAL_PORT}`,
        envVariables.SERVER_IMAGE_NAME,
      ];

      const dockerCmd = spawn("docker", args);

      dockerCmd.on("close", (code) => {
        if (code === 0) {
          this.containerNames.push(containerName);
          resolve({
            host: envVariables.SERVERS_HOST,
            port,
            isHealthy: true,
          });
        } else {
          reject(new Error(`Falha ao iniciar container ${containerName}`));
        }
      });
    });
  }

  private async cleanupExistingContainers(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dockerCmd = spawn("docker", [
        "ps",
        "-a",
        "--filter",
        `name=${this.containerNamePrefix}`,
        "-q",
      ]);

      let containerIds = "";
      dockerCmd.stdout?.on("data", (data) => {
        containerIds += data.toString();
      });

      dockerCmd.on("close", (code) => {
        if (code === 0 && containerIds.trim()) {
          const ids = containerIds.trim().split("\n");
          const rmCmd = spawn("docker", ["rm", "-f", ...ids]);
          rmCmd.on("close", (rmCode) => {
            rmCode === 0
              ? resolve()
              : reject(new Error("Erro ao remover containers"));
          });
        } else {
          resolve();
        }
      });
    });
  }

  public async stopServers(): Promise<void> {
    console.log("Encerrando pool de servidores...");
    const stopPromises = this.containerNames.map(
      (name) =>
        new Promise((res) => spawn("docker", ["stop", name]).on("close", res)),
    );
    await Promise.all(stopPromises);
    this.servers = [];
    this.containerNames = [];
  }
}

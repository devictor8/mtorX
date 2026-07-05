import dgram from "node:dgram";
import type { BackendTarget } from "../../domain/BackendTarget.js";
import {
  parseDnsResolveResponse,
  type DnsResolveResponse,
} from "./parseDnsResolveResponse.js";

export class DnsClient {
  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly timeoutMs: number,
  ) {}

  public resolveHealthyTargets(name: string): Promise<BackendTarget[]> {
    const socket = dgram.createSocket("udp4");
    const payload = Buffer.from(
      JSON.stringify({
        action: "resolve",
        name,
      }),
    );

    return new Promise((resolve, reject) => {
      let settled = false;

      const finish = (callback: () => void): void => {
        if (settled) return;

        settled = true;
        clearTimeout(timeout);
        socket.close();
        callback();
      };

      const timeout = setTimeout(() => {
        finish(() =>
          reject(
            new Error(
              `Timeout ao resolver ${name} no DNS ${this.host}:${this.port}`,
            ),
          ),
        );
      }, this.timeoutMs);

      socket.once("error", (error) => {
        finish(() => reject(error));
      });

      socket.once("message", (message) => {
        try {
          const response = JSON.parse(message.toString("utf8")) as DnsResolveResponse;
          finish(() => resolve(parseDnsResolveResponse(response)));
        } catch {
          finish(() => reject(new Error("DNS retornou JSON invalido")));
        }
      });

      socket.send(payload, this.port, this.host, (error) => {
        if (error) {
          finish(() => reject(error));
        }
      });
    });
  }
}

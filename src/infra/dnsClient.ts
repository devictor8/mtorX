import dgram from "node:dgram";
import type { BackendTarget } from "../domain/backendTarget.js";

interface DnsResolveResponse {
  ok?: unknown;
  action?: unknown;
  data?: {
    name?: unknown;
    locations?: unknown;
  };
  error?: unknown;
}

interface DnsLocation {
  ip: string;
  port: number;
}

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
          finish(() => resolve(parseBackendTargets(response)));
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

function parseBackendTargets(response: DnsResolveResponse): BackendTarget[] {
  if (
    response.ok !== true ||
    response.action !== "resolve" ||
    !response.data ||
    !Array.isArray(response.data.locations)
  ) {
    return [];
  }

  return response.data.locations.flatMap((location) => {
    if (typeof location !== "object" || location === null) return [];

    const candidate = location as Partial<DnsLocation>;

    if (
      typeof candidate.ip !== "string" ||
      candidate.ip.trim().length === 0 ||
      typeof candidate.port !== "number" ||
      !Number.isInteger(candidate.port) ||
      candidate.port < 1 ||
      candidate.port > 65535
    ) {
      return [];
    }

    return [
      {
        host: candidate.ip.trim(),
        port: candidate.port,
      },
    ];
  });
}

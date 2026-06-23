import http, {
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { BackendRegistry } from "../application/backendRegistry.js";
import { parseRegisterNodeDto } from "../dto/registerNodeDto.js";
import type { HealthChecker } from "./healthChecker.js";

const MAX_BODY_SIZE_BYTES = 64 * 1024;

export class ControlPlaneServer {
  constructor(
    private readonly registry: BackendRegistry,
    private readonly healthChecker: HealthChecker,
    private readonly port: number,
    private readonly registryToken?: string,
  ) {}

  public start(): void {
    const server = http.createServer((request, response) => {
      void this.handleRequest(request, response);
    });

    server.listen(this.port, "0.0.0.0", () => {
      console.log("Control plane rodando na porta:", this.port);
    });
  }

  private async handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;

    if (request.method === "GET" && path === "/nodes") {
      this.sendJson(response, 200, this.registry.getAll());
      return;
    }

    if (request.method === "POST" && path === "/register") {
      await this.handleRegister(request, response);
      return;
    }

    this.sendJson(response, 404, { error: "Not Found" });
  }

  private async handleRegister(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    if (!this.isAuthorized(request)) {
      this.sendJson(response, 401, { error: "Unauthorized" });
      return;
    }

    const body = await this.readJsonBody(request);
    if (body === null) {
      this.sendJson(response, 400, { error: "JSON invalido" });
      return;
    }

    const dto = parseRegisterNodeDto(body);
    const host = dto?.publicHost || this.normalizeAddress(request.socket.remoteAddress);

    if (!dto || !host) {
      this.sendJson(response, 400, {
        error: "Campos obrigatorios: id, port e healthPath",
      });
      return;
    }

    const target = this.registry.register({
      id: dto.id,
      host,
      port: dto.port,
      healthPath: dto.healthPath,
    });

    void this.healthChecker.check(target);
    this.sendJson(response, 200, { status: "registered", node: target });
  }

  private isAuthorized(request: IncomingMessage): boolean {
    if (!this.registryToken) return true;

    const registryHeader = request.headers["x-registry-token"];
    const registryToken = Array.isArray(registryHeader)
      ? registryHeader[0]
      : registryHeader;
    const authorization = request.headers.authorization;
    const bearerToken = authorization?.replace(/^Bearer\s+/i, "");

    return (registryToken || bearerToken) === this.registryToken;
  }

  private async readJsonBody(request: IncomingMessage): Promise<unknown | null> {
    const chunks: Buffer[] = [];
    let size = 0;

    try {
      for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;

        if (size > MAX_BODY_SIZE_BYTES) return null;
        chunks.push(buffer);
      }

      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return null;
    }
  }

  private normalizeAddress(address: string | undefined): string {
    if (!address) return "";
    return address.startsWith("::ffff:") ? address.slice(7) : address;
  }

  private sendJson(
    response: ServerResponse,
    statusCode: number,
    payload: unknown,
  ): void {
    response.writeHead(statusCode, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(payload, null, 2));
  }
}

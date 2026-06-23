export interface RegisterNodeDto {
  id: string;
  port: number;
  healthPath: string;
  publicHost?: string;
}

interface RegisterNodePayload {
  id?: unknown;
  port?: unknown;
  healthPath?: unknown;
  publicHost?: unknown;
  PUBLIC_HOST?: unknown;
}

export function parseRegisterNodeDto(value: unknown): RegisterNodeDto | null {
  if (typeof value !== "object" || value === null) return null;

  const payload = value as RegisterNodePayload;
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const port = typeof payload.port === "number" ? payload.port : 0;
  const healthPath =
    typeof payload.healthPath === "string" ? payload.healthPath.trim() : "";
  const rawPublicHost = payload.publicHost ?? payload.PUBLIC_HOST;
  const publicHost =
    typeof rawPublicHost === "string" ? rawPublicHost.trim() : undefined;

  if (
    !id ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65535 ||
    !healthPath.startsWith("/")
  ) {
    return null;
  }

  return {
    id,
    port,
    healthPath,
    ...(publicHost ? { publicHost } : {}),
  };
}

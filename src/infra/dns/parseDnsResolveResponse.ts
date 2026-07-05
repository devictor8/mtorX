import type { BackendTarget } from "../../domain/BackendTarget.js";

export interface DnsResolveResponse {
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

export function parseDnsResolveResponse(
  response: DnsResolveResponse,
): BackendTarget[] {
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

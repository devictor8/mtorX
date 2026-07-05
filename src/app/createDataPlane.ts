import { TargetPool } from "../domain/TargetPool.js";
import { DnsClient } from "../infra/dns/DnsClient.js";
import { TcpProxy } from "../infra/tcp/TcpProxy.js";
import { DataPlaneServer } from "./DataPlaneServer.js";
import { ProxyRouter } from "./ProxyRouter.js";
import { TargetRefresher } from "./TargetRefresher.js";

interface CreateDataPlaneConfig {
  port: number;
  dnsHost: string;
  dnsPort: number;
  dnsTimeoutMs: number;
  dnsRefreshIntervalMs: number;
  dnsResolveName: string;
}

export function createDataPlane(config: CreateDataPlaneConfig): DataPlaneServer {
  const dnsClient = new DnsClient(
    config.dnsHost,
    config.dnsPort,
    config.dnsTimeoutMs,
  );
  const targetPool = new TargetPool();
  const targetRefresher = new TargetRefresher(
    dnsClient,
    targetPool,
    config.dnsResolveName,
    config.dnsRefreshIntervalMs,
  );
  const proxyRouter = new ProxyRouter(targetPool, new TcpProxy());

  return new DataPlaneServer(
    targetRefresher,
    targetPool,
    proxyRouter,
    config.port,
  );
}

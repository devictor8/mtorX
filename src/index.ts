import { envVariables } from "./config/envLoader.js";
import { DataPlaneServer } from "./infra/dataPlaneServer.js";
import { DnsClient } from "./infra/dnsClient.js";

const dnsClient = new DnsClient(
  envVariables.DNS_HOST,
  envVariables.DNS_PORT,
  envVariables.DNS_TIMEOUT_MS,
);
const dataPlane = new DataPlaneServer(
  dnsClient,
  envVariables.DNS_RESOLVE_NAME,
  envVariables.PORT,
  envVariables.DNS_REFRESH_INTERVAL_MS,
);

await dataPlane.start();

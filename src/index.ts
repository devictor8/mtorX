import { createDataPlane } from "./app/createDataPlane.js";
import { envVariables } from "./config/envLoader.js";

const dataPlane = createDataPlane({
  port: envVariables.PORT,
  dnsHost: envVariables.DNS_HOST,
  dnsPort: envVariables.DNS_PORT,
  dnsTimeoutMs: envVariables.DNS_TIMEOUT_MS,
  dnsRefreshIntervalMs: envVariables.DNS_REFRESH_INTERVAL_MS,
  dnsResolveName: envVariables.DNS_RESOLVE_NAME,
});

await dataPlane.start();

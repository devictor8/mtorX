import { BackendRegistry } from "./application/backendRegistry.js";
import { envVariables } from "./config/envLoader.js";
import { ControlPlaneServer } from "./infra/controlPlaneServer.js";
import { DataPlaneServer } from "./infra/dataPlaneServer.js";
import { HealthChecker } from "./infra/healthChecker.js";

const registry = new BackendRegistry(envVariables.NODE_TTL_MS);
const healthChecker = new HealthChecker(
  registry,
  envVariables.HEALTH_CHECK_INTERVAL_MS,
  envVariables.HEALTH_CHECK_TIMEOUT_MS,
);
const controlPlane = new ControlPlaneServer(
  registry,
  healthChecker,
  envVariables.REGISTRY_PORT,
  envVariables.REGISTRY_TOKEN,
);
const dataPlane = new DataPlaneServer(registry, envVariables.PORT);

healthChecker.start();
controlPlane.start();
dataPlane.start();

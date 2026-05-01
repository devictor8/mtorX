import { LoadBalancer } from "./infra/loadBalancer";
import { ServerPool } from "./infra/serverPool";

const serverPool = new ServerPool();

const servers = await serverPool.createServers(3);
const loadBalancer = new LoadBalancer(servers);
loadBalancer.start();

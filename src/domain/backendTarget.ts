export interface BackendTarget {
  id: string;
  host: string;
  port: number;
  healthPath: string;
  isHealthy: boolean;
  lastSeen: number;
  lastChecked?: number;
  lastError?: string;
}

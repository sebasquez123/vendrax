export interface HealthStatus {
  status: 'ok';
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface DatabaseHealthStatus {
  status: 'ok';
  latencyMs: number;
  timestamp: string;
}

/** tripnara.route_and_run_task_lease@v1 — 异步 Worker 心跳 / 续跑 */
export type TaskLeaseSchemaId = 'tripnara.route_and_run_task_lease@v1';

export type TaskLeaseStatus = 'ACTIVE' | 'STALE' | 'RESUMING' | 'EXHAUSTED';

export interface TaskLeaseEchoV1 {
  schemaId: TaskLeaseSchemaId;
  version: number;
  lease_status: TaskLeaseStatus;
  heartbeat_at: string;
  lease_ttl_sec: number;
  resume_count: number;
  max_resume: number;
  durable_trip_run_id?: string | null;
  worker_instance_id?: string;
  [key: string]: unknown;
}

export function isTaskLeaseEchoV1(v: unknown): v is TaskLeaseEchoV1 {
  if (typeof v !== 'object' || v == null) return false;
  const o = v as TaskLeaseEchoV1;
  const schema =
    typeof o.schemaId === 'string'
      ? o.schemaId
      : typeof (o as Record<string, unknown>).schema_id === 'string'
        ? ((o as Record<string, unknown>).schema_id as string)
        : typeof (o as Record<string, unknown>).schema === 'string'
          ? ((o as Record<string, unknown>).schema as string)
          : undefined;
  if (schema != null && schema !== 'tripnara.route_and_run_task_lease@v1') return false;
  return typeof o.lease_status === 'string';
}

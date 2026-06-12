import type { RouteRunAsyncTaskStatusSnapshot } from '@/lib/route-run-async';
import { isTaskLeaseEchoV1, type TaskLeaseEchoV1, type TaskLeaseStatus } from '@/types/task-lease';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickStr(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function pickNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

function normalizeLeaseStatus(v: unknown): TaskLeaseStatus {
  if (v === 'ACTIVE' || v === 'STALE' || v === 'RESUMING' || v === 'EXHAUSTED') return v;
  return 'ACTIVE';
}

export function normalizeTaskLeaseEcho(raw: unknown): TaskLeaseEchoV1 | null {
  if (!isTaskLeaseEchoV1(raw)) return null;

  return {
    schemaId: 'tripnara.route_and_run_task_lease@v1',
    version: pickNum(raw.version) ?? 1,
    lease_status: normalizeLeaseStatus(
      raw.lease_status ?? (raw as Record<string, unknown>).leaseStatus
    ),
    heartbeat_at:
      pickStr(raw.heartbeat_at) ?? pickStr(raw.heartbeatAt) ?? new Date().toISOString(),
    lease_ttl_sec:
      pickNum(raw.lease_ttl_sec) ?? pickNum(raw.leaseTtlSec) ?? 90,
    resume_count: pickNum(raw.resume_count) ?? pickNum(raw.resumeCount) ?? 0,
    max_resume: pickNum(raw.max_resume) ?? pickNum(raw.maxResume) ?? 2,
    ...(pickStr(raw.durable_trip_run_id) ?? pickStr(raw.durableTripRunId)
      ? {
          durable_trip_run_id:
            pickStr(raw.durable_trip_run_id) ?? pickStr(raw.durableTripRunId) ?? null,
        }
      : raw.durable_trip_run_id === null || raw.durableTripRunId === null
        ? { durable_trip_run_id: null }
        : {}),
    ...(pickStr(raw.worker_instance_id) ?? pickStr(raw.workerInstanceId)
      ? {
          worker_instance_id:
            pickStr(raw.worker_instance_id) ?? pickStr(raw.workerInstanceId),
        }
      : {}),
  };
}

export function pickTaskLeaseFromStatusSnapshot(
  snap: Record<string, unknown> | RouteRunAsyncTaskStatusSnapshot
): TaskLeaseEchoV1 | null {
  const raw =
    snap.task_lease_v1 ??
    snap.taskLeaseV1 ??
    (isRecord(snap.task_lease) ? snap.task_lease : undefined);
  return normalizeTaskLeaseEcho(raw);
}

export function attachTaskLeaseToSnapshot<T>(
  snap: RouteRunAsyncTaskStatusSnapshot<T>
): RouteRunAsyncTaskStatusSnapshot<T> {
  const lease = pickTaskLeaseFromStatusSnapshot(snap as Record<string, unknown>);
  if (!lease) return snap;
  return { ...snap, task_lease_v1: lease };
}

/** STALE / RESUMING 加速 poll；ACTIVE 默认 3s 量级 */
export function resolveTaskLeasePollIntervalMs(
  leaseStatus: TaskLeaseStatus | undefined,
  defaultMs: number
): number {
  if (leaseStatus === 'STALE' || leaseStatus === 'RESUMING') return 1500;
  if (leaseStatus === 'EXHAUSTED') return defaultMs;
  return Math.max(defaultMs, 2500);
}

export function taskLeaseProgressLabel(
  lease: TaskLeaseEchoV1 | null | undefined
): string | undefined {
  if (!lease) return undefined;
  switch (lease.lease_status) {
    case 'RESUMING':
      return '连接中断，正在从检查点恢复…';
    case 'STALE':
      return '后台任务暂停，正在自动恢复…';
    case 'EXHAUSTED':
      return '多次恢复失败，请重新发起规划';
    case 'ACTIVE':
    default:
      return undefined;
  }
}

export function taskLeaseResumeHint(lease: TaskLeaseEchoV1 | null | undefined): string | undefined {
  if (!lease || lease.lease_status === 'EXHAUSTED') return undefined;
  const remaining = Math.max(0, lease.max_resume - lease.resume_count);
  if (remaining <= 0) return undefined;
  return `仍可自动恢复约 ${remaining} 次（心跳 TTL ${lease.lease_ttl_sec}s）`;
}

export function isTaskLeaseRecovering(lease: TaskLeaseEchoV1 | null | undefined): boolean {
  return lease?.lease_status === 'STALE' || lease?.lease_status === 'RESUMING';
}

export function isTaskLeaseExhausted(lease: TaskLeaseEchoV1 | null | undefined): boolean {
  return lease?.lease_status === 'EXHAUSTED';
}

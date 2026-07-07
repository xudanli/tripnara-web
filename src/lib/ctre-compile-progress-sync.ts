import type { RouteAndRunResponse } from '@/api/agent';
import type { RouteAndRunTaskProgressPayload } from '@/features/agent/api/task-events';
import type { CtreCompileProgressView } from '@/features/agent/ctre/types';
import { normalizeCtreCompileProgress } from '@/features/agent/ctre/helpers';
import { usePlanningTaskStore } from '@/store/planningTaskStore';

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** 从 route_and_run 终态 metadata 读取 ctre_compile_progress */
export function extractCtreCompileProgressFromRouteRun(
  response: RouteAndRunResponse | null | undefined,
): CtreCompileProgressView | null {
  if (!response) return null;

  const result = readRecord(response.result);
  const payload = readRecord(result?.payload) ?? result;
  const orchestration = readRecord(payload?.orchestrationResult) ?? readRecord(payload?.orchestration_result);
  const state = readRecord(orchestration?.state) ?? readRecord(payload?.state);
  const metadata = readRecord(state?.metadata) ?? state;

  const raw =
    metadata?.ctre_compile_progress ??
    metadata?.ctreCompileProgress ??
    payload?.ctre_compile_progress ??
    payload?.ctreCompileProgress;

  return normalizeCtreCompileProgress(raw);
}

export function setPlanningTaskCtreCompilation(
  progress: CtreCompileProgressView | null | undefined,
): void {
  if (!progress) return;
  usePlanningTaskStore.getState().setTask({ ctreCompilation: progress });
}

export function clearPlanningTaskCtreCompilation(): void {
  usePlanningTaskStore.getState().setTask({ ctreCompilation: null });
}

/** SSE PHASE / RESULT：优先级 1 */
export function applyCtreCompilationFromTaskPayload(
  payload: Pick<RouteAndRunTaskProgressPayload, 'ctre_compilation' | 'data' | 'type'>,
): void {
  if (payload.ctre_compilation) {
    const normalized = normalizeCtreCompileProgress(payload.ctre_compilation);
    if (normalized) {
      setPlanningTaskCtreCompilation(normalized);
      return;
    }
  }

  if (payload.type === 'RESULT' && payload.data) {
    const fromResult = extractCtreCompileProgressFromRouteRun(payload.data);
    if (fromResult) setPlanningTaskCtreCompilation(fromResult);
  }
}

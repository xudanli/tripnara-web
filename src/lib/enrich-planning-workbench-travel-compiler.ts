import type { ExecutePlanningWorkbenchRequest, UserAction } from '@/api/planning-workbench';
import { isTravelCompilerEnabledByEnv } from '@/features/agent/ctre/constants';

const CTRE_ELIGIBLE_ACTIONS: ReadonlySet<UserAction> = new Set(['generate', 'commit', 'adjust']);

/**
 * Workbench execute 注入 `enable_travel_compiler`（§11.14.2）。
 * compare 不触发 CTRE；无 tripId 不落 Graph。
 */
export function enrichPlanningWorkbenchExecuteRequest(
  payload: ExecutePlanningWorkbenchRequest,
): ExecutePlanningWorkbenchRequest {
  const action = payload.userAction ?? 'generate';
  if (!CTRE_ELIGIBLE_ACTIONS.has(action)) return payload;
  if (payload.enable_travel_compiler === false) return payload;
  if (payload.enable_travel_compiler === true) return payload;
  if (!isTravelCompilerEnabledByEnv()) return payload;
  if (!payload.tripId?.trim()) return payload;

  return {
    ...payload,
    enable_travel_compiler: true,
  };
}

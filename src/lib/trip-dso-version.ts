import type { RouteAndRunRequest, RouteAndRunResponse } from '@/api/agent';
import {
  looksLikeRouteRunLightLookupRequest,
  looksLikeTripPlanningRequest,
} from '@/lib/route-run-intent-heuristics';
import { useTripDsoVersionStore } from '@/store/tripDsoVersionStore';

export type KernelExplainability = {
  dso_version?: string;
  [key: string]: unknown;
};

/** 从 route_and_run 成功响应读取服务端 DSO 版本 */
export function pickDsoVersionFromRouteRun(res: RouteAndRunResponse | null | undefined): string | undefined {
  if (!res?.explain) return undefined;
  const explain = res.explain as {
    kernel_explainability?: KernelExplainability;
    kernelExplainability?: KernelExplainability;
  };
  const ke = explain.kernel_explainability ?? explain.kernelExplainability;
  const v = ke?.dso_version?.trim();
  return v || undefined;
}

export function applyDsoVersionFromRouteRun(res: RouteAndRunResponse, tripId?: string | null): void {
  const version = pickDsoVersionFromRouteRun(res);
  if (!version) return;
  const tid =
    tripId?.trim() ||
    (res.result?.payload as { trip_id?: string; tripId?: string } | undefined)?.trip_id?.trim() ||
    (res.result?.payload as { tripId?: string } | undefined)?.tripId?.trim();
  if (tid) {
    useTripDsoVersionStore.getState().setServerDsoVersion(tid, version);
  }
}

function resolveTripId(request: RouteAndRunRequest): string | undefined {
  const id = request.trip_id?.trim() || request.tripId?.trim();
  return id || undefined;
}

/**
 * 写类 route_and_run 建议携带 client_dso_version；纯咨询（DATA_LOOKUP / GENERIC_QA）不传。
 */
export function shouldAttachClientDsoVersion(request: RouteAndRunRequest): boolean {
  const tripId = resolveTripId(request);
  if (!tripId) return false;

  const mode = request.options?.intent_mode?.trim().toUpperCase();
  if (mode === 'GENERIC_QA' || mode === 'DATA_LOOKUP') return false;

  if (request.clarification_answers?.length) return true;
  if (request.emergency_constraints) return true;

  if (mode === 'TRIP_PLANNING') return true;

  const msg = request.message?.trim() ?? '';
  if (request.options?.entry_point === 'planning_workbench') return true;
  if (looksLikeTripPlanningRequest(msg)) return true;
  if (looksLikeRouteRunLightLookupRequest(msg)) return false;

  if (mode === 'AUTO' || !mode) {
    if (request.structured_travel_input && Object.keys(request.structured_travel_input).length > 0) {
      return true;
    }
    if (msg.length > 0 && useTripDsoVersionStore.getState().getServerDsoVersion(tripId)) {
      return true;
    }
  }

  return false;
}

/** 为写类请求合并 options.client_dso_version（不覆盖调用方已显式传入的值） */
export function enrichRouteAndRunRequestWithDsoVersion(request: RouteAndRunRequest): RouteAndRunRequest {
  if (!shouldAttachClientDsoVersion(request)) return request;

  const tripId = resolveTripId(request);
  const existing = request.options?.client_dso_version?.trim();
  const fromStore = tripId ? useTripDsoVersionStore.getState().getServerDsoVersion(tripId) : undefined;
  const client_dso_version = existing || fromStore;
  if (!client_dso_version) return request;

  return {
    ...request,
    options: {
      ...request.options,
      client_dso_version,
    },
  };
}

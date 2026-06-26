/**
 * Causal Travel Runtime · 客户端会话缓存
 * generate-plan / repair-plan 后持久化 state + causality_id，供行中 outcome 回填。
 */

import type {
  CausalCounterfactualReport,
  CausalRuntimeEcho,
  TripWorldState,
} from '@/types/causal-travel-runtime';
import type {
  GeneratePlanRequest,
  GeneratePlanResponseData,
  RecordRealityOutcomeRequest,
  RepairPlanResponseData,
} from '@/types/decision-engine';
import type { ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';

const STORAGE_PREFIX = 'tripnara_causal_runtime_';

export interface CausalRuntimeSessionCache {
  tripId: string;
  state: TripWorldState;
  lastDecisionCausalityId: string;
  savedAt: string;
  echo?: CausalRuntimeEcho;
  /** 最近一次行中 telemetry 闭环报告 */
  lastCounterfactualReport?: CausalCounterfactualReport;
}

function storageKey(tripId: string): string {
  return `${STORAGE_PREFIX}${tripId}`;
}

/** 从 generate-plan / repair-plan 请求体提取 TripWorldState（兼容徒步 nested state） */
export function extractTripWorldStateFromGeneratePlanRequest(
  data: GeneratePlanRequest,
): TripWorldState {
  const nested = data.state;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as TripWorldState;
  }
  const { tripId: _tripId, metadata: _metadata, state: _state, ...rest } = data;
  return rest as TripWorldState;
}

function readCausalityId(source: Record<string, unknown> | undefined): string | undefined {
  if (!source) return undefined;
  const id =
    source.lastDecisionCausalityId ??
    source.causality_id ??
    source.causalityId;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}

function echoFromResponse(
  response: GeneratePlanResponseData | RepairPlanResponseData | CausalRuntimeEcho
): CausalRuntimeEcho {
  return {
    lastDecisionCausalityId: response.lastDecisionCausalityId,
    icelandSelfDriveCausalAssessment: response.icelandSelfDriveCausalAssessment,
    causalPersonaProjection: response.causalPersonaProjection,
    icelandCausalCalibration: response.icelandCausalCalibration,
    causalCounterfactualSnapshot: response.causalCounterfactualSnapshot,
  };
}

function persistCausalRuntimeSession(
  tripId: string,
  state: TripWorldState,
  causalityId: string,
  echo?: CausalRuntimeEcho
): void {
  const entry: CausalRuntimeSessionCache = {
    tripId,
    state,
    lastDecisionCausalityId: causalityId,
    savedAt: new Date().toISOString(),
    echo: echo ?? { lastDecisionCausalityId: causalityId },
  };
  try {
    sessionStorage.setItem(storageKey(tripId), JSON.stringify(entry));
  } catch {
    /* ignore quota */
  }
}

export function saveCausalRuntimeSession(
  tripId: string,
  state: TripWorldState,
  response: GeneratePlanResponseData | RepairPlanResponseData
): void {
  const causalityId = response.lastDecisionCausalityId;
  if (!tripId || !causalityId) return;
  persistCausalRuntimeSession(tripId, state, causalityId, echoFromResponse(response));
}

/** 规划工作台 execute 后缓存 world + causality（与 generate-plan 会话对齐） */
export function saveCausalRuntimeFromWorkbench(
  tripId: string,
  response: ExecutePlanningWorkbenchResponse
): void {
  if (!tripId) return;

  const projection = response.uiOutput.causalPersonaProjection;
  const planState = response.planState as Record<string, unknown> | undefined;
  const metadata =
    planState?.metadata && typeof planState.metadata === 'object'
      ? (planState.metadata as Record<string, unknown>)
      : undefined;
  const world =
    planState?.world && typeof planState.world === 'object'
      ? (planState.world as TripWorldState)
      : undefined;

  const causalityId =
    readCausalityId(metadata) ??
    readCausalityId(world) ??
    (projection?.causalityId && projection.causalityId.length > 0
      ? projection.causalityId
      : undefined);

  if (!causalityId || !world) return;

  persistCausalRuntimeSession(tripId, world, causalityId, {
    lastDecisionCausalityId: causalityId,
    causalPersonaProjection: projection,
    icelandSelfDriveCausalAssessment: metadata?.icelandSelfDriveCausalAssessment as
      | CausalRuntimeEcho['icelandSelfDriveCausalAssessment']
      | undefined,
    icelandCausalCalibration: metadata?.icelandCausalCalibration as
      | CausalRuntimeEcho['icelandCausalCalibration']
      | undefined,
  });
}

/** OPS outcome 请求体自动补齐 session 缓存的 state / causality_id */
export function enrichRecordRealityOutcomeRequest(
  body: RecordRealityOutcomeRequest,
  tripId: string
): RecordRealityOutcomeRequest {
  const ctx = buildCausalOutcomeContext(tripId);
  if (!ctx) return body;
  return {
    ...body,
    tripId: body.tripId ?? tripId,
    state: body.state ?? ctx.state,
    causality_id: body.causality_id ?? ctx.causality_id,
  };
}

export function loadCausalRuntimeSession(
  tripId: string
): CausalRuntimeSessionCache | null {
  try {
    const raw = sessionStorage.getItem(storageKey(tripId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CausalRuntimeSessionCache;
    if (!parsed?.state || !parsed.lastDecisionCausalityId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCausalRuntimeSession(tripId: string): void {
  try {
    sessionStorage.removeItem(storageKey(tripId));
  } catch {
    /* ignore */
  }
}

/** 行中 telemetry 闭环后合并 echo（校准 / 反事实报告） */
export function updateCausalRuntimeEcho(
  tripId: string,
  patch: Partial<CausalRuntimeEcho> & {
    causalCounterfactualReport?: CausalCounterfactualReport;
  },
): void {
  const cached = loadCausalRuntimeSession(tripId);
  if (!cached) return;
  const { causalCounterfactualReport, ...echoPatch } = patch;
  const entry: CausalRuntimeSessionCache = {
    ...cached,
    savedAt: new Date().toISOString(),
    echo: {
      ...cached.echo,
      ...echoPatch,
    },
    ...(causalCounterfactualReport
      ? { lastCounterfactualReport: causalCounterfactualReport }
      : {}),
  };
  try {
    sessionStorage.setItem(storageKey(tripId), JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

/** 构建 ops outcome / causal-outcome 回填所需的 state + causality_id */
export function buildCausalOutcomeContext(tripId: string): {
  state: TripWorldState;
  causality_id: string;
  tripId: string;
} | null {
  const cached = loadCausalRuntimeSession(tripId);
  if (!cached) return null;
  return {
    state: cached.state,
    causality_id: cached.lastDecisionCausalityId,
    tripId,
  };
}

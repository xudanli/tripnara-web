/**
 * 单轮 route_and_run / v2 chat 响应内的展示绑定：
 * timeline、poi_cards、orchestrationResult.gate_result、safety_surface 必须来自同一 payload，
 * 勿与 GET trip 或上一轮 session 的 orchestrationResult 混用。
 */

import type { OrchestrationResult, RouteAndRunResponse } from '@/api/agent';
import type { AgentPoiDayBlock } from '@/lib/agent-poi-payload';
import type { ItineraryDayItemsBlock } from '@/lib/agent-itinerary-item-display';
import { parseSafetySurfacePayload, type SafetySurfacePayloadV1 } from '@/lib/safety-surface-payload';
import { resolveRouteRunAssistantItineraryPanels } from '@/lib/route-run-assistant-itinerary';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

function pickStr(o: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

export type RouteRunWorkbenchDisplay = {
  drift_detected?: boolean;
  drift_message_zh?: string;
};

/** 当轮 payload.workbench_display */
export function parseWorkbenchDisplay(
  payload: Record<string, unknown> | undefined | null
): RouteRunWorkbenchDisplay | undefined {
  if (!payload) return undefined;
  const raw = payload.workbench_display ?? payload.workbenchDisplay;
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const driftDetected = rec.drift_detected === true || rec.driftDetected === true;
  if (!driftDetected) return undefined;
  const driftMessage =
    pickStr(rec, 'drift_message_zh', 'driftMessageZh') ??
    '决策说明已按当前 Trip 草案更新';
  return { drift_detected: true, drift_message_zh: driftMessage };
}

export type RouteRunPayloadDisplayBundle = {
  timelineDayBlocks?: ItineraryDayItemsBlock[];
  poiCardsByDay?: AgentPoiDayBlock[];
  /** 与 timeline / safety_surface 同轮；改排后勿 merge 旧 orchestrationResult */
  orchestrationResult?: OrchestrationResult;
  safetySurface?: SafetySurfacePayloadV1 | null;
  workbenchDisplay?: RouteRunWorkbenchDisplay;
  consultationSurface: boolean;
  hasItineraryPanelsInPayload: boolean;
};

/**
 * 从单次 route_and_run 响应抽取右侧展示所需字段（同一 payload 源）。
 */
export function buildRouteRunPayloadDisplayBundle(
  response: RouteAndRunResponse,
  payloadRecord: Record<string, unknown> | undefined,
  resultRecord: Record<string, unknown> | undefined
): RouteRunPayloadDisplayBundle {
  const panels = resolveRouteRunAssistantItineraryPanels(response, payloadRecord, resultRecord);
  const workbenchDisplay = parseWorkbenchDisplay(payloadRecord);
  return {
    ...(panels.timelineDayBlocks?.length ? { timelineDayBlocks: panels.timelineDayBlocks } : {}),
    ...(panels.poiCardsByDay?.length ? { poiCardsByDay: panels.poiCardsByDay } : {}),
    ...(panels.orchestrationResult ? { orchestrationResult: panels.orchestrationResult } : {}),
    safetySurface: parseSafetySurfacePayload(payloadRecord),
    ...(workbenchDisplay ? { workbenchDisplay } : {}),
    consultationSurface: panels.consultationSurface,
    hasItineraryPanelsInPayload: panels.hasItineraryPanelsInPayload,
  };
}

export function maybeToastWorkbenchDrift(
  workbenchDisplay: RouteRunWorkbenchDisplay | undefined,
  toastFn: (message: string) => void
): void {
  if (!workbenchDisplay?.drift_detected) return;
  toastFn(workbenchDisplay.drift_message_zh ?? '决策说明已按当前 Trip 草案更新');
}

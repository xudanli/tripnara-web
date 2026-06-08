/**
 * POST /api/agent/route_and_run 成功后，助手消息与「可编辑行程 / 时间轴」相关的统一处理。
 * 咨询态以 payload / observability 标志为准，勿用「timeline 数组非空」推断。
 */

import type { RouteAndRunResponse } from '@/api/agent';
import type { OrchestrationResult } from '@/api/agent';
import { hasOrchestrationItineraryDays } from '@/components/agent/OrchestrationItineraryPreview';
import { extractPoiCardsByDayFromRouteRun, type AgentPoiDayBlock } from '@/lib/agent-poi-payload';
import {
  extractTimelineDayBlocksFromPayload,
  type ItineraryDayItemsBlock,
} from '@/lib/agent-itinerary-item-display';
import { shouldHideItineraryForClarify } from '@/lib/route-run-clarification';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

/**
 * `result.status === 'OK'` 且存在 `result.payload` 时：
 * 任一为真则本轮视为「只出文字 / 咨询 Dashboard，不应用本响应驱动多日 POI 时间轴」：
 * - `payload.ui_surface === 'consultation'`
 * - `payload.consultation_itinerary_payload_suppressed === true`
 * - `observability.lightweight_knowledge_qa === true`（含 `meta.observability` 回退）
 * - `payload.unified_execution_trace.lightweight_knowledge_qa === true`（与装配器 DTO 对齐）
 */
export function isRouteRunConsultationSurface(response: RouteAndRunResponse): boolean {
  if (response.result.status !== 'OK') return false;
  const p = response.result.payload;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  const pr = p as Record<string, unknown>;

  const obsTop = asRecord(response.observability) ?? {};
  const root = response as unknown as Record<string, unknown>;
  const meta = asRecord(root.meta);
  const obsMeta = meta ? asRecord(meta.observability) : undefined;

  const uetRaw = pr.unified_execution_trace ?? pr.unifiedExecutionTrace;
  const uet = asRecord(uetRaw);
  const lightweightFromTrace =
    uet?.lightweight_knowledge_qa === true || uet?.lightweightKnowledgeQa === true;

  const lightweight =
    obsTop.lightweight_knowledge_qa === true ||
    obsMeta?.lightweight_knowledge_qa === true ||
    lightweightFromTrace;

  const uiConsultation =
    pr.ui_surface === 'consultation' || pr.uiSurface === 'consultation';

  const suppressed =
    pr.consultation_itinerary_payload_suppressed === true ||
    pr.consultationItineraryPayloadSuppressed === true;

  return Boolean(uiConsultation || suppressed || lightweight);
}

export type RouteRunAssistantItineraryPanels = {
  consultationSurface: boolean;
  /** 写入助手消息：咨询态为 undefined，禁止驱动气泡内时间轴 / POI 横滑 */
  poiCardsByDay?: AgentPoiDayBlock[];
  timelineDayBlocks?: ItineraryDayItemsBlock[];
  orchestrationResult?: OrchestrationResult;
  /** 原始 payload 是否含行程面板类数据（用于 hasRenderableStructured；咨询态不计入） */
  hasItineraryPanelsInPayload: boolean;
};

/**
 * 处理一次助手返回：在公共入口解析 POI/timeline/orchestration，并在咨询态下剥离，
 * 避免合并进「当前可编辑行程」或气泡时间轴（仅保留 answer_text / dashboard / 传感器等）。
 */
export function resolveRouteRunAssistantItineraryPanels(
  response: RouteAndRunResponse,
  payloadRecord: Record<string, unknown> | undefined,
  resultRecord: Record<string, unknown> | undefined
): RouteRunAssistantItineraryPanels {
  const consultationSurface = isRouteRunConsultationSurface(response);

  const poiCardsByDayRaw = extractPoiCardsByDayFromRouteRun(payloadRecord, resultRecord);
  const timelineDayBlocksRaw = extractTimelineDayBlocksFromPayload(payloadRecord);
  const orchestrationRaw = response.result.payload?.orchestrationResult as
    | OrchestrationResult
    | undefined;

  const hasItineraryPanelsInPayload =
    (poiCardsByDayRaw?.length ?? 0) > 0 ||
    Boolean(timelineDayBlocksRaw?.length) ||
    hasOrchestrationItineraryDays(orchestrationRaw);

  if (consultationSurface) {
    return {
      consultationSurface: true,
      poiCardsByDay: undefined,
      timelineDayBlocks: undefined,
      orchestrationResult: undefined,
      hasItineraryPanelsInPayload,
    };
  }

  if (shouldHideItineraryForClarify(response)) {
    return {
      consultationSurface: false,
      poiCardsByDay: undefined,
      timelineDayBlocks: undefined,
      orchestrationResult: undefined,
      hasItineraryPanelsInPayload,
    };
  }

  return {
    consultationSurface: false,
    ...(poiCardsByDayRaw && poiCardsByDayRaw.length > 0 ? { poiCardsByDay: poiCardsByDayRaw } : {}),
    ...(timelineDayBlocksRaw && timelineDayBlocksRaw.length > 0
      ? { timelineDayBlocks: timelineDayBlocksRaw }
      : {}),
    ...(orchestrationRaw ? { orchestrationResult: orchestrationRaw } : {}),
    hasItineraryPanelsInPayload,
  };
}

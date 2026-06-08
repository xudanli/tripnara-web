import type { RouteAndRunResponse } from '@/api/agent';

function countOrchestrationItineraryFromPayload(payload: Record<string, unknown> | undefined): {
  daysLength: number;
  itemsApprox: number;
} {
  const orch = payload?.orchestrationResult;
  if (!orch || typeof orch !== 'object') return { daysLength: 0, itemsApprox: 0 };
  const it = (orch as Record<string, unknown>).itinerary;
  if (!it || typeof it !== 'object' || Array.isArray(it)) return { daysLength: 0, itemsApprox: 0 };
  const days = (it as Record<string, unknown>).days;
  if (!Array.isArray(days)) return { daysLength: 0, itemsApprox: 0 };
  let itemsApprox = 0;
  for (const d of days) {
    if (d && typeof d === 'object' && Array.isArray((d as Record<string, unknown>).items)) {
      itemsApprox += ((d as { items: unknown[] }).items?.length ?? 0);
    }
  }
  return { daysLength: days.length, itemsApprox };
}

/**
 * 开发环境：收到 route_and_run 后打一行结构化日志，便于对照 Network 自查
 *（ui_surface / 抑制标记 / itinerary.days 长度 / trip_id 与请求是否一致 / answer 摘要）。
 * 仅 `import.meta.env.DEV` 下输出；上线构建无此开销。
 */
export function logRouteRunDevSelfCheck(params: {
  label?: string;
  payload: Record<string, unknown> | undefined;
  response: RouteAndRunResponse;
  requestTripId: string | null | undefined;
  isCacheReplay?: boolean;
}): void {
  if (!import.meta.env.DEV) return;
  const { label = '[route_and_run:self-check]', payload, response, requestTripId, isCacheReplay } = params;
  const { daysLength, itemsApprox } = countOrchestrationItineraryFromPayload(payload);
  const tripId =
    payload &&
    ((typeof payload.trip_id === 'string' && payload.trip_id.trim()) ||
      (typeof payload.tripId === 'string' && payload.tripId.trim()) ||
      undefined);
  const req = requestTripId?.trim() || null;
  const suppressed =
    payload &&
    (payload.consultation_itinerary_payload_suppressed === true ||
      payload.consultationItineraryPayloadSuppressed === true);
  const uiSurface =
    payload &&
    (typeof payload.ui_surface === 'string'
      ? payload.ui_surface.trim()
      : typeof payload.uiSurface === 'string'
        ? payload.uiSurface.trim()
        : undefined);
  const answer =
    typeof response.result.answer_text === 'string' ? response.result.answer_text : '';
  const timelineTop = payload?.timeline;
  const timelineLen = Array.isArray(timelineTop) ? timelineTop.length : 0;

  let tripIdAligned: boolean | 'partial' | null = null;
  if (req && tripId) tripIdAligned = req === tripId;
  else if (req || tripId) tripIdAligned = 'partial';

  console.debug(label, {
    request_id: response.request_id,
    result_status: response.result.status,
    requestTripId: req,
    payload_trip_id: tripId ?? null,
    trip_id_request_vs_payload: tripIdAligned,
    ui_surface: uiSurface ?? null,
    consultation_itinerary_payload_suppressed: Boolean(suppressed),
    daysLength,
    itemsTotalApprox: itemsApprox,
    timeline_top_level_len: timelineLen,
    isCacheReplay: Boolean(isCacheReplay),
    task_type: typeof response.route.task_type === 'string' ? response.route.task_type : null,
    answerPreview: answer.length ? answer.slice(0, 120) : '(empty)',
  });
}

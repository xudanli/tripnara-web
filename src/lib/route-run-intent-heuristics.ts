/**
 * 与 AgentChat 分流一致：用于 async 资格与 options.intent_mode 升格。
 *
 * 入参必须是「本轮用户原话」（`request.message` / `userInput`），
 * 禁止传入 `conversation_context.recent_messages` 拼接串。
 */

export type BoundTripIntentUiMode = 'auto' | 'planning' | 'data_lookup' | 'generic_qa';

export function looksLikeHotelSearchRequest(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  const patterns = [
    /推荐\s*酒店/,
    /酒店\s*推荐/,
    /订\s*酒店/,
    /查\s*酒店/,
    /找\s*酒店/,
    /搜\s*酒店/,
    /住宿\s*推荐/,
  ];
  return patterns.some((re) => re.test(t));
}

export function looksLikeCarRentalSearchRequest(text: string): boolean {
  const raw = text.trim();
  if (raw.length < 2) return false;
  const lower = raw.toLowerCase();
  const zh =
    /租车|车型|取车|还车|推荐\s*租车|查询\s*租车|搜\s*租车|找\s*租车|订\s*租车|自驾\s*租|租\s*车/;
  const en = /\b(car\s*rental|rent\s*a\s*car|hire\s*a\s*car)\b/i;
  return zh.test(raw) || en.test(lower);
}

export function looksLikeFlightSearchRequest(text: string): boolean {
  const raw = text.trim();
  if (raw.length < 2) return false;
  const lower = raw.toLowerCase();
  const zh =
    /航班|机票|直飞|转机|订票|查\s*机票|搜\s*机票|找\s*机票|可订|舱位|票价|机场|起飞|降落|Amadeus/i;
  const en =
    /\b(flight|flights|airfare|plane\s*ticket|book\s*a\s*flight|search\s*flights|non-?stop|layover)\b/i;
  return zh.test(raw) || en.test(lower);
}

export function looksLikeTripPlanningRequest(text: string): boolean {
  const t = text.trim();
  if (t.length < 4) return false;
  const patterns = [
    /改.*行程|修改.*行程|调整.*日程|换.*景|替换|行程.*改|日程.*改|重新规划|优化.*行程|生成.*行程|行程\s*json|itinerary\s*json/i,
    /排\s*行程|排一下|安排.*行程|规划.*\d+\s*天|改\s*草案|草案|环岛|自驾环岛|24\s*小时.*环岛/i,
    /第\s*\d+\s*天/,
    /\b(itinerary|reschedule|change\s+day|replace\s+(the\s+)?(poi|stop|activity|day))\b/i,
  ];
  return patterns.some((re) => re.test(t));
}

/**
 * 行程只读体检 / 可行性 / 改进建议：应走 DATA_LOOKUP（或 AUTO），不要默认 TRIP_PLANNING。
 * 须在规划启发式之前判断，避免「分析…可优化」等句误升规划。
 */
export function looksLikeTripReviewRequest(text: string): boolean {
  const t = text.trim();
  if (t.length < 4) return false;
  const patterns = [
    /可行性|改进建议|行程体检|全面分析|准备度|待办事项|风险.*检查|检查.*风险/,
    /有什么需要改进|可以优化的地方|整体可行性|行程.*体检|体检.*行程/,
    /分析.*行程|行程.*分析|看看还有什么问题/,
    /\b(feasibility|trip\s*review|health\s*check|readiness)\b/i,
  ];
  return patterns.some((re) => re.test(t));
}

export function looksLikeTripContextDataLookup(text: string): boolean {
  const t = text.trim();
  if (t.length < 4) return false;
  if (looksLikeTripReviewRequest(t)) return true;
  const patterns = [
    /天气|路况|道路|封路|积雪|风向|风力|实况|攻略|需要注意|汇总.*目的|结合当前行程|当前行程/,
    /\b(weather|road\s*condition|traffic|forecast)\b/i,
  ];
  return patterns.some((re) => re.test(t));
}

/** 轻量检索 / 传感器链：不走长时规划 async */
export function looksLikeRouteRunLightLookupRequest(text: string): boolean {
  return (
    looksLikeTripReviewRequest(text) ||
    looksLikeTripContextDataLookup(text) ||
    looksLikeHotelSearchRequest(text) ||
    looksLikeCarRentalSearchRequest(text) ||
    looksLikeFlightSearchRequest(text)
  );
}

/**
 * 已绑定有效 trip_id：`planning` / `data_lookup` / **用户显式「泛问」`generic_qa`** 不覆盖。
 * - **`auto`**：体检/可行性 → **DATA_LOOKUP**；规划改稿 → **TRIP_PLANNING**；实况/攻略 → **DATA_LOOKUP**；否则 **AUTO**。
 * 体检类优先于规划；规划优先于泛化「当前行程」实况匹配，避免「优化当前行程」误走检索档。
 */
export function resolveBoundTripRouteIntentMode(
  tripIdForRequest: string | null | undefined,
  effectiveAfterFlight: BoundTripIntentUiMode,
  messageText: string
): BoundTripIntentUiMode {
  if (!tripIdForRequest) return effectiveAfterFlight;
  if (
    effectiveAfterFlight === 'planning' ||
    effectiveAfterFlight === 'data_lookup' ||
    effectiveAfterFlight === 'generic_qa'
  ) {
    return effectiveAfterFlight;
  }
  if (looksLikeTripReviewRequest(messageText)) return 'data_lookup';
  if (looksLikeTripPlanningRequest(messageText)) return 'planning';
  if (looksLikeTripContextDataLookup(messageText)) return 'data_lookup';
  return 'auto';
}

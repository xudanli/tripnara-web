/**
 * 与 AgentChat 分流一致：用于 async 资格与 options.intent_mode 升格。
 *
 * 入参必须是「本轮用户原话」（`request.message` / `userInput`），
 * 禁止传入 `conversation_context.recent_messages` 拼接串。
 */

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

export function looksLikeTripContextDataLookup(text: string): boolean {
  const t = text.trim();
  if (t.length < 4) return false;
  const patterns = [
    /天气|路况|道路|封路|积雪|风向|风力|实况|攻略|需要注意|汇总.*目的|结合当前行程|当前行程/,
    /\b(weather|road\s*condition|traffic|forecast)\b/i,
  ];
  return patterns.some((re) => re.test(t));
}

/** 轻量检索 / 传感器链：不走长时规划 async */
export function looksLikeRouteRunLightLookupRequest(text: string): boolean {
  return (
    looksLikeTripContextDataLookup(text) ||
    looksLikeHotelSearchRequest(text) ||
    looksLikeCarRentalSearchRequest(text) ||
    looksLikeFlightSearchRequest(text)
  );
}

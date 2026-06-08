import type { EntryPoint } from '@/api/agent';
import { looksLikeHotelSearchRequest } from '@/lib/route-run-intent-heuristics';

/**
 * 规划工作台 + 已绑 trip：酒店/住宿走 planning-assistant/v2/chat（带 context.tripId），
 * 不走 route_and_run 与本地 HotelSearchPreflightCard。
 */
export function shouldRouteHotelViaPlanningAssistantV2(
  entryPoint: EntryPoint | undefined,
  tripId: string | null | undefined,
  message: string
): boolean {
  return entryPoint === 'planning_workbench' && Boolean(tripId?.trim()) && looksLikeHotelSearchRequest(message);
}

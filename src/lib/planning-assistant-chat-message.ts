import type { ChatResponse, RoutingTarget } from '@/api/planning-assistant-v2';
import {
  extractHotelSearchDisclaimerZh,
  normalizeAccommodationsList,
} from '@/lib/agent-accommodation-payload';
import { extractPlanningAssistantPresentation } from '@/lib/guardian-presentation.util';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';

const ACCOMMODATION_ROUTING_TARGETS: RoutingTarget[] = ['hotel', 'accommodation', 'airbnb'];

function isAccommodationChatResult(data: ChatResponse): boolean {
  const target = data.routing?.target;
  if (target && ACCOMMODATION_ROUTING_TARGETS.includes(target)) return true;
  return Boolean(data.accommodations?.length || data.hotels?.length || data.airbnbListings?.length);
}

function pickChatDisplayContent(data: ChatResponse): string {
  /** 酒店搜索：优先 messageCN（含入住窗、锚点与排序说明） */
  if (isAccommodationChatResult(data) && data.messageCN?.trim()) {
    return data.messageCN.trim();
  }
  return (
    data.reply ||
    data.replyCN ||
    data.messageCN ||
    data.message ||
    '收到回复，但内容为空'
  );
}

function pickAccommodationDisclaimer(data: ChatResponse): string | undefined {
  return extractHotelSearchDisclaimerZh(data as unknown as Record<string, unknown>, undefined);
}

/** 将 v2/chat 响应映射为 AgentChat / useChatV2 助手气泡字段 */
export function assistantFieldsFromChatResponse(data: ChatResponse): {
  content: string;
  phase?: string;
  hotels?: ChatResponse['hotels'];
  accommodations?: ChatResponse['accommodations'];
  airbnbListings?: ChatResponse['airbnbListings'];
  routing?: ChatResponse['routing'];
  clarificationNeeded?: ChatResponse['clarificationNeeded'];
  suggestedActions?: ChatResponse['suggestedActions'];
  ui_state?: ChatResponse['ui_state'];
  orchestrationResult?: ChatResponse['orchestrationResult'];
  accommodationDisclaimerZh?: string;
  guardianPresentation?: GuardianPersonaPresentation;
} {
  const accommodations = normalizeAccommodationsList(data.accommodations);
  const accommodationDisclaimerZh = pickAccommodationDisclaimer(data);

  return {
    content: pickChatDisplayContent(data),
    phase: data.phase,
    hotels: data.hotels,
    accommodations,
    airbnbListings: data.airbnbListings,
    routing: data.routing,
    clarificationNeeded: data.clarificationNeeded,
    suggestedActions: data.suggestedActions,
    ui_state: data.ui_state,
    orchestrationResult: data.orchestrationResult,
    ...(accommodationDisclaimerZh ? { accommodationDisclaimerZh } : {}),
    guardianPresentation: extractPlanningAssistantPresentation(data),
  };
}

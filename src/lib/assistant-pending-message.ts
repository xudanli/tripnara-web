/** sessionStorage key：跨页传递待发送的助手首条消息 */
export const ASSISTANT_PENDING_MESSAGE_KEY = 'tripnara:assistant-pending-message';

export function setAssistantPendingMessage(message: string): void {
  try {
    sessionStorage.setItem(ASSISTANT_PENDING_MESSAGE_KEY, message.trim());
  } catch {
    /* ignore quota / private mode */
  }
}

export function consumeAssistantPendingMessage(): string | null {
  try {
    const raw = sessionStorage.getItem(ASSISTANT_PENDING_MESSAGE_KEY);
    if (raw) sessionStorage.removeItem(ASSISTANT_PENDING_MESSAGE_KEY);
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export function buildJourneyMapAssistantPrompt(
  activity: { title: string; location?: string; dayIndex: number; kind?: string },
): string {
  const day = activity.dayIndex + 1;
  const place = activity.location ? `（${activity.location}）` : '';
  return `关于全程地图中 Day ${day} 的活动「${activity.title}」${place}：请分析可行性风险、参与者匹配度，以及若有分流或天气变化时的替代方案。`;
}

export function navigateToAssistantDiscuss(
  navigate: (path: string) => void,
  tripId: string,
  message: string,
): void {
  setAssistantPendingMessage(message);
  navigate(
    `/dashboard/plan-studio?tripId=${encodeURIComponent(tripId)}&tab=schedule&assistant=open`,
  );
}

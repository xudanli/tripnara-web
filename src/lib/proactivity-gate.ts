import type { ProactivityGate } from '@/types/emotional-context';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/** 与后端 JourneyAssistant / cron push 规则一致 */
export function shouldShowProactiveNotification(
  gate: ProactivityGate,
  priority: NotificationPriority
): boolean {
  if (gate === 'SILENT') return priority === 'urgent';
  if (gate === 'GENTLE') return priority === 'urgent' || priority === 'high';
  if (gate === 'ACTIVE') return priority !== 'low';
  return true;
}

/** 行中 / 规划侧本地 toast 门控入口 */
export function applyProactivityGate(gate: ProactivityGate | undefined): void {
  if (!gate) return;
  // proactivityGate 已由 emotionContextStore.set 派生；此处供 SSE 早到阶段显式调用扩展点
}

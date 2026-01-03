/**
 * 建议数据转换工具
 * 将现有的PersonaAlert、Conflicts等格式转换为统一的Suggestion格式
 */

import type { PersonaAlert } from '@/types/trip';
import type { Suggestion, PersonaType } from '@/types/suggestion';

/**
 * 将PersonaAlert转换为Suggestion
 */
export function personaAlertToSuggestion(alert: PersonaAlert, tripId: string): Suggestion {
  const personaMap: Record<string, PersonaType> = {
    ABU: 'abu',
    DR_DRE: 'drdre',
    NEPTUNE: 'neptune',
  };

  const severityMap: Record<string, 'info' | 'warn' | 'blocker'> = {
    success: 'info',
    info: 'info',
    warning: 'warn',
  };

  return {
    id: alert.id,
    persona: personaMap[alert.persona] || 'abu',
    scope: 'trip', // 默认trip级别，可以从metadata中提取更精确的scope
    scopeId: tripId,
    severity: severityMap[alert.severity] || 'info',
    status: 'new',
    title: alert.title,
    summary: alert.message,
    description: alert.message,
    actions: [
      {
        id: 'view_evidence',
        label: '查看证据',
        type: 'view_evidence',
        primary: true,
      },
    ],
    createdAt: alert.createdAt,
    metadata: {
      decisionSource: alert.metadata?.decisionSource,
      action: alert.metadata?.action,
      reasonCodes: alert.metadata?.reasonCodes,
    },
  };
}

/**
 * 批量转换PersonaAlert列表
 */
export function convertPersonaAlertsToSuggestions(
  alerts: PersonaAlert[],
  tripId: string
): Suggestion[] {
  return alerts.map((alert) => personaAlertToSuggestion(alert, tripId));
}


/**
 * 建议统计工具函数
 * 从suggestions列表中计算统计数据
 */

import type { Suggestion, SuggestionStats } from '@/types/suggestion';

/**
 * 从suggestions列表计算统计数据
 */
export function calculateSuggestionStats(
  suggestions: Suggestion[],
  tripId: string
): SuggestionStats {
  const stats: SuggestionStats = {
    tripId,
    byPersona: {
      abu: {
        total: 0,
        bySeverity: {
          blocker: 0,
          warn: 0,
          info: 0,
        },
      },
      drdre: {
        total: 0,
        bySeverity: {
          blocker: 0,
          warn: 0,
          info: 0,
        },
      },
      neptune: {
        total: 0,
        bySeverity: {
          blocker: 0,
          warn: 0,
          info: 0,
        },
      },
    },
    byScope: {
      trip: 0,
      day: {},
      item: {},
    },
  };

  for (const suggestion of suggestions) {
    // 按人格统计
    const personaStats = stats.byPersona[suggestion.persona];
    if (personaStats) {
      personaStats.total++;
      personaStats.bySeverity[suggestion.severity]++;
    }

    // 按作用范围统计
    if (suggestion.scope === 'trip') {
      stats.byScope.trip++;
    } else if (suggestion.scope === 'day' && suggestion.scopeId) {
      stats.byScope.day[suggestion.scopeId] = (stats.byScope.day[suggestion.scopeId] || 0) + 1;
    } else if (suggestion.scope === 'item' && suggestion.scopeId) {
      stats.byScope.item[suggestion.scopeId] = (stats.byScope.item[suggestion.scopeId] || 0) + 1;
    }
  }

  return stats;
}


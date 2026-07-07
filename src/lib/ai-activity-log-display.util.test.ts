import { describe, expect, it } from 'vitest';
import {
  filterAiActivityLogItems,
  formatAiActivityLogDelta,
  resolveAiActivityLogHref,
} from './ai-activity-log-display.util';
import { normalizeAiActivityLogList } from './ai-activity-log-normalize.util';

describe('ai-activity-log normalize + display', () => {
  it('normalizes list response and filters by tab tag', () => {
    const list = normalizeAiActivityLogList({
      schemaId: 'tripnara.ai_activity_log@v1',
      tripId: 'trip-1',
      summary: {
        todayActionCount: 18,
        todayActionDelta: 6,
        autoCompletedCount: 14,
        autoCompletedPct: 78,
        waitingConfirmCount: 2,
        waitingConfirmPct: 11,
      },
      items: [
        {
          activityId: 'a1',
          occurredAt: '2026-07-04T14:32:00.000Z',
          category: 'MONITORING',
          filterTags: ['ALL', 'AUTO'],
          statusTag: 'AUTO_EXECUTED',
          statusLabel: '已自动执行',
          title: '自动重新检查天气',
        },
        {
          activityId: 'a2',
          occurredAt: '2026-07-04T15:08:00.000Z',
          category: 'ACTIVITY',
          filterTags: ['ALL', 'WAITING_CONFIRM'],
          statusTag: 'WAITING_CONFIRM',
          statusLabel: '等待确认',
          title: '等待确认方案',
        },
      ],
    });

    expect(list.items).toHaveLength(2);
    expect(filterAiActivityLogItems(list.items, 'AUTO')).toHaveLength(1);
    expect(filterAiActivityLogItems(list.items, 'WAITING_CONFIRM')).toHaveLength(1);
  });

  it('formats delta and resolves dashboard href', () => {
    expect(formatAiActivityLogDelta(6)).toBe('较昨日 +6');
    expect(resolveAiActivityLogHref('/trips/trip-1/decision-queue/p1')).toBe(
      '/dashboard/trips/trip-1/decision-queue/p1',
    );
  });
});

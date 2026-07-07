import { describe, expect, it } from 'vitest';
import { normalizeTravelStatusResponse } from '@/lib/travel-status-normalize.util';

describe('normalizeTravelStatusResponse', () => {
  it('coerces missing list fields to empty arrays', () => {
    const result = normalizeTravelStatusResponse({
      executability: { status: 'READY', headline: 'OK' },
      aiCompletedWork: null,
      openDecisions: null,
      monitoring: null,
    });

    expect(result.aiCompletedWork.items).toEqual([]);
    expect(result.openDecisions).toEqual([]);
    expect(result.monitoring.items).toEqual([]);
  });

  it('accepts aiCompletedWork as a bare array', () => {
    const result = normalizeTravelStatusResponse({
      executability: { status: 'READY', headline: 'OK' },
      aiCompletedWork: [{ activityId: 'a1', occurredAt: '2026-01-01', summary: 'x', kind: 'AUTO_REPAIR', automatic: true, reversible: false }],
    });

    expect(result.aiCompletedWork.items).toHaveLength(1);
  });

  it('reads openDecisions from decisionQueue.items fallback', () => {
    const result = normalizeTravelStatusResponse({
      executability: { status: 'NEEDS_ATTENTION', headline: '注意' },
      decisionQueue: {
        items: [
          {
            problemId: 'p1',
            headline: '强风',
            impact: '第 3 天',
            recommendation: { title: '改室内', summary: '', keeps: '极光', costs: null },
            severity: 'CONFLICT',
          },
        ],
      },
    });

    expect(result.openDecisions).toHaveLength(1);
    expect(result.openDecisions[0]?.recommendation.keeps).toEqual(['极光']);
    expect(result.openDecisions[0]?.recommendation.costs).toEqual([]);
  });

  it('normalizes automation tierCounts and uiLevel from catalog', () => {
    const result = normalizeTravelStatusResponse({
      executability: { status: 'READY', headline: 'OK' },
      automation: {
        defaultLevel: 'SUGGEST',
        uiLevel: 'L2',
        uiLevelLabel: '建议执行',
        tierCounts: { auto: 2, ask: 3, deny: 1 },
        catalog: {
          groups: [
            {
              group: 'MONITORING',
              label: '环境监控',
              autoCount: 1,
              askCount: 0,
              denyCount: 0,
              actions: [
                { key: 'monitoring.weather_road_update', label: '更新天气', effectiveTier: 'AUTO' },
              ],
            },
          ],
        },
      },
    });

    expect(result.automation.uiLevel).toBe('L2');
    expect(result.automation.tierCounts).toEqual({ auto: 2, ask: 3, deny: 1 });
    expect(result.automation.catalog.groups).toHaveLength(1);
  });
});

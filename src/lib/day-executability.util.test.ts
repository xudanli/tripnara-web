import { describe, expect, it } from 'vitest';
import { buildDayExecutabilityMap } from './day-executability.util';
import type { TravelStatusResponse } from '@/api/travel-status.types';

describe('buildDayExecutabilityMap', () => {
  it('maps affected days from openDecisions', () => {
    const status: TravelStatusResponse = {
      executability: { status: 'NEEDS_ATTENTION', headline: '需处理' },
      openDecisions: [
        {
          problemId: 'p1',
          headline: '第 4 天车辆不适合 F208',
          impact: 'Landmannalaugar 不可达',
          severity: 'BLOCK',
          affectedDayNumbers: [4],
          recommendation: { title: '换车', summary: '', keeps: [], costs: [] },
          actions: { acceptRecommended: { enabled: true } },
        },
        {
          problemId: 'p2',
          headline: '住宿待确认',
          impact: '第 4 天入住风险',
          severity: 'VERIFY',
          affectedDayNumbers: [4],
          recommendation: { title: '确认预订', summary: '', keeps: [], costs: [] },
          actions: { acceptRecommended: { enabled: true } },
        },
      ],
      monitoring: { activeCount: 0, items: [] },
      effectivePlan: {},
      automation: {
        defaultLevel: 'SUGGEST',
        defaultLevelLabel: '建议',
        uiLevel: 'L2',
        uiLevelLabel: 'L2',
        tierCounts: { auto: 0, ask: 0, deny: 0 },
        paused: false,
        catalog: { tiers: [], scopes: [] },
      },
      pendingVerification: { items: [] },
    };

    const map = buildDayExecutabilityMap(status);
    const day4 = map.get(4);
    expect(day4?.status).toBe('blocked');
    expect(day4?.label).toBe('不可执行');
    expect(day4?.reasons).toContain('第 4 天车辆不适合 F208');
    expect(day4?.problemIds).toEqual(['p1', 'p2']);
  });

  it('returns empty map when status is null', () => {
    expect(buildDayExecutabilityMap(null).size).toBe(0);
  });
});

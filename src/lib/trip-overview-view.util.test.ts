import { describe, expect, it } from 'vitest';
import {
  buildTripConditionCards,
  buildTripMonitoringWatchlist,
  buildWorldChangeFeed,
} from './trip-overview-view.util';
import type { TravelStatusResponse } from '@/api/travel-status.types';

const baseStatus: TravelStatusResponse = {
  executability: { status: 'NEEDS_ATTENTION', headline: '基本可行' },
  aiCompletedWork: {
    items: [
      {
        activityId: 'a1',
        occurredAt: new Date().toISOString(),
        summary: '更新了驾驶时间',
        kind: 'AUTO_REPAIR',
        automatic: true,
        reversible: false,
      },
    ],
  },
  openDecisions: [
    {
      problemId: 'p1',
      headline: '第 4 天车辆不适合 F208',
      impact: 'Landmannalaugar 路线',
      severity: 'BLOCK',
      affectedDayNumbers: [4],
      recommendation: { title: '换车', summary: '升级四驱', keeps: [], costs: [] },
      actions: { acceptRecommended: { enabled: true } },
    },
  ],
  monitoring: {
    activeCount: 2,
    items: [
      {
        kind: 'ROAD_CLOSURE',
        label: '道路 F208',
        status: 'ALERT',
        summary: '今天更新为季节性关闭',
        lastCheckedAt: new Date().toISOString(),
      },
      {
        kind: 'WEATHER_HAZARD',
        label: '南部天气',
        status: 'ACTIVE',
        summary: '未来 7 天持续监控',
      },
    ],
  },
  effectivePlan: {},
  automation: {
    defaultLevel: 'SUGGEST',
    defaultLevelLabel: '建议',
    uiLevel: 'L2',
    uiLevelLabel: 'L2',
    tierCounts: { auto: 0, ask: 1, deny: 0 },
    paused: false,
    catalog: { tiers: [], scopes: [] },
  },
  contextSnapshot: {},
};

describe('trip-overview-view.util', () => {
  it('builds condition cards with vehicle action state', () => {
    const cards = buildTripConditionCards(baseStatus);
    const mobility = cards.find((c) => c.id === 'mobility');
    expect(mobility?.status).toBe('action');
    expect(mobility?.statusLabel).toMatch(/需要处理/);
  });

  it('builds world change feed from monitoring and decisions', () => {
    const feed = buildWorldChangeFeed(baseStatus);
    expect(feed.length).toBeGreaterThan(0);
    expect(feed.some((f) => f.subject.includes('F208'))).toBe(true);
  });

  it('builds monitoring watchlist', () => {
    const list = buildTripMonitoringWatchlist(baseStatus);
    expect(list).toHaveLength(2);
  });
});

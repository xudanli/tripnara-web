import { describe, expect, it } from 'vitest';
import {
  isUnifiedDecisionProblemListView,
  mapUnifiedDecisionProblemList,
  unifiedListItemToSummary,
} from '@/lib/unified-decision-problem-list.util';
import type { UnifiedDecisionProblemListView } from '@/types/unified-decision';

/** GATE-007：Gateway 统一列表 — canonical 优先、按 problemId 去重（后端保证） */
const gate007Fixture: UnifiedDecisionProblemListView = {
  schemaId: 'tripnara.unified_decision_problems@v1',
  meta: { total: 3, canonicalCount: 2, legacyCount: 1 },
  items: [
    {
      problemId: 'problem_road_1',
      flow: 'CANONICAL_L2',
      route: { resolution: 'PRIMARY', engineId: 'CANONICAL_DECISION_RUNTIME' },
      semanticCapability: 'ROAD_SEGMENT_UNAVAILABLE',
      semanticKey: 'ROAD_SEGMENT_UNAVAILABLE',
      title: '道路关闭 / F-road 不可通行',
      status: 'OPEN',
      canonicalSummary: {
        requiresUserConfirmation: true,
        candidates: [
          { candidateId: 'cand_a', label: '绕行 A' },
          { candidateId: 'cand_b', label: '绕行 B' },
        ],
      },
    },
    {
      problemId: 'problem_weather_1',
      flow: 'CANONICAL_L2',
      route: { resolution: 'PRIMARY', engineId: 'CANONICAL_DECISION_RUNTIME' },
      semanticCapability: 'WEATHER_ACTIVITY_PROHIBITED',
      title: '天气 / 活动限制',
      status: 'OPEN',
      canonicalSummary: {
        candidates: [{ candidateId: 'cand_indoor', label: '室内替代' }],
      },
    },
    {
      problemId: 'problem_gate_1',
      flow: 'LEGACY_V15',
      route: { resolution: 'LEGACY_FALLBACK' },
      title: 'Gate issue',
      status: 'OPEN',
      legacySummary: {
        type: 'INFEASIBILITY',
        primaryEnforcement: 'BLOCK',
        optionsCount: 2,
      },
    },
  ],
};

describe('unified-decision-problem-list.util', () => {
  it('detects unified list schema', () => {
    expect(isUnifiedDecisionProblemListView(gate007Fixture)).toBe(true);
    expect(isUnifiedDecisionProblemListView({ items: [{ id: 'x' }] })).toBe(false);
  });

  it('GATE-007 maps canonical + legacy flows from single API response', () => {
    const items = mapUnifiedDecisionProblemList(gate007Fixture);
    expect(items).toHaveLength(3);
    expect(items[0].flowKind).toBe('CANONICAL_L2');
    expect(items[0].route?.resolution).toBe('PRIMARY');
    expect(items[0].optionsCount).toBe(2);
    expect(items[1].title).toBe('天气 / 活动限制');
    expect(items[2].flowKind).toBe('LEGACY_V15');
    expect(items[2].route?.resolution).toBe('LEGACY_FALLBACK');
  });

  it('maps Gateway v2 queue SSOT fields onto DecisionProblemSummary', () => {
    const summary = unifiedListItemToSummary({
      problemId: 'dp-meal-day1',
      route: { resolution: 'LEGACY_FALLBACK' },
      title: '午餐窗冲突',
      summary: '预计 彩虹街 结束于 16:27，晚于午餐窗 12:00',
      categoryLabel: '日程',
      status: 'OPEN',
      legacySummary: {
        affectedDayNumbers: [1],
        affectedScopeSummary: '彩虹街',
        categoryLabel: '日程',
        description: '预计 彩虹街 结束于 16:27，晚于午餐窗 12:00',
      },
      impactScopeView: {
        arrangements: [{ label: '彩虹街', dayIndex: 1 }],
      },
      scope: { dayIds: [1] },
    });
    expect(summary.title).toBe('午餐窗冲突');
    expect(summary.categoryLabel).toBe('日程');
    expect(summary.description).toContain('彩虹街');
    expect(summary.affectedDayNumbers).toEqual([1]);
    expect(summary.affectedScopeSummary).toBe('彩虹街');
    expect(summary.scope?.dayIds).toEqual([1]);
  });

  it('merges scope.dayIds when legacy affectedDayNumbers is empty (CAS-123 lunch window)', () => {
    const summary = unifiedListItemToSummary({
      problemId: 'CAS-123',
      route: { resolution: 'LEGACY_FALLBACK' },
      title: '午餐窗冲突',
      categoryLabel: '日程',
      status: 'OPEN',
      legacySummary: {
        affectedScopeSummary: '彩虹街',
        categoryLabel: '日程',
        description: '预计 彩虹街 结束于 16:27，晚于午餐窗 12:00',
      },
      impactScopeView: {
        arrangements: [{ label: '彩虹街', dayIndex: 1 }],
      },
      scope: { dayIds: [1] },
    });
    expect(summary.affectedDayNumbers).toEqual([1]);
  });

  it('dedupes duplicate canonical items by semanticCapability', () => {
    const duplicateLoad: UnifiedDecisionProblemListView = {
      schemaId: 'tripnara.unified_decision_problems@v1',
      meta: { total: 4, canonicalCount: 3, legacyCount: 1 },
      items: [
        {
          problemId: 'problem_load_a',
          flow: 'CANONICAL_L2',
          route: { resolution: 'PRIMARY' },
          semanticCapability: 'EXCESSIVE_DAILY_LOAD',
          title: '行程负荷过高：第7日驾驶超时',
          status: 'OPEN',
          canonicalSummary: {},
        },
        {
          problemId: 'problem_load_b',
          flow: 'CANONICAL_L2',
          route: { resolution: 'PRIMARY' },
          semanticCapability: 'EXCESSIVE_DAILY_LOAD',
          title: '行程负荷过高：第7日驾驶超时',
          status: 'OPEN',
          canonicalSummary: {
            record: { decisionId: 'dec_1', recordStatus: 'PROPOSED' },
          },
        },
        gate007Fixture.items[2],
      ],
    };
    const items = mapUnifiedDecisionProblemList(duplicateLoad);
    expect(items.filter((i) => i.flowKind === 'CANONICAL_L2')).toHaveLength(1);
    expect(items[0].id).toBe('problem_load_b');
    expect(items).toHaveLength(2);
  });

  it('dedupes duplicate legacy items on same day and route (807b3c54 fixture)', () => {
    const duplicateLegacy: UnifiedDecisionProblemListView = {
      schemaId: 'tripnara.unified_decision_problems@v1',
      meta: { total: 5, canonicalCount: 0, legacyCount: 5 },
      items: [
        {
          problemId: 'dp_id:coverage-gap:1-long_distance',
          flow: 'LEGACY_V15',
          route: { resolution: 'LEGACY_FALLBACK' },
          title: '第5天 · 米湖 → 迪尔餐厅（约 284 km）· 长距离行驶(>228km)，建议中途休息',
          status: 'OPEN',
          legacySummary: {
            primaryEnforcement: 'ADVISE',
            affectedDayNumbers: [5],
            optionsCount: 0,
          },
        },
        {
          problemId: 'dp_id:issue-schedule-long-drive-seg-4',
          flow: 'LEGACY_V15',
          route: { resolution: 'LEGACY_FALLBACK' },
          title: '第5天 · 米湖 → 迪尔餐厅 驾车约 341 分钟，建议拆分',
          status: 'OPEN',
          legacySummary: {
            primaryEnforcement: 'REQUIRE_ADJUSTMENT',
            affectedDayNumbers: [5],
            optionsCount: 3,
          },
        },
        {
          problemId: 'dp_id:issue-transport-seg-4-long_distance',
          flow: 'LEGACY_V15',
          route: { resolution: 'LEGACY_FALLBACK' },
          title: '第5天 · 米湖 → 迪尔餐厅 · 长距离行驶(>228km)，建议中途休息',
          status: 'OPEN',
          legacySummary: {
            primaryEnforcement: 'ADVISE',
            affectedDayNumbers: [5],
            optionsCount: 1,
          },
        },
        {
          problemId: 'dp_travel:same_day_travel:aaa',
          flow: 'LEGACY_V15',
          route: { resolution: 'LEGACY_FALLBACK' },
          title: '交通缓冲偏紧',
          status: 'OPEN',
          legacySummary: { primaryEnforcement: 'ADVISE', affectedDayNumbers: [4] },
        },
        {
          problemId: 'dp_travel:same_day_travel:bbb',
          flow: 'LEGACY_V15',
          route: { resolution: 'LEGACY_FALLBACK' },
          title: '交通缓冲偏紧',
          status: 'OPEN',
          legacySummary: { primaryEnforcement: 'ADVISE', affectedDayNumbers: [4] },
        },
        {
          problemId: 'dp_id:issue-finding-2',
          flow: 'LEGACY_V15',
          route: { resolution: 'LEGACY_FALLBACK' },
          title: '冰岛 紧急电话',
          status: 'OPEN',
          legacySummary: {
            primaryEnforcement: 'REQUIRE_CONFIRMATION',
            optionsCount: 2,
          },
        },
      ],
    };

    const items = mapUnifiedDecisionProblemList(duplicateLegacy);
    expect(items).toHaveLength(2);
    const day5 = items.find((i) => i.title.includes('米湖'));
    expect(items.filter((i) => i.title.includes('交通缓冲'))).toHaveLength(1);
    expect(items.some((i) => i.id === 'dp_id:issue-finding-2')).toBe(false);
  });

  it('dedupes legacy travel-buffer duplicates even when instanceKey differs', () => {
    const duplicateWithInstanceKeys: UnifiedDecisionProblemListView = {
      schemaId: 'tripnara.unified_decision_problems@v1',
      meta: { total: 2, canonicalCount: 0, legacyCount: 2 },
      items: [
        {
          problemId: 'dp_travel:same_day_travel:aaa',
          instanceKey: 'inst-aaa',
          flow: 'LEGACY_V15',
          route: { resolution: 'LEGACY_FALLBACK' },
          title: '交通缓冲偏紧',
          status: 'OPEN',
          legacySummary: { primaryEnforcement: 'ADVISE', affectedDayNumbers: [4] },
        },
        {
          problemId: 'dp_travel:same_day_travel:bbb',
          instanceKey: 'inst-bbb',
          flow: 'LEGACY_V15',
          route: { resolution: 'LEGACY_FALLBACK' },
          title: '交通缓冲偏紧',
          status: 'OPEN',
          legacySummary: { primaryEnforcement: 'ADVISE', affectedDayNumbers: [4] },
        },
      ],
    };

    const items = mapUnifiedDecisionProblemList(duplicateWithInstanceKeys);
    expect(items.filter((i) => i.title.includes('交通缓冲'))).toHaveLength(1);
  });

  it('builds canonicalView for drawer L2 flow', () => {
    const summary = unifiedListItemToSummary(gate007Fixture.items[0]);
    expect(summary.canonicalView?.problemId).toBe('problem_road_1');
    expect(summary.canonicalView?.candidates).toHaveLength(2);
    expect(summary.personaLabel).toBe('Abu');
  });
});

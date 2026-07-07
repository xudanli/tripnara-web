import { describe, expect, it } from 'vitest';
import {
  buildDecisionCheckerPlanningInterimForFocus,
  filterDecisionCheckerEvidenceForFocus,
  itemMatchesScheduleDayTimelinePois,
  planningConflictAffectsDay,
  resolveDecisionCheckerFocusConflictIdForDay,
  resolveWorkbenchFocusForScheduleDay,
  scopeDecisionCheckerForDecisionSpace,
} from '@/lib/decision-checker-focus.util';
import type { DecisionCheckerResponse } from '@/types/decision-checker';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';

const baseChecker: DecisionCheckerResponse = {
  schema: 'tripnara.decision_checker@v1',
  tripId: 'trip_1',
  generatedAt: '2026-01-01T00:00:00Z',
  snapshotVersion: 'v1',
  overview: {
    conflict: {
      hardCount: 1,
      primary: {
        conflictId: 'gate_blue_lagoon',
        severity: 'hard',
        title: '蓝湖温泉',
        message: '蓝湖温泉：入场需要预约',
      },
    },
    repairPlan: {
      id: 'repair_blue',
      source: 'gate_compare',
      title: '前往官方预订',
      description: '需提前预约',
      recommended: true,
      metrics: [],
      benefits: [],
    },
  },
  evidence: {
    items: [
      {
        id: 'ev_blue',
        kind: 'inventory',
        title: '蓝湖温泉 · 其他证据',
        subtitle: '第 1 天 · 预约凭证',
        reliability: 'medium',
      },
      {
        id: 'ev_thing',
        kind: 'inventory',
        title: '辛格维利尔国家公园 · 营业时间',
        subtitle: '第 2 天 · 缺少覆盖',
        reliability: 'low',
      },
    ],
    summary: { high: 0, medium: 1, low: 1 },
  },
  impact: { summary: {}, constraints: [], cascade: [] },
  counterfactual: {
    scenarios: [
      {
        id: 's1',
        title: '前往官方预订',
        description: '蓝湖',
        metrics: [],
      },
      {
        id: 's2',
        title: '上传凭证',
        description: '蓝湖',
        metrics: [],
      },
    ],
  },
};

const drivingConflict: PlanningConflictItem = {
  id: 'c_drive_5',
  source: 'feasibility',
  priority: 'suggest_adjust',
  category: 'transport',
  title: '超长距离行驶',
  message: '第5天 · 米湖 → 迪尔 · 462km',
  categoryLabel: '交通',
  issue: { id: 'issue_drive', issueKind: 'road_class' } as PlanningConflictItem['issue'],
};

describe('decision-checker-focus.util', () => {
  it('scopes overview and scenarios to focused conflict/problem', () => {
    const scoped = scopeDecisionCheckerForDecisionSpace(baseChecker, {
      conflict: drivingConflict,
      problem: {
        id: 'dp_drive',
        type: 'INFEASIBILITY',
        title: '超长距离行驶',
        status: 'OPEN',
        primaryEnforcement: 'REQUIRE_ADJUSTMENT',
      },
      problemOptions: [
        { id: 'opt_a', title: '预订单程接驳', description: '减少驾驶' },
        { id: 'opt_b', title: '查看替代路线', description: '绕行' },
      ],
    });

    expect(scoped.overview.conflict.primary?.title).toBe('超长距离行驶');
    expect(scoped.overview.conflict.primary?.message).toContain('462km');
    expect(scoped.counterfactual.scenarios).toHaveLength(2);
    expect(scoped.counterfactual.scenarios[0]?.title).toBe('预订单程接驳');
    expect(scoped.overview.repairPlan?.title).toBe('预订单程接驳');
  });

  it('does not fall back to trip-level checker when problem focused but options empty', () => {
    const scoped = scopeDecisionCheckerForDecisionSpace(baseChecker, {
      conflict: drivingConflict,
      problem: {
        id: 'dp_drive',
        type: 'INFEASIBILITY',
        title: '超长距离行驶',
        status: 'OPEN',
        primaryEnforcement: 'REQUIRE_ADJUSTMENT',
      },
      problemOptions: [],
    });

    expect(scoped.overview.conflict.primary?.title).toBe('超长距离行驶');
    expect(scoped.counterfactual.scenarios).toHaveLength(0);
    expect(scoped.overview.repairPlan).toBeUndefined();
    expect(scoped.overview.conflict.hardCount).toBe(1);
  });

  it('builds interim from focus instead of trip primary', () => {
    const interim = buildDecisionCheckerPlanningInterimForFocus({
      summary: { total: 9, mustHandle: 1, suggestAdjust: 3, pendingConfirm: 5, byCategory: {} },
      items: [drivingConflict],
      focusConflict: drivingConflict,
      focusProblem: {
        id: 'dp_drive',
        type: 'INFEASIBILITY',
        title: '超长距离行驶',
        status: 'OPEN',
        primaryEnforcement: 'REQUIRE_ADJUSTMENT',
      },
    });

    expect(interim?.topConflictTitle).toBe('超长距离行驶');
    expect(interim?.topConflictMessage).toContain('462km');
  });

  it('uses schedule-day conflict counts instead of trip-wide summary', () => {
    const day4Conflicts = [
      {
        id: 'c1',
        source: 'feasibility' as const,
        priority: 'suggest_adjust' as const,
        category: 'transport' as const,
        title: '交通缓冲偏紧',
        message: '瓦特纳冰川 → 钻石沙滩',
        categoryLabel: '交通',
        affectedDays: [4],
      },
      {
        id: 'c2',
        source: 'feasibility' as const,
        priority: 'suggest_adjust' as const,
        category: 'transport' as const,
        title: '交通缓冲偏紧',
        message: '钻石沙滩 → 杰古沙龙',
        categoryLabel: '交通',
        affectedDays: [4],
      },
    ];

    const interim = buildDecisionCheckerPlanningInterimForFocus({
      summary: { total: 14, mustHandle: 0, suggestAdjust: 14, pendingConfirm: 0, byCategory: {} },
      items: day4Conflicts,
      focusConflict: day4Conflicts[0],
      scheduleDayConflicts: day4Conflicts,
    });

    expect(interim?.total).toBe(2);
    expect(interim?.suggestAdjust).toBe(2);
    expect(interim?.topConflictTitle).toBe('交通缓冲偏紧');
  });

  it('filters evidence tab to focused decision problem', () => {
    const scoped = scopeDecisionCheckerForDecisionSpace(baseChecker, {
      problem: {
        id: 'dp_thingvellir',
        type: 'RISK',
        title: '第2天 · 辛格维利尔国家公园',
        status: 'OPEN',
        primaryEnforcement: 'REQUIRE_ADJUSTMENT',
        affectedDayNumbers: [2],
      },
    });

    expect(scoped.evidence.items).toHaveLength(1);
    expect(scoped.evidence.items[0]?.title).toContain('辛格维利尔');
  });

  it('filters evidence by POI token only', () => {
    const filtered = filterDecisionCheckerEvidenceForFocus(baseChecker.evidence, {
      problem: {
        id: 'dp_blue',
        type: 'RISK',
        title: '第1天 · 蓝湖温泉：需要预约',
        status: 'OPEN',
        primaryEnforcement: 'BLOCK',
        affectedDayNumbers: [1],
      },
    });
    expect(filtered.items).toHaveLength(1);
    expect(filtered.items[0]?.title).toContain('蓝湖');
  });

  it('detects day from conflict message when affectedDays missing', () => {
    expect(
      planningConflictAffectsDay(
        {
          id: 'c9',
          source: 'feasibility',
          priority: 'must_handle',
          category: 'transport',
          title: '第9天 · 雷尼斯黑沙滩 → 钻石沙滩',
          message: '车程过长',
          categoryLabel: '交通',
        },
        9,
      ),
    ).toBe(true);
    expect(
      planningConflictAffectsDay(
        {
          id: 'c9',
          source: 'feasibility',
          priority: 'must_handle',
          category: 'transport',
          title: '第9天 · 雷尼斯黑沙滩 → 钻石沙滩',
          message: '车程过长',
          categoryLabel: '交通',
        },
        5,
      ),
    ).toBe(false);
  });

  it('resolves schedule day focus from day problems instead of trip primary', () => {
    const day5Problem = {
      id: 'dp_day5_drive',
      type: 'INFEASIBILITY' as const,
      title: '第5天 · 超长距离行驶',
      status: 'OPEN' as const,
      primaryEnforcement: 'REQUIRE_ADJUSTMENT' as const,
      affectedDayNumbers: [5],
    };
    const day9Conflict: PlanningConflictItem = {
      id: 'c_day9',
      source: 'feasibility',
      priority: 'must_handle',
      category: 'transport',
      title: '第9天 · 雷尼斯黑沙滩 → 钻石沙滩',
      message: '车程过长',
      categoryLabel: '交通',
      affectedDays: [9],
    };

    const focus = resolveWorkbenchFocusForScheduleDay({
      dayIndex: 4,
      conflicts: [drivingConflict, day9Conflict],
      decisionProblems: [day5Problem],
    });

    expect(focus.problem?.id).toBe('dp_day5_drive');
    expect(focus.conflict?.id).toBe('c_drive_5');
    expect(focus.conflict?.id).not.toBe('c_day9');
    expect(focus.dayProblems).toHaveLength(1);
    expect(focus.dayConflicts).toContainEqual(drivingConflict);
  });

  it('includes all day POI evidence when schedule day focus is active', () => {
    const evidenceWithDay5 = {
      ...baseChecker.evidence,
      items: [
        {
          id: 'ev_kirk',
          kind: 'inventory' as const,
          title: '营业时间 · 草帽山',
          subtitle: '未获取开放时间证据',
          reliability: 'medium' as const,
        },
        {
          id: 'ev_budir',
          kind: 'inventory' as const,
          title: '营业时间 · 黑教堂',
          subtitle: '未获取开放时间证据',
          reliability: 'medium' as const,
        },
        {
          id: 'ev_buffer',
          kind: 'inventory' as const,
          title: '交通缓冲 · 草帽山 → 黑教堂',
          subtitle: '缓冲偏紧',
          reliability: 'low' as const,
        },
        {
          id: 'ev_day9',
          kind: 'inventory' as const,
          title: '第9天 · 钻石沙滩',
          subtitle: '车程过长',
          reliability: 'high' as const,
        },
      ],
      summary: { high: 1, medium: 2, low: 1 },
    };

    const scopedMulti = scopeDecisionCheckerForDecisionSpace(
      { ...baseChecker, evidence: evidenceWithDay5 },
      {
        conflict: drivingConflict,
        scheduleDayIndex: 4,
        scheduleDayProblems: [
          {
            id: 'dp_kirk',
            type: 'RISK',
            title: '第5天 · 草帽山',
            status: 'OPEN',
            primaryEnforcement: 'REQUIRE_ADJUSTMENT',
            affectedDayNumbers: [5],
          },
          {
            id: 'dp_budir',
            type: 'RISK',
            title: '第5天 · 黑教堂',
            status: 'OPEN',
            primaryEnforcement: 'REQUIRE_ADJUSTMENT',
            affectedDayNumbers: [5],
          },
        ],
        scheduleDayConflicts: [drivingConflict],
        scheduleDayExtraTokens: ['交通缓冲偏紧'],
      },
    );

    expect(scopedMulti.evidence.items.map((item) => item.id)).toEqual([
      'ev_kirk',
      'ev_budir',
      'ev_buffer',
    ]);
    expect(scopedMulti.evidence.judgmentExplanation).toBeUndefined();
  });

  it('excludes other-day POI evidence when schedule day is selected', () => {
    const evidenceMixedDays = {
      ...baseChecker.evidence,
      items: [
        {
          id: 'ev_day1_skoga',
          kind: 'inventory' as const,
          title: '营业时间 · 斯科加瀑布',
          subtitle: '第 1 天 · 未获取开放时间证据',
          reliability: 'medium' as const,
        },
        {
          id: 'ev_day3_selja',
          kind: 'inventory' as const,
          title: '营业时间 · 塞里雅兰瀑布',
          subtitle: '未获取开放时间证据',
          reliability: 'medium' as const,
        },
        {
          id: 'ev_day3_skoga',
          kind: 'inventory' as const,
          title: '营业时间 · 斯科加瀑布',
          subtitle: '第 3 天 · 未获取开放时间证据',
          reliability: 'medium' as const,
        },
        {
          id: 'ev_day3_buffer',
          kind: 'inventory' as const,
          title: '交通缓冲 · 塞里雅兰瀑布 → 斯科加瀑布',
          subtitle: '缓冲偏紧',
          reliability: 'low' as const,
        },
      ],
      summary: { high: 0, medium: 3, low: 1 },
    };

    const scopedDay3 = scopeDecisionCheckerForDecisionSpace(
      { ...baseChecker, evidence: evidenceMixedDays },
      {
        scheduleDayIndex: 2,
        scheduleDayProblems: [
          {
            id: 'dp_skoga',
            type: 'RISK',
            title: '第3天 · 斯科加瀑布：缺少证据覆盖',
            status: 'OPEN',
            primaryEnforcement: 'REQUIRE_ADJUSTMENT',
            affectedDayNumbers: [3],
          },
        ],
        scheduleDayExtraTokens: ['塞里雅兰瀑布', 'Seljalandsfoss', 'Skógafoss', '交通缓冲偏紧'],
      },
    );

    expect(scopedDay3.evidence.items.map((item) => item.id)).toEqual([
      'ev_day3_selja',
      'ev_day3_skoga',
      'ev_day3_buffer',
    ]);
  });

  it('scopes evidence by schedule day even without primary problem', () => {
    const filtered = filterDecisionCheckerEvidenceForFocus(baseChecker.evidence, {
      scheduleDayIndex: 1,
      scheduleDayExtraTokens: ['辛格维利尔'],
    });
    expect(filtered.items).toHaveLength(1);
    expect(filtered.items[0]?.title).toContain('辛格维利尔');
  });

  it('does not synthesize frontend placeholders for missing timeline POIs', () => {
    const day3SkogaOnly = {
      ...baseChecker.evidence,
      items: [
        {
          id: 'ev_skoga_weather',
          kind: 'weather' as const,
          title: '天气与道路（斯科加瀑布）',
          subtitle: '天气证据未获取',
          reliability: 'medium' as const,
        },
        {
          id: 'ev_skoga_hours',
          kind: 'inventory' as const,
          title: '营业时间（斯科加瀑布）',
          subtitle: '开放时间证据已获取',
          reliability: 'high' as const,
        },
      ],
      summary: { high: 1, medium: 1, low: 0 },
    };

    const scoped = scopeDecisionCheckerForDecisionSpace(
      { ...baseChecker, evidence: day3SkogaOnly },
      {
        scheduleDayIndex: 2,
        scheduleDayTimelinePois: ['塞里雅兰瀑布', '斯科加瀑布'],
        scheduleDayProblems: [
          {
            id: 'dp_skoga',
            type: 'RISK',
            title: '第3天 · 斯科加瀑布：缺少证据覆盖',
            status: 'OPEN',
            primaryEnforcement: 'REQUIRE_ADJUSTMENT',
            affectedDayNumbers: [3],
          },
        ],
      },
    );

    expect(scoped.evidence.items.every((item) => !item.id.startsWith('ev_timeline-gap'))).toBe(
      true,
    );
    expect(scoped.evidence.items.map((item) => item.title)).toEqual([
      '天气与道路（斯科加瀑布）',
      '营业时间（斯科加瀑布）',
    ]);
  });

  it('scopes BFF evidence by schedule day without placeholders', () => {
    const day3Full = {
      ...baseChecker.evidence,
      items: [
        {
          id: 'ev_selja_hours',
          kind: 'opening_hours' as const,
          title: '塞里雅兰瀑布',
          subtitle: '塞里雅兰瀑布 · 开放时间证据未获取',
          reliability: 'low' as const,
        },
        {
          id: 'ev_skoga_hours',
          kind: 'opening_hours' as const,
          title: '斯科加瀑布',
          subtitle: '斯科加瀑布 已具备 开放时间 证据',
          reliability: 'high' as const,
        },
      ],
      summary: { high: 1, medium: 0, low: 1 },
    };

    const scoped = scopeDecisionCheckerForDecisionSpace(
      { ...baseChecker, evidence: day3Full },
      {
        scheduleDayIndex: 2,
        scheduleDayTimelinePois: ['塞里雅兰瀑布', '斯科加瀑布'],
        scheduleDayProblems: [
          {
            id: 'dp_skoga',
            type: 'RISK',
            title: '第3天 · 斯科加瀑布：缺少证据覆盖',
            status: 'OPEN',
            primaryEnforcement: 'REQUIRE_ADJUSTMENT',
            affectedDayNumbers: [3],
          },
        ],
      },
    );

    expect(scoped.evidence.items.every((item) => !item.id.startsWith('ev_timeline-gap'))).toBe(
      true,
    );
    expect(scoped.evidence.items.map((item) => item.title)).toEqual([
      '塞里雅兰瀑布',
      '斯科加瀑布',
    ]);
  });

  it('excludes unrelated POI evidence via timeline POI scoping', () => {
    const lunchWindowEvidence = {
      ...baseChecker.evidence,
      items: [
        {
          id: 'ev_hallgrim',
          kind: 'schedule' as const,
          title: '哈尔格林姆斯教堂',
          subtitle: '预计 14:12 结束，超过 12:00 午餐窗口',
          reliability: 'medium' as const,
        },
        {
          id: 'ev_skoga',
          kind: 'schedule' as const,
          title: '斯科加瀑布',
          subtitle: '预计 13:53 结束，超过 12:00 午餐窗口',
          reliability: 'medium' as const,
        },
        {
          id: 'ev_kirk',
          kind: 'opening_hours' as const,
          title: '草帽山',
          subtitle: '开放时间证据已获取',
          reliability: 'high' as const,
        },
        {
          id: 'ev_budir',
          kind: 'opening_hours' as const,
          title: '黑教堂',
          subtitle: '预计 14:05 结束，超过 12:00 午餐窗口',
          reliability: 'medium' as const,
        },
      ],
      summary: { high: 1, medium: 3, low: 0 },
    };

    const scoped = scopeDecisionCheckerForDecisionSpace(
      {
        ...baseChecker,
        focusConflictId: 'issue-gap-4',
        evidence: lunchWindowEvidence,
      },
      {
        scheduleDayIndex: 4,
        scheduleDayConflicts: [
          {
            id: 'issue-gap-4',
            source: 'coverage',
            priority: 'suggest_adjust',
            category: 'transport',
            title: '交通缓冲偏紧',
            message: '第5天，教堂山 -> 布迪尔黑教堂（约 13.8 km）',
            categoryLabel: '交通',
            affectedDays: [5],
          },
        ],
        scheduleDayTimelinePois: ['草帽山', '黑教堂'],
        scheduleDayExtraTokens: ['交通缓冲偏紧'],
      },
    );

    expect(scoped.evidence.items.map((item) => item.id)).toEqual(['ev_kirk', 'ev_budir']);
  });

  it('itemMatchesScheduleDayTimelinePois avoids church substring false positives', () => {
    expect(
      itemMatchesScheduleDayTimelinePois('哈尔格林姆斯教堂预计 14:12 结束', ['草帽山', '黑教堂']),
    ).toBe(false);
    expect(itemMatchesScheduleDayTimelinePois('黑教堂 · 预计 14:05 结束', ['草帽山', '黑教堂'])).toBe(
      true,
    );
  });

  it('resolveDecisionCheckerFocusConflictIdForDay picks first issue-gap on the day', () => {
    const conflicts: PlanningConflictItem[] = [
      {
        id: 'poi-access:blue-lagoon',
        source: 'gate',
        priority: 'must_handle',
        category: 'access',
        title: '蓝湖温泉',
        affectedDays: [1],
      },
      {
        id: 'issue-gap-3',
        source: 'coverage',
        priority: 'suggest_adjust',
        category: 'evidence',
        title: '第3天 · 斯科加瀑布',
        affectedDays: [3],
      },
      {
        id: 'issue-gap-4',
        source: 'coverage',
        priority: 'suggest_adjust',
        category: 'evidence',
        title: '第5天 · 教堂山',
        affectedDays: [5],
      },
      {
        id: 'issue-gap-5',
        source: 'coverage',
        priority: 'suggest_adjust',
        category: 'evidence',
        title: '第5天 · 布迪尔黑教堂',
        affectedDays: [5],
      },
    ];

    expect(resolveDecisionCheckerFocusConflictIdForDay(conflicts, 3)).toBe('issue-gap-3');
    expect(resolveDecisionCheckerFocusConflictIdForDay(conflicts, 5)).toBe('issue-gap-4');
    expect(resolveDecisionCheckerFocusConflictIdForDay(conflicts, 1)).toBe(
      'poi-access:blue-lagoon',
    );
    expect(resolveDecisionCheckerFocusConflictIdForDay(conflicts, 9)).toBeNull();
  });
});

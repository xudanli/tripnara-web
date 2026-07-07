import { describe, expect, it } from 'vitest';
import {
  extractContextFromConflictMessage,
  extractRouteContextFromTitle,
  inferDecisionProblemScope,
  isDiagnosticQueueTitle,
  mapDecisionProblemsForQueueDisplay,
} from './decision-problem-queue-context.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';

describe('decision-problem-queue-context.util', () => {
  it('extracts route from travel buffer conflict message', () => {
    const message =
      '第4天 · 瓦特纳冰川国家公园游客中心（斯卡夫塔山）→ 冰河湖（约 36.7 km）：路上约需 53 分钟，抵达后缓冲偏紧';
    expect(extractContextFromConflictMessage(message)).toMatchObject({
      dayNumbers: [4],
      contextLine: '瓦特纳冰川国家公园游客中心 → 冰河湖',
    });
  });

  it('extracts poi from lunch late title pattern', () => {
    expect(
      extractRouteContextFromTitle('预计 冰河湖 结束于 14:18，晚于午餐窗 12:00'),
    ).toBe('冰河湖');
  });

  it('detects diagnostic queue titles', () => {
    expect(isDiagnosticQueueTitle('交通缓冲偏紧')).toBe(false);
    expect(isDiagnosticQueueTitle('预计 彩虹街 结束于 16:27，晚于午餐窗 12:00')).toBe(true);
  });

  it('infers day from impactScopeView arrangements', () => {
    const scope = inferDecisionProblemScope({
      id: 'p1',
      type: 'RISK',
      title: '交通缓冲偏紧',
      status: 'OPEN',
      primaryEnforcement: 'REQUIRE_ADJUSTMENT',
      impactScopeView: {
        narrative: { templateKey: 'impact.test', params: { primaryDayIndex: 3 } },
        arrangements: [
          { label: '草帽山', dayIndex: 3 },
          { label: '黑教堂', dayIndex: 3 },
        ],
      },
    });
    expect(scope.affectedDayNumbers).toEqual([3]);
    expect(scope.affectedScopeSummary).toBe('草帽山 → 黑教堂');
  });

  it('infers day from scope.dayIds when legacy affectedDayNumbers missing', () => {
    const scope = inferDecisionProblemScope({
      id: 'CAS-123',
      type: 'RISK',
      title: '午餐窗冲突',
      status: 'OPEN',
      primaryEnforcement: 'REQUIRE_ADJUSTMENT',
      affectedScopeSummary: '彩虹街',
      scope: { dayIds: [1] },
      impactScopeView: {
        arrangements: [{ label: '彩虹街', dayIndex: 1 }],
      },
    });
    expect(scope.affectedDayNumbers).toEqual([1]);
    expect(scope.affectedScopeSummary).toBe('彩虹街');
  });

  it('infers day from semanticKey when other scope fields missing', () => {
    const scope = inferDecisionProblemScope({
      id: 'p-meal',
      type: 'RISK',
      title: '午餐窗冲突',
      status: 'OPEN',
      primaryEnforcement: 'REQUIRE_ADJUSTMENT',
      semanticKey: 'plan_object_meal_window_day_1',
    });
    expect(scope.affectedDayNumbers).toEqual([1]);
  });

  it('maps categoryLabel to queueCategoryLabel for display', () => {
    const problems: DecisionProblemSummary[] = [
      {
        id: 'dp-meal-day1',
        type: 'RISK',
        title: '午餐窗冲突',
        status: 'OPEN',
        primaryEnforcement: 'REQUIRE_ADJUSTMENT',
        categoryLabel: '日程',
        affectedDayNumbers: [1],
        affectedScopeSummary: '彩虹街',
      },
    ];
    const mapped = mapDecisionProblemsForQueueDisplay(problems);
    expect(mapped[0]?.queueCategoryLabel).toBe('日程');
    expect(mapped[0]?.title).toBe('午餐窗冲突');
    expect(mapped[0]?.affectedScopeSummary).toBe('彩虹街');
  });
});

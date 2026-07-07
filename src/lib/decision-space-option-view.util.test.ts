import { describe, expect, it } from 'vitest';
import {
  buildDecisionSpaceOptionViews,
  collectPrivateConcernsFromOptions,
  parseTradeoffComparisonSegments,
} from '@/lib/decision-space-option-view.util';
import type { DecisionOption, DecisionProblemDetail } from '@/types/decision-problem';

const OPTIONS: DecisionOption[] = [
  {
    id: 'opt_a',
    title: '更换 Day 2 住宿',
    description: '改住伊萨菲厄泽，缩短驾驶距离',
    routePreview: { placeNames: ['Patreksfjörður', 'Dýrafjörður', 'Ísafjörður'] },
    tradeoffs: [
      { dimension: 'FLEXIBILITY', direction: 'IMPROVE', value: 32, unit: 'PERCENT' },
      {
        dimension: 'TIME',
        direction: 'IMPROVE',
        value: 204,
        unit: 'MINUTE',
        explanation: '原方案 6h42m → 调整后 3h18m',
      },
      { dimension: 'COST', direction: 'WORSEN', value: 820, unit: 'CURRENCY' },
      {
        dimension: 'POI_COVERAGE',
        direction: 'IMPROVE',
        value: 5,
        unit: 'PERCENT',
        baselineValue: 90,
      },
    ],
  },
  {
    id: 'opt_b',
    title: '删除次要景点',
    tradeoffs: [{ dimension: 'COST', direction: 'WORSEN', value: 120, unit: 'CURRENCY' }],
  },
];

describe('decision-space-option-view.util', () => {
  it('builds rich option cards from BFF tradeoffs', () => {
    const views = buildDecisionSpaceOptionViews({ options: OPTIONS });
    expect(views).toHaveLength(2);
    expect(views[0]?.metrics.length).toBeGreaterThanOrEqual(3);
    expect(views[0]?.metrics.find((m) => m.key === 'POI_COVERAGE')?.displayValue).toBe('95% (+5%)');
    expect(views[0]?.predictedSupportPct).toBeGreaterThan(views[1]?.predictedSupportPct ?? 0);
    expect(views[0]?.comparison?.before).toBe('6h42m');
    expect(views[0]?.comparison?.after).toBe('3h18m');
    expect(views[0]?.routeLabels).toEqual(['Patreksfjörður', 'Dýrafjörður', 'Ísafjörður']);
  });

  it('degrades sparse explanation-only tradeoffs', () => {
    const sparse: DecisionOption[] = [
      {
        id: 'sparse',
        title: '确认营业时间',
        tradeoffs: [
          {
            dimension: 'POI_COVERAGE',
            direction: 'IMPROVE',
            explanation: 'medium 确认营业时间 查询该景点/地点的开放时间',
          },
          {
            dimension: 'TIME',
            direction: 'IMPROVE',
            explanation: '原方案 6h42m → 调整后 3h18m',
          },
        ],
      },
    ];
    const views = buildDecisionSpaceOptionViews({ options: sparse });
    expect(views[0]?.metrics).toHaveLength(2);
    expect(views[0]?.metrics.find((m) => m.key === 'TIME')?.displayValue).toBe('3h18m');
    expect(views[0]?.comparison?.after).toBe('3h18m');
  });

  it('falls back route labels from problem scope for recommended option', () => {
    const detail: DecisionProblemDetail = {
      problemId: 'p1',
      title: 't',
      status: 'OPEN',
      affectedScopeDisplay: [
        { scopeType: 'LEG', scopeId: '1', label: 'A → B → C', placeNames: ['A', 'B', 'C'] },
      ],
    };
    const views = buildDecisionSpaceOptionViews({
      options: [{ id: 'x', title: '方案' }],
      detail,
    });
    expect(views[0]?.routeLabels).toEqual(['A', 'B', 'C']);
  });

  it('parses comparison segments from explanation', () => {
    expect(parseTradeoffComparisonSegments('原方案 6h42m → 调整后 3h18m')).toEqual({
      before: '6h42m',
      after: '3h18m',
    });
  });

  it('formats ISO datetimes embedded in option description', () => {
    const views = buildDecisionSpaceOptionViews({
      displayTimezone: 'Atlantic/Reykjavik',
      options: [
        {
          id: 'buffer',
          title: '顺延下一项开始时间',
          description:
            '将钻石沙滩的开始时间调整为 2026-08-03T11:29:00.000+00:00，以弥补交通衔接',
        },
      ],
    });
    expect(views[0]?.description).toContain('8月3日');
    expect(views[0]?.description).not.toContain('T11:29:00');
  });

  it('collects private concerns from worsening tradeoffs', () => {
    const bullets = collectPrivateConcernsFromOptions(OPTIONS, '超长距离驾驶');
    expect(bullets.some((b) => b.includes('预算'))).toBe(true);
    expect(bullets.some((b) => b.includes('疲劳'))).toBe(true);
  });
});

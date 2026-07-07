import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  formatTradeoffCell,
  formatTradeoffUnitValue,
  groupAffectedScopeDisplayByDay,
} from '@/lib/decision-problem-display.util';
import { AffectedScopeDisplayList } from '@/components/decision-problems/AffectedScopeDisplayList';
import {
  FIXTURE_BUFFER_TRADEOFF_OPTIONS,
  FIXTURE_ICELAND_ROAD_CLASS_SCOPE,
} from '@/trips/decision-semantics/fixtures/decision-center-display.fixtures';

describe('DC-FE-010 affectedScopeDisplay', () => {
  it('renders label and secondaryLabel from BFF only', () => {
    const html = renderToStaticMarkup(
      createElement(AffectedScopeDisplayList, { items: FIXTURE_ICELAND_ROAD_CLASS_SCOPE }),
    );
    expect(html).toContain('第 6 天 · 米湖 → 迪尔餐厅');
    expect(html).toContain('380km');
    expect(html).not.toContain('250');
    expect(html).toContain('米湖');
  });

  it('groups by dayIndex', () => {
    const groups = groupAffectedScopeDisplayByDay(FIXTURE_ICELAND_ROAD_CLASS_SCOPE);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.dayIndex).toBe(6);
  });
});

describe('DC-FE-011 tradeoffs value/unit', () => {
  it('formats MINUTE values for comparison', () => {
    expect(formatTradeoffUnitValue(30, 'MINUTE')).toBe('+30 分钟');
    expect(formatTradeoffUnitValue(60, 'MINUTE')).toBe('+60 分钟');
    const a = FIXTURE_BUFFER_TRADEOFF_OPTIONS[0]?.tradeoffs?.[0];
    const b = FIXTURE_BUFFER_TRADEOFF_OPTIONS[1]?.tradeoffs?.[0];
    expect(formatTradeoffCell(a!)).toContain('+30 分钟');
    expect(formatTradeoffCell(b!)).toContain('+60 分钟');
    expect(formatTradeoffCell(a!)).not.toBe(formatTradeoffCell(b!));
  });

  it('without value shows direction + explanation only', () => {
    expect(
      formatTradeoffCell({
        dimension: 'POI_COVERAGE',
        direction: 'WORSEN',
        explanation: '需跳过部分景点',
      }),
    ).toBe('↓ 需跳过部分景点');
  });

  it('formats DAY buffer without guessing minutes', () => {
    expect(
      formatTradeoffCell({
        dimension: 'TIME',
        direction: 'IMPROVE',
        value: 1,
        unit: 'DAY',
        explanation: '增加缓冲日',
      }),
    ).toBe('+1 天 · 增加缓冲日');
  });
});

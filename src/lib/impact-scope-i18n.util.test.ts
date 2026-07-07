import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import zh from '@/locales/zh/translation.json';
import {
  buildImpactScopeInterpolation,
  formatImpactScopeChainLink,
  formatImpactScopeHeadline,
  formatImpactScopeList,
  formatImpactScopeTrigger,
  resolveImpactScopeDays,
  dayLabelForDecisionContext,
  stripEmbeddedDayFromDecisionTitle,
} from '@/lib/impact-scope-i18n.util';
import type { ImpactScopeView } from '@/types/impact-scope';

function mockT(language: 'zh' | 'en'): TFunction {
  const bundle = language === 'zh' ? zh.impact : undefined;
  const t = ((key: string, opts?: Record<string, unknown>) => {
    const parts = key.split('.');
    let node: unknown = language === 'zh' ? zh : {};
    for (const part of parts) {
      if (!node || typeof node !== 'object') break;
      node = (node as Record<string, unknown>)[part];
    }
    if (typeof node === 'string') {
      return node.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
        String(opts?.[name] ?? ''),
      );
    }
    return String(opts?.defaultValue ?? key);
  }) as TFunction;
  void bundle;
  return t;
}

describe('impact-scope-i18n.util', () => {
  it('formats zh road close narrative', () => {
    const view: ImpactScopeView = {
      narrative: {
        templateKey: 'impact.road_close.affects_arrangements',
        params: {
          subjectId: 'F208',
          status: 'CLOSED',
          dayIndexes: [3],
          arrangementLabels: ['红沙滩', 'Black Beach Suites'],
          arrangementCount: 2,
        },
      },
    };
    const text = formatImpactScopeHeadline(view, mockT('zh'), 'zh');
    expect(text).toContain('F208');
    expect(text).toContain('红沙滩');
    expect(text).toContain('第 3 天');
  });

  it('joins arrangement labels for zh', () => {
    expect(formatImpactScopeList(['红沙滩', 'Black Beach Suites'], 'zh')).toBe(
      '红沙滩、Black Beach Suites',
    );
  });

  it('joins arrangement labels for en', () => {
    expect(formatImpactScopeList(['A', 'B', 'C'], 'en')).toBe('A, B, and C');
  });

  it('builds interpolation from backend params', () => {
    const values = buildImpactScopeInterpolation(
      {
        subjectId: 'F208',
        dayIndexes: [3],
        arrangementLabels: ['红沙滩'],
        arrangementCount: 1,
      },
      'zh',
    );
    expect(values.road).toBe('F208');
    expect(values.day).toBe(3);
    expect(values.names).toBe('红沙滩');
  });

  it('formats structured trigger with day from context', () => {
    const text = formatImpactScopeTrigger(
      {
        capability: 'EXCESSIVE_DAILY_LOAD',
        subjectKind: 'DAY',
        subjectId: '',
      },
      mockT('zh'),
      { day: 5 },
    );
    expect(text).toContain('5');
    expect(text).toContain('驾驶负荷');
  });

  it('hides trigger when day is missing', () => {
    const text = formatImpactScopeTrigger(
      { capability: 'EXCESSIVE_DAILY_LOAD', subjectKind: 'DAY' },
      mockT('zh'),
    );
    expect(text).toBeUndefined();
  });

  it('formats road trigger', () => {
    const text = formatImpactScopeTrigger(
      {
        capability: 'ROAD_SEGMENT_UNAVAILABLE',
        subjectKind: 'ROAD',
        subjectId: 'F208',
        status: 'CLOSED',
      },
      mockT('zh'),
    );
    expect(text).toContain('F208');
    expect(text).toContain('道路关闭');
  });

  it('formats chain consequence kind', () => {
    const rendered = formatImpactScopeChainLink(
      { kind: 'consequence', consequenceKind: 'DAILY_DRIVING_LOAD' },
      mockT('zh'),
    );
    expect(rendered.body).toContain('驾驶负荷');
  });

  it('uses entityRef for route chain link', () => {
    const rendered = formatImpactScopeChainLink(
      { kind: 'route', entityRef: 'F208' },
      mockT('zh'),
    );
    expect(rendered.body).toBe('F208');
  });

  it('resolves all impact scope days from narrative and arrangements', () => {
    const days = resolveImpactScopeDays({
      narrative: {
        templateKey: 'impact.daily_load.affects_arrangements',
        params: { dayIndexes: [6] },
      },
      arrangements: [{ label: '红沙滩', dayIndex: 6 }],
    });
    expect(days).toEqual([6]);
  });

  it('prefers impact scope day over title day for decision context', () => {
    const label = dayLabelForDecisionContext({
      impactScopeView: {
        narrative: {
          templateKey: 'impact.daily_load.affects_arrangements',
          params: { primaryDayIndex: 6, dayIndexes: [6] },
        },
      },
      problem: { title: '行程负荷过高：第 5 日驾驶超时' },
      language: 'zh',
    });
    expect(label).toBe('第 6 天');
  });

  it('uses primaryDayIndex as narrative day SSOT', () => {
    const values = buildImpactScopeInterpolation(
      { primaryDayIndex: 6, dayIndexes: [6], arrangementLabels: ['红沙滩'] },
      'zh',
    );
    expect(values.day).toBe(6);
    expect(values.primaryDayIndex).toBe(6);
  });

  it('strips embedded day from decision title', () => {
    expect(stripEmbeddedDayFromDecisionTitle('行程负荷过高：第 5 日驾驶超时')).toBe(
      '行程负荷过高',
    );
  });
});

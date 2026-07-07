import { describe, expect, it } from 'vitest';
import {
  extractImpactScopeFromPayload,
  impactScopeHeadline,
  normalizeImpactScopeView,
} from '@/lib/impact-scope-view.util';

describe('impact-scope-view.util', () => {
  it('normalizes narrative-based impactScopeView', () => {
    const view = normalizeImpactScopeView({
      schemaId: 'tripnara.impact_scope@v1',
      narrative: {
        templateKey: 'impact.daily_load.affects_arrangements',
        params: {
          subjectId: '5',
          dayIndexes: [5],
          arrangementLabels: ['红沙滩'],
          arrangementCount: 1,
          directCount: 1,
          downstreamCount: 0,
        },
      },
      chain: [
        { kind: 'trigger', consequenceKind: 'DAILY_DRIVING_LOAD' },
        { kind: 'route', entityRef: 'F208' },
      ],
      arrangements: [
        {
          label: '红沙滩',
          dayIndex: 5,
          isDirect: true,
          arrangementKind: 'POI',
        },
      ],
      trigger: {
        capability: 'EXCESSIVE_DAILY_LOAD',
        subjectKind: 'DAY',
        subjectId: '5',
      },
    });

    expect(view?.schemaId).toBe('tripnara.impact_scope@v1');
    expect(view?.narrative.templateKey).toBe('impact.daily_load.affects_arrangements');
    expect(view?.chain).toHaveLength(2);
    expect(view?.chain?.[1].entityRef).toBe('F208');
    expect(view?.arrangements?.[0].label).toBe('红沙滩');
    expect(view?.trigger?.capability).toBe('EXCESSIVE_DAILY_LOAD');
  });

  it('extracts from payload with impactNarrative', () => {
    const view = extractImpactScopeFromPayload({
      impactNarrative: {
        templateKey: 'impact.road_close.affects_arrangements',
        params: {
          subjectId: 'F208',
          status: 'CLOSED',
          dayIndexes: [3],
          arrangementLabels: ['红沙滩'],
          arrangementCount: 1,
        },
      },
    });
    expect(view?.narrative.templateKey).toBe('impact.road_close.affects_arrangements');
    expect(view?.narrative.params?.subjectId).toBe('F208');
  });

  it('prefers nested impactScopeView over impactNarrative', () => {
    const view = extractImpactScopeFromPayload({
      impactNarrative: { templateKey: 'ignored' },
      impactScopeView: {
        narrative: {
          templateKey: 'impact.road_close.affects_arrangements',
          params: { subjectId: 'F208', dayIndexes: [3], arrangementCount: 1 },
        },
      },
    });
    expect(view?.narrative.templateKey).toBe('impact.road_close.affects_arrangements');
  });

  it('legacy headline maps to _legacy_headline narrative', () => {
    const view = normalizeImpactScopeView({ headline: 'legacy text' });
    expect(view?.narrative.templateKey).toBe('impact._legacy_headline');
    expect(impactScopeHeadline(view)).toBe('legacy text');
  });

  it('returns undefined headline for i18n-only narrative', () => {
    expect(
      impactScopeHeadline({
        narrative: {
          templateKey: 'impact.road_close.affects_arrangements',
          params: { subjectId: 'F208' },
        },
      }),
    ).toBeUndefined();
  });

  it('dedupes arrangements with same day and label', () => {
    const view = normalizeImpactScopeView({
      narrative: {
        templateKey: 'impact._legacy_headline',
        params: { text: '第1天 · 蓝湖温泉 → 哈尔格林姆斯教堂' },
      },
      arrangements: [
        {
          id: 'poi-a',
          label: '蓝湖温泉',
          dayIndex: 1,
          isDirect: true,
          arrangementKind: 'POI',
        },
        {
          id: 'poi-b',
          label: '蓝湖温泉',
          dayIndex: 1,
          isDirect: false,
          arrangementKind: 'POI',
        },
      ],
    });

    expect(view?.arrangements).toHaveLength(1);
    expect(view?.arrangements?.[0].label).toBe('蓝湖温泉');
    expect(view?.arrangements?.[0].isDirect).toBe(true);
  });
});

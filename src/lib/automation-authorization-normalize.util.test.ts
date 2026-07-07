import { describe, expect, it } from 'vitest';
import {
  isAutomationAuthorizationViewReady,
  isAutomationCatalogReady,
  normalizeAutomationAuthorizationView,
} from './automation-authorization-normalize.util';
import { AUTOMATION_CATALOG_GROUP_ORDER } from './trip-automation-authorization.util';

const SAMPLE_VIEW = {
  schemaId: 'tripnara.automation_authorization_view@v1',
  tripId: 'trip-1',
  scope: 'TRIP',
  constraintsVersion: 3,
  automationPaused: false,
  contract: { automation: { defaultLevel: 'SUGGEST' } },
  travelStatus: {
    automation: {
      defaultLevel: 'SUGGEST',
      defaultLevelLabel: '生成建议，需您确认后修改',
      uiLevel: 'L2',
      uiLevelLabel: '建议执行',
      tierCounts: { auto: 28, ask: 12, deny: 4 },
      paused: false,
      catalog: {
        schemaId: 'tripnara.automation_authorization_summary@v1',
        groups: AUTOMATION_CATALOG_GROUP_ORDER.map((group, index) => ({
          group,
          label: `组${index + 1}`,
          autoCount: index === 0 ? 6 : 0,
          askCount: 0,
          denyCount: 0,
          actions: index === 0 ? [{ key: 'monitoring.weather_road_update', label: '天气', effectiveTier: 'AUTO' as const }] : [],
        })),
      },
    },
    aiCompletedWork: { recentCount: 0, items: [] },
  },
};

describe('normalizeAutomationAuthorizationView', () => {
  it('normalizes aggregation view and sorts catalog groups canonically', () => {
    const shuffled = {
      ...SAMPLE_VIEW,
      travelStatus: {
        ...SAMPLE_VIEW.travelStatus,
        automation: {
          ...SAMPLE_VIEW.travelStatus.automation,
          catalog: {
            ...SAMPLE_VIEW.travelStatus.automation.catalog,
            groups: [...SAMPLE_VIEW.travelStatus.automation.catalog.groups].reverse(),
          },
        },
      },
    };

    const view = normalizeAutomationAuthorizationView(shuffled);

    expect(view.schemaId).toBe('tripnara.automation_authorization_view@v1');
    expect(view.travelStatus.automation.catalog.groups.map((g) => g.group)).toEqual([
      ...AUTOMATION_CATALOG_GROUP_ORDER,
    ]);
  });
});

describe('isAutomationAuthorizationViewReady', () => {
  it('returns true when schema and six catalog groups are present', () => {
    const view = normalizeAutomationAuthorizationView(SAMPLE_VIEW);
    expect(isAutomationAuthorizationViewReady(view)).toBe(true);
    expect(isAutomationCatalogReady(view.travelStatus.automation)).toBe(true);
  });

  it('returns false when schemaId mismatches or catalog is incomplete', () => {
    const view = normalizeAutomationAuthorizationView({
      ...SAMPLE_VIEW,
      schemaId: 'other@v1',
    });
    expect(isAutomationAuthorizationViewReady(view)).toBe(false);

    const partial = normalizeAutomationAuthorizationView({
      ...SAMPLE_VIEW,
      travelStatus: {
        ...SAMPLE_VIEW.travelStatus,
        automation: {
          ...SAMPLE_VIEW.travelStatus.automation,
          catalog: {
            groups: SAMPLE_VIEW.travelStatus.automation.catalog.groups.slice(0, 3),
          },
        },
      },
    });
    expect(isAutomationAuthorizationViewReady(partial)).toBe(false);
  });
});

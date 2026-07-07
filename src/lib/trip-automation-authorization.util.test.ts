import { describe, expect, it } from 'vitest';
import type { AutomationCatalogAction } from '@/api/automation-authorization.types';
import {
  applyUiLevelToCatalog,
  buildCatalogForUiLevel,
  resolveActionEffectiveTier,
} from './trip-automation-authorization.util';

function action(
  key: string,
  defaultTier: AutomationCatalogAction['effectiveTier'],
  extra?: Partial<AutomationCatalogAction>,
): AutomationCatalogAction {
  return {
    key,
    label: key,
    defaultTier,
    effectiveTier: defaultTier,
    ...extra,
  };
}

describe('applyUiLevelToCatalog', () => {
  const groups = [
    {
      group: 'MONITORING',
      label: '环境监控',
      autoCount: 0,
      askCount: 0,
      denyCount: 0,
      actions: [action('monitoring.weather_road_update', 'AUTO')],
    },
    {
      group: 'ACTIVITY',
      label: '活动与体验',
      autoCount: 0,
      askCount: 0,
      denyCount: 0,
      actions: [action('activity.trim_optional_items', 'AUTO')],
    },
  ];

  it('caps modify actions to ASK at L2 while keeping monitoring AUTO', () => {
    const result = applyUiLevelToCatalog(groups, 'L2', {});
    expect(result[0].actions[0].effectiveTier).toBe('AUTO');
    expect(result[1].actions[0].effectiveTier).toBe('ASK');
    expect(result[0].autoCount).toBe(1);
    expect(result[1].autoCount).toBe(0);
    expect(result[1].askCount).toBe(1);
  });

  it('allows modify AUTO at L3', () => {
    const result = applyUiLevelToCatalog(groups, 'L3', {});
    expect(result[1].actions[0].effectiveTier).toBe('AUTO');
    expect(result[1].autoCount).toBe(1);
  });

  it('caps all actions to ASK at L0_L1', () => {
    const result = applyUiLevelToCatalog(groups, 'L0_L1', {});
    expect(result[0].actions[0].effectiveTier).toBe('ASK');
    expect(result[1].actions[0].effectiveTier).toBe('ASK');
  });

  it('respects floorTier and user overrides', () => {
    expect(
      resolveActionEffectiveTier(
        action('booking.payment', 'AUTO', { floorTier: 'DENY' }),
        'L4',
        {},
      ),
    ).toBe('DENY');

    expect(
      resolveActionEffectiveTier(action('activity.trim_optional_items', 'AUTO'), 'L3', {
        'activity.trim_optional_items': 'DENY',
      }),
    ).toBe('DENY');
  });

  it('buildCatalogForUiLevel updates tab counts across levels', () => {
    const catalog = { groups };
    const atL2 = buildCatalogForUiLevel(catalog, 'L2', {});
    const atL3 = buildCatalogForUiLevel(catalog, 'L3', {});
    expect(atL2?.groups.reduce((n, g) => n + g.autoCount, 0)).toBe(1);
    expect(atL3?.groups.reduce((n, g) => n + g.autoCount, 0)).toBe(2);
  });
});

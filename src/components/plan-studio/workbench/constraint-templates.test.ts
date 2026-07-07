import { describe, expect, it } from 'vitest';
import {
  CATALOG_HARD_TEMPLATE_IDS,
  CONSTRAINT_TEMPLATES,
  getVisibleConstraintTemplates,
  groupHardConstraintTemplates,
  isCatalogHardTemplate,
  resolveConfiguredHardConstraintIds,
  shouldCatalogPostOnTemplatePick,
} from './constraint-templates';

describe('constraint-templates catalog', () => {
  it('includes user-facing hard constraint categories', () => {
    const hard = CONSTRAINT_TEMPLATES.filter((t) => t.kind === 'hard');
    const ids = new Set(hard.map((t) => t.id));
    expect(ids.has('earliest_departure')).toBe(true);
    expect(ids.has('no_night_drive')).toBe(true);
    expect(ids.has('elderly_walk_limit')).toBe(true);
    expect(ids.has('budget_overrun_tolerance')).toBe(true);
    expect(CONSTRAINT_TEMPLATES.find((t) => t.id === 'allow_budget_overrun')?.kind).toBe('soft');
  });

  it('only catalog hard templates trigger POST on pick', () => {
    expect(shouldCatalogPostOnTemplatePick({ id: 'earliest_departure', kind: 'hard' } as never)).toBe(true);
    expect(shouldCatalogPostOnTemplatePick({ id: 'budget', kind: 'hard' } as never)).toBe(false);
    expect(shouldCatalogPostOnTemplatePick({ id: 'no_night_drive', kind: 'hard' } as never)).toBe(false);
    expect(CATALOG_HARD_TEMPLATE_IDS.every((id) => isCatalogHardTemplate(id))).toBe(true);
  });

  it('groups hard templates by TIME / BUDGET / MEMBER / RISK', () => {
    const groups = groupHardConstraintTemplates(getVisibleConstraintTemplates(null));
    const keys = groups.map((g) => g.category);
    expect(keys).toContain('TIME');
    expect(keys).toContain('BUDGET');
    expect(keys).toContain('MEMBER');
    expect(keys).toContain('RISK');
    expect(groups.find((g) => g.category === 'TIME')?.items.some((t) => t.id === 'max_daily_activity')).toBe(
      true,
    );
  });

  it('resolveConfiguredHardConstraintIds merges api items and templateId', () => {
    const ids = resolveConfiguredHardConstraintIds({
      summary: { timeRange: {}, budget: {}, travelers: {} } as never,
      apiList: {
        meta: { tripId: 't1', constraintsVersion: 1, total: 1 },
        items: [
          { id: 'c_no_night_drive', name: '不夜驾', type: 'HARD' },
          {
            id: 'c_tpl_earliest_departure',
            name: '最早出发',
            type: 'HARD',
            source: { type: 'USER', templateId: 'earliest_departure' },
          },
        ],
        contract: {},
      },
    });
    expect(ids).toContain('no_night_drive');
    expect(ids).toContain('earliest_departure');
    expect(ids).toContain('time_range');
  });
});

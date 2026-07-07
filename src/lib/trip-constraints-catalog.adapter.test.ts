import { describe, expect, it } from 'vitest';
import { Clock } from 'lucide-react';
import {
  apiConstraintIdToUi,
  buildCatalogHardConstraintValue,
  buildCreateHardConstraintDto,
  draftToPreviewChange,
  findApiHardConstraintByTemplateId,
  uiConstraintIdToApi,
} from './trip-constraints.adapter';
import { CATALOG_HARD_TEMPLATE_IDS } from '@/components/plan-studio/workbench/constraint-templates';
import { buildEditorDraftFromEntry } from '@/components/plan-studio/workbench/constraint-console-view.util';

describe('trip-constraints catalog POST adapter', () => {
  it('maps c_tpl_* api ids to template ui ids', () => {
    expect(apiConstraintIdToUi('c_tpl_earliest_departure')).toBe('earliest_departure');
    expect(uiConstraintIdToApi('earliest_departure')).toBe('c_tpl_earliest_departure');
    expect(uiConstraintIdToApi('allow_budget_overrun')).toBe('c_tpl_allow_budget_overrun');
  });

  it('buildCreateHardConstraintDto matches BFF contract', () => {
    const dto = buildCreateHardConstraintDto({
      template: {
        id: 'earliest_departure',
        kind: 'hard',
        category: 'TIME',
        label: '最早出发时间',
        description: '',
        icon: Clock,
      },
      constraintsVersion: 3,
    });
    expect(dto).toEqual({
      name: '最早出发时间',
      type: 'HARD',
      category: 'TIME',
      source: { type: 'USER', templateId: 'earliest_departure' },
      constraintsVersion: 3,
    });
    expect(dto.scope).toBeUndefined();
    expect(dto.operator).toBeUndefined();
  });

  it('rejects legacy hard templates from catalog POST', () => {
    expect(() =>
      buildCreateHardConstraintDto({
        template: {
          id: 'budget',
          kind: 'hard',
          category: 'BUDGET',
          label: '预算',
          description: '',
          icon: Clock,
        },
      }),
    ).toThrow(/LEGACY_CONSTRAINT_USE_PATCH/);
  });

  it('finds catalog constraint by c_tpl id or templateId', () => {
    const found = findApiHardConstraintByTemplateId(
      [
        {
          id: 'c_tpl_earliest_departure',
          name: '最早出发时间',
          type: 'HARD',
          source: { type: 'USER', templateId: 'earliest_departure' },
        },
      ],
      'earliest_departure',
    );
    expect(found?.id).toBe('c_tpl_earliest_departure');
  });

  it('builds PATCH value with time object for earliest_departure', () => {
    const change = draftToPreviewChange({
      id: 'earliest_departure',
      name: '最早出发时间',
      enabled: true,
      type: 'HARD',
      scope: 'TRIP',
      targetValue: 7.5,
      targetUnit: 'hour',
      toleranceMode: 'none',
      toleranceMinutes: 0,
      priority: 8,
      locked: false,
      reason: '',
    });
    expect(change.patch.value).toMatchObject({ time: '07:30', scopeBinding: expect.any(Object) });
    expect(change.patch.scope).toEqual({ type: 'TRIP' });
    expect(change.constraintId).toBe('c_tpl_earliest_departure');
  });

  it('registers all 15 catalog hard template ids', () => {
    expect(CATALOG_HARD_TEMPLATE_IDS).toHaveLength(15);
    expect(CATALOG_HARD_TEMPLATE_IDS).toContain('no_unverified_route');
  });

  it('formats catalog time values', () => {
    expect(buildCatalogHardConstraintValue('earliest_departure', {
      targetValue: 8,
      targetUnit: 'hour',
    })).toEqual({ time: '08:00' });
  });

  it('buildEditorDraftFromEntry hydrates catalog values from API', () => {
    const draft = buildEditorDraftFromEntry('c_tpl_max_daily_activity', null, null, [], {
      apiConstraint: {
        id: 'c_tpl_max_daily_activity',
        name: '每日最大活动时长',
        type: 'HARD',
        value: { hours: 9 },
        priority: 6,
      },
    });
    expect(draft.id).toBe('max_daily_activity');
    expect(draft.targetValue).toBe(9);
    expect(draft.type).toBe('HARD');
  });
});

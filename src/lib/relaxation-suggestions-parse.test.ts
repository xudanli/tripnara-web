import { describe, expect, it } from 'vitest';
import {
  buildRelaxationClarificationAnswers,
  normalizeRelaxationSuggestionV1,
  normalizeRelaxationSuggestionsContextV1,
  parseRelaxationSuggestionsBundle,
} from '@/lib/relaxation-suggestions-parse.util';

describe('normalizeRelaxationSuggestionV1', () => {
  it('parses BFF v1 suggestion', () => {
    expect(
      normalizeRelaxationSuggestionV1({
        schema: 'tripnara.relaxation_suggestion@v1',
        actionId: 'upgrade_vehicle_to_4wd',
        labelZh: '升级四驱车辆',
        descriptionZh: '提升冬季道路可达性',
        kind: 'relaxation',
        recommended: true,
      }),
    ).toMatchObject({
      actionId: 'upgrade_vehicle_to_4wd',
      labelZh: '升级四驱车辆',
      recommended: true,
    });
  });

  it('rejects legacy goal-seek shape', () => {
    expect(
      normalizeRelaxationSuggestionV1({
        id: 'r1',
        constraint_label: '预算',
        suggested_value: '82000',
        delta_label: '+2000',
      }),
    ).toBeNull();
  });
});

describe('parseRelaxationSuggestionsBundle', () => {
  it('reads payload and ui_display mirror', () => {
    const bundle = parseRelaxationSuggestionsBundle({
      result: {
        status: 'NEED_MORE_INFO',
        payload: {
          relaxation_suggestions: [
            {
              schema: 'tripnara.relaxation_suggestion@v1',
              actionId: 'upgrade_vehicle_to_4wd',
              labelZh: '升级四驱车辆',
              descriptionZh: '提升可达性',
              kind: 'relaxation',
              recommended: true,
            },
          ],
          relaxation_suggestions_context: {
            schema: 'tripnara.relaxation_suggestions@v1',
            questionId: 'early_warning_relaxations',
            selectionMode: 'single',
            headlineZh: 'Shadow EW 拦截：请选择调整',
          },
          ui_display: {
            relaxation_suggestions: [
              {
                schema: 'tripnara.relaxation_suggestion@v1',
                actionId: 'upgrade_vehicle_to_4wd',
                labelZh: '升级四驱车辆',
                descriptionZh: '提升可达性',
                kind: 'relaxation',
                recommended: true,
              },
            ],
          },
        },
      },
    });

    expect(bundle?.context.questionId).toBe('early_warning_relaxations');
    expect(bundle?.suggestions).toHaveLength(1);
    expect(bundle?.suggestions[0]?.actionId).toBe('upgrade_vehicle_to_4wd');
  });
});

describe('buildRelaxationClarificationAnswers', () => {
  it('builds single-select value array', () => {
    expect(
      buildRelaxationClarificationAnswers(
        {
          schema: 'tripnara.relaxation_suggestions@v1',
          questionId: 'early_warning_relaxations',
          selectionMode: 'single',
        },
        ['upgrade_vehicle_to_4wd'],
      ),
    ).toEqual({
      questionId: 'early_warning_relaxations',
      value: ['upgrade_vehicle_to_4wd'],
    });
  });

  it('builds multi-select values', () => {
    expect(
      buildRelaxationClarificationAnswers(
        {
          schema: 'tripnara.relaxation_suggestions@v1',
          questionId: 'plan_gen_empty_draft_relax_constraints',
          selectionMode: 'multi',
        },
        ['a', 'b'],
      ),
    ).toEqual({
      questionId: 'plan_gen_empty_draft_relax_constraints',
      value: ['a', 'b'],
    });
  });
});

describe('normalizeRelaxationSuggestionsContextV1', () => {
  it('parses context with snake_case fallbacks', () => {
    expect(
      normalizeRelaxationSuggestionsContextV1({
        schema: 'tripnara.relaxation_suggestions@v1',
        question_id: 'plan_gen_empty_draft_relax_constraints',
        selection_mode: 'multi',
        headline_zh: '方案生成熔断',
      }),
    ).toMatchObject({
      questionId: 'plan_gen_empty_draft_relax_constraints',
      selectionMode: 'multi',
      headlineZh: '方案生成熔断',
    });
  });
});

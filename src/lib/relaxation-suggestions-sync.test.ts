import { describe, expect, it } from 'vitest';
import { buildRelaxationClarificationSubmitPayload } from '@/lib/relaxation-clarification-submit.util';
import {
  pickRouteRunResponseTripId,
  shouldPreferRelaxationSuggestionsUi,
  syncRelaxationSuggestionsFromRouteRun,
} from '@/lib/sync-relaxation-suggestions-store';
import { usePlanStudioCompareStore } from '@/store/planStudioCompareStore';

describe('buildRelaxationClarificationSubmitPayload', () => {
  const bundle = {
    context: {
      schema: 'tripnara.relaxation_suggestions@v1' as const,
      questionId: 'early_warning_relaxations',
      selectionMode: 'single' as const,
    },
    suggestions: [
      {
        schema: 'tripnara.relaxation_suggestion@v1' as const,
        actionId: 'upgrade_vehicle_to_4wd',
        labelZh: '升级四驱车辆',
        descriptionZh: '提升可达性',
        kind: 'relaxation' as const,
      },
    ],
  };

  it('builds empty message clarification payload', () => {
    expect(buildRelaxationClarificationSubmitPayload(bundle, ['upgrade_vehicle_to_4wd'])).toEqual({
      message: '',
      displayMessage: '升级四驱车辆',
      clarification_answers: [
        {
          questionId: 'early_warning_relaxations',
          value: ['upgrade_vehicle_to_4wd'],
        },
      ],
    });
  });
});

describe('syncRelaxationSuggestionsFromRouteRun', () => {
  it('writes bundle to compare store when trip id known', () => {
    usePlanStudioCompareStore.getState().clearTrip('trip-1');
    const body = {
      result: {
        status: 'NEED_MORE_INFO',
        payload: {
          trip_id: 'trip-1',
          relaxation_suggestions: [
            {
              schema: 'tripnara.relaxation_suggestion@v1',
              actionId: 'upgrade_vehicle_to_4wd',
              labelZh: '升级四驱车辆',
              descriptionZh: 'x',
              kind: 'relaxation',
            },
          ],
          relaxation_suggestions_context: {
            schema: 'tripnara.relaxation_suggestions@v1',
            questionId: 'early_warning_relaxations',
            selectionMode: 'single',
          },
        },
      },
    };

    const bundle = syncRelaxationSuggestionsFromRouteRun(body as never, 'trip-1');
    expect(bundle?.suggestions).toHaveLength(1);
    expect(usePlanStudioCompareStore.getState().getRelaxationBundle('trip-1')?.context.questionId).toBe(
      'early_warning_relaxations',
    );
  });

  it('prefers relaxation ui when bundle present', () => {
    expect(
      shouldPreferRelaxationSuggestionsUi({
        context: {
          schema: 'tripnara.relaxation_suggestions@v1',
          questionId: 'q',
          selectionMode: 'single',
        },
        suggestions: [
          {
            schema: 'tripnara.relaxation_suggestion@v1',
            actionId: 'a',
            labelZh: 'A',
            descriptionZh: '',
            kind: 'relaxation',
          },
        ],
      }),
    ).toBe(true);
  });

  it('pickRouteRunResponseTripId uses fallback', () => {
    expect(pickRouteRunResponseTripId(undefined, 'trip-fallback')).toBe('trip-fallback');
  });
});

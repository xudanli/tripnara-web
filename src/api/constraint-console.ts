import { tripConstraintsApi, isTripConstraintsUnavailable } from '@/api/trip-constraints';
import {
  draftToPreviewChange,
  mapPreviewImpactToUi,
} from '@/lib/trip-constraints.adapter';
import type { ConstraintEditorDraft } from '@/components/plan-studio/workbench/constraint-console-types';
import { EMPTY_CONSTRAINT_IMPACT_PREVIEW } from '@/components/plan-studio/workbench/constraint-console-types';
import type {
  ConstraintPreviewImpactRequest,
  ConstraintPreviewImpactResponse,
} from '@/types/constraint-console';

const USE_MOCK_API =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_CONSTRAINT_PREVIEW === 'true';

export interface ConstraintPreviewImpactOptions {
  constraintsVersion?: number;
}

export const constraintConsoleApi = {
  /**
   * POST /trips/:tripId/constraints/preview-impact
   * SSOT body: `{ changes: [{ constraintId, patch }] }`
   * 无服务端时返回 null（不再回退本地硬编码预览）。
   */
  previewImpact: async (
    tripId: string,
    body: ConstraintPreviewImpactRequest,
    options: ConstraintPreviewImpactOptions = {},
  ): Promise<ConstraintPreviewImpactResponse | null> => {
    const draft: ConstraintEditorDraft = {
      id: body.constraintId,
      name: body.draft.name ?? body.constraintId,
      enabled: body.draft.enabled ?? true,
      type: body.draft.type ?? 'HARD',
      scope: body.draft.scope ?? 'TRIP',
      targetValue: body.draft.targetValue ?? 0,
      targetUnit: body.draft.targetUnit ?? 'day',
      toleranceMode: body.draft.toleranceMode ?? 'none',
      toleranceMinutes: body.draft.toleranceMinutes ?? 0,
      priority: body.draft.priority ?? 5,
      locked: body.draft.locked ?? false,
      reason: body.draft.reason ?? '',
      startDate: body.draft.startDate,
      endDate: body.draft.endDate,
      currency: body.draft.currency,
    };

    if (USE_MOCK_API) {
      const { mockConstraintConsoleApi } = await import('@/utils/mock-constraint-console-api');
      const preview = await mockConstraintConsoleApi.previewImpact(tripId, body, options);
      return { preview, source: 'bff' };
    }

    try {
      const change = draftToPreviewChange(draft);
      const data = await tripConstraintsApi.previewImpact(tripId, {
        changes: [change],
        persist: false,
      });
      return {
        preview: mapPreviewImpactToUi(data, EMPTY_CONSTRAINT_IMPACT_PREVIEW),
        source: 'bff',
      };
    } catch (err) {
      if (isTripConstraintsUnavailable(err)) {
        return null;
      }
      throw err;
    }
  },
};

export { tripConstraintsApi };

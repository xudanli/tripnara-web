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
import { isCatalogHardTemplate } from '@/lib/constraint-catalog-template-ids';
import { enrichConstraintImpactPreviewWithSchedule } from '@/lib/constraint-preview-schedule.util';
import { reprojectNoNightDrivePreviewWithDraft } from '@/lib/sdr-202-rule-metadata.util';
import {
  buildPacingConstraintImpactPreviewFallback,
  isPacingConstraintPreviewFallbackEligible,
  isPreviewImpactRecoverableServerError,
} from '@/lib/constraint-impact-preview-fallback.util';
import type { TripDetail } from '@/types/trip';
import type { TripConstraint } from '@/types/trip-constraints';
import type { UnifiedConstraintAssessmentBundle } from '@/types/frontend-constraint-assessment-api.types';

const USE_MOCK_API =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_CONSTRAINT_PREVIEW === 'true';

function mergePreviewDraft(body: ConstraintPreviewImpactRequest): ConstraintEditorDraft {
  const partial = body.draft ?? {};
  return {
    id: body.constraintId,
    name: partial.name ?? body.constraintId,
    enabled: partial.enabled ?? true,
    type: partial.type ?? 'HARD',
    scope: partial.scope ?? 'TRIP',
    targetValue: partial.targetValue ?? 0,
    targetUnit: partial.targetUnit ?? 'day',
    toleranceMode: partial.toleranceMode ?? 'none',
    toleranceMinutes: partial.toleranceMinutes ?? 0,
    priority: partial.priority ?? 5,
    locked: partial.locked ?? false,
    reason: partial.reason ?? '',
    startDate: partial.startDate,
    endDate: partial.endDate,
    currency: partial.currency,
    transportMode: partial.transportMode,
    scopeBinding: partial.scopeBinding,
  };
}

function shouldRequestDeepPreview(draft: ConstraintEditorDraft): boolean {
  if (!isCatalogHardTemplate(draft.id)) return false;
  return (
    draft.id === 'earliest_departure' ||
    draft.id === 'latest_end' ||
    draft.id === 'child_nap_time' ||
    draft.id === 'fixed_appointments'
  );
}

export interface ConstraintPreviewImpactOptions {
  constraintsVersion?: number;
  trip?: TripDetail | null;
  assessments?: UnifiedConstraintAssessmentBundle | null;
  feasibilityScore?: number | null;
  apiConstraint?: TripConstraint | null;
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
    const draft = mergePreviewDraft(body);

    if (USE_MOCK_API) {
      const { mockConstraintConsoleApi } = await import('@/utils/mock-constraint-console-api');
      const preview = enrichConstraintImpactPreviewWithSchedule(
        await mockConstraintConsoleApi.previewImpact(tripId, body, options),
        draft,
        options.trip,
      );
      return { preview, source: 'bff' };
    }

    try {
      const change = draftToPreviewChange(draft);
      const data = await tripConstraintsApi.previewImpact(tripId, {
        changes: [change],
        persist: false,
        constraintsVersion: options.constraintsVersion,
        ...(shouldRequestDeepPreview(draft) ? { refreshType: 'deep' as const } : {}),
      });
      const preview = enrichConstraintImpactPreviewWithSchedule(
        mapPreviewImpactToUi(data, EMPTY_CONSTRAINT_IMPACT_PREVIEW),
        draft,
        options.trip,
      );
      return {
        preview,
        source: 'bff',
      };
    } catch (err) {
      if (isTripConstraintsUnavailable(err)) {
        return null;
      }
      const canFallback =
        isPacingConstraintPreviewFallbackEligible(draft.id) &&
        options.assessments?.assessments?.length &&
        isPreviewImpactRecoverableServerError(err);
      if (canFallback) {
        const fallback = buildPacingConstraintImpactPreviewFallback({
          draft,
          apiConstraint: options.apiConstraint,
          assessments: options.assessments,
          feasibilityScore: options.feasibilityScore,
        });
        if (fallback) {
          const preview = enrichConstraintImpactPreviewWithSchedule(
            reprojectNoNightDrivePreviewWithDraft(fallback, draft),
            draft,
            options.trip,
          );
          return { preview, source: 'assessment' };
        }
      }
      throw err;
    }
  },
};

export { tripConstraintsApi };

/**
 * 约束控制台 preview-impact Mock（开发环境 BFF 未就绪时使用）
 */

import type { ConstraintPreviewImpactRequest } from '@/types/constraint-console';
import type {
  ConstraintEditorDraft,
  ConstraintImpactPreview,
} from '@/components/plan-studio/workbench/constraint-console-types';
import { DEFAULT_DAILY_DRIVE_DRAFT } from '@/components/plan-studio/workbench/constraint-console-types';
import { buildConstraintImpactPreview } from '@/components/plan-studio/workbench/constraint-console-view.util';
import type { PlanningConflictDto } from '@/types/planning-conflicts';
import type { TripBudgetProfile } from '@/types/trip-budget';

const MOCK_DELAY = 280;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeDraft(request: ConstraintPreviewImpactRequest): ConstraintEditorDraft {
  const partial = request.draft ?? {};
  return {
    ...DEFAULT_DAILY_DRIVE_DRAFT,
    id: request.constraintId,
    ...partial,
    name: partial.name ?? DEFAULT_DAILY_DRIVE_DRAFT.name,
    enabled: partial.enabled ?? true,
    type: partial.type ?? DEFAULT_DAILY_DRIVE_DRAFT.type,
    scope: partial.scope ?? DEFAULT_DAILY_DRIVE_DRAFT.scope,
    targetValue: partial.targetValue ?? DEFAULT_DAILY_DRIVE_DRAFT.targetValue,
    targetUnit: partial.targetUnit ?? DEFAULT_DAILY_DRIVE_DRAFT.targetUnit,
    toleranceMode: partial.toleranceMode ?? DEFAULT_DAILY_DRIVE_DRAFT.toleranceMode,
    toleranceMinutes: partial.toleranceMinutes ?? DEFAULT_DAILY_DRIVE_DRAFT.toleranceMinutes,
    priority: partial.priority ?? DEFAULT_DAILY_DRIVE_DRAFT.priority,
    locked: partial.locked ?? DEFAULT_DAILY_DRIVE_DRAFT.locked,
    reason: partial.reason ?? '',
  };
}

export interface MockConstraintPreviewContext {
  constraintsVersion?: number;
  conflicts?: PlanningConflictDto[];
  feasibilityScore?: number | null;
  budgetProfile?: TripBudgetProfile | null;
  currency?: string;
}

export const mockConstraintConsoleApi = {
  previewImpact: async (
    tripId: string,
    request: ConstraintPreviewImpactRequest,
    context: MockConstraintPreviewContext = {},
  ): Promise<ConstraintImpactPreview> => {
    await delay(MOCK_DELAY);
    if (import.meta.env.DEV) {
      console.log('[Mock API] constraint previewImpact:', { tripId, request });
    }
    const draft = mergeDraft(request);
    return buildConstraintImpactPreview(draft, {
      conflicts: context.conflicts ?? [],
      feasibilityScore: context.feasibilityScore,
      budgetProfile: context.budgetProfile ?? null,
      currency: context.currency,
    });
  },
};

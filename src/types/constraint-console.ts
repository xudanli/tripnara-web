import type { ConstraintEditorDraft, ConstraintImpactPreview } from '@/components/plan-studio/workbench/constraint-console-types';

export interface ConstraintPreviewImpactRequest {
  constraintId: string;
  draft: Partial<ConstraintEditorDraft>;
}

export interface ConstraintPreviewImpactResponse {
  preview: ConstraintImpactPreview;
  source: 'bff' | 'assessment';
}

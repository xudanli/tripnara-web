import type { GuideToPlanFlowStep } from '@/lib/guide-to-plan-mapper';
import { EXPLORE_FLOW_STEPS } from '@/features/exploration/constants';
import { FlowStepper, type FlowStepItem } from '@/components/guide-import/FlowStepper';

export const GUIDE_FLOW_STEPS = [
  { id: 'import', label: '导入攻略' },
  { id: 'parsing', label: '理解解析' },
  { id: 'summary', label: '确认摘要' },
  { id: 'draft', label: '行程草案' },
  { id: 'compare', label: '调整对比' },
  { id: 'review', label: '逐项确认' },
] as const satisfies ReadonlyArray<{ id: GuideToPlanFlowStep; label: string }>;

export const EXPLORE_FLOW_STEP_ITEMS: FlowStepItem[] = EXPLORE_FLOW_STEPS.map((s) => ({
  id: s.id,
  label: s.label,
}));

export function guideFlowStepIndex(stepId: GuideToPlanFlowStep): number {
  return GUIDE_FLOW_STEPS.findIndex((s) => s.id === stepId);
}

/** @deprecated 使用 FlowStepper */
export function GuideFlowStepper({
  currentStep,
  className,
  compact,
}: {
  currentStep: GuideToPlanFlowStep;
  className?: string;
  compact?: boolean;
}) {
  return (
    <FlowStepper
      steps={GUIDE_FLOW_STEPS}
      currentStepId={currentStep}
      navLabel="攻略导入进度"
      className={className}
      compact={compact}
    />
  );
}

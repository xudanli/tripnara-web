import type { DecisionCheckerActionDto } from '@/types/decision-checker';

export interface DecisionCheckerActionContext {
  onOpenFeasibility?: () => void;
  onOpenEvidence?: () => void;
  onPrimaryCta?: () => void;
  onApplyRelaxation?: (actionId: string) => void;
  onSelectOption?: (optionId: string) => void;
  onOpenRepairPlan?: (repairOptionId: string) => void;
  onApplySplitPlan?: (splitPlanId: string) => void;
  onViewSplitAlternatives?: () => void;
  onDiscussWithNara?: (payload: Record<string, unknown>) => void;
}

/** 执行 BFF 投影的 CTA action */
export function runDecisionCheckerAction(
  action: DecisionCheckerActionDto | undefined,
  ctx: DecisionCheckerActionContext,
): boolean {
  if (!action) return false;

  const payload = action.payload ?? {};

  switch (action.type) {
    case 'open_feasibility':
      ctx.onOpenFeasibility?.();
      return true;
    case 'open_evidence':
      ctx.onOpenEvidence?.();
      return true;
    case 'run_route_and_run':
      ctx.onPrimaryCta?.();
      return true;
    case 'apply_relaxation': {
      const actionId = typeof payload.actionId === 'string' ? payload.actionId : undefined;
      if (actionId) ctx.onApplyRelaxation?.(actionId);
      else ctx.onPrimaryCta?.();
      return true;
    }
    case 'select_option': {
      const optionId = typeof payload.optionId === 'string' ? payload.optionId : undefined;
      if (optionId) ctx.onSelectOption?.(optionId);
      return Boolean(optionId);
    }
    case 'open_repair_plan': {
      const repairOptionId =
        typeof payload.repairOptionId === 'string'
          ? payload.repairOptionId
          : typeof payload.id === 'string'
            ? payload.id
            : undefined;
      if (repairOptionId) ctx.onOpenRepairPlan?.(repairOptionId);
      else ctx.onOpenFeasibility?.();
      return true;
    }
    case 'apply_split_plan': {
      const splitPlanId =
        typeof payload.splitPlanId === 'string' ? payload.splitPlanId : undefined;
      if (splitPlanId) ctx.onApplySplitPlan?.(splitPlanId);
      else ctx.onPrimaryCta?.();
      return true;
    }
    case 'view_split_alternatives':
      ctx.onViewSplitAlternatives?.();
      return Boolean(ctx.onViewSplitAlternatives);
    case 'discuss_with_nara':
      ctx.onDiscussWithNara?.(payload);
      return true;
    default:
      return false;
  }
}

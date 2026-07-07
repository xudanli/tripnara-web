import { toast } from 'sonner';
import {
  applyDecisionProblemToTrip,
  submitDecisionResolution,
} from '@/lib/decision-apply-action.util';
import type { DecisionQueueActionState } from '@/api/travel-status.types';
import type { DecisionAction } from '@/generated/unified-decision-contracts';

export type DecisionQueueActionKind = 'keepOriginal' | 'defer' | 'custom';

export interface ExecuteDecisionQueueActionInput {
  tripId: string;
  problemId: string;
  actionState: DecisionQueueActionState;
  /** 用于 toast 文案 */
  actionKind?: DecisionQueueActionKind;
}

export interface ExecuteDecisionQueueActionResult {
  submitted: boolean;
  applied: boolean;
}

function actionKindLabel(kind?: DecisionQueueActionKind): string {
  switch (kind) {
    case 'keepOriginal':
      return '已保留原计划';
    case 'defer':
      return '已稍后处理';
    default:
      return '操作已提交';
  }
}

/** 通过 Unified Decision API 执行队列 action（keepOriginal / defer 等） */
export async function executeDecisionQueueAction(
  input: ExecuteDecisionQueueActionInput,
): Promise<ExecuteDecisionQueueActionResult> {
  const { tripId, problemId, actionState, actionKind } = input;

  if (!actionState.enabled) {
    throw new Error('该操作当前不可用');
  }
  const actionId = actionState.actionId?.trim();
  if (!actionId) {
    throw new Error('缺少 actionId，请刷新页面后重试');
  }

  const action: DecisionAction = {
    actionId,
    label: actionId,
    allowed: true,
    blockedReason: null,
  };

  const submitResult = await submitDecisionResolution(
    { tripId, problemId, action },
    { silent: true },
  );

  if (!submitResult?.resolution?.resolutionId) {
    throw new Error('提交失败');
  }

  let applied = false;
  if (submitResult.nextStep === 'APPLY') {
    const applyResult = await applyDecisionProblemToTrip(tripId, problemId, { silent: true });
    applied = Boolean(applyResult);
  }

  toast.success(actionKindLabel(actionKind));
  return { submitted: true, applied };
}

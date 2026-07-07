import type { ApplyDecisionProblemResponse } from '@/types/unified-decision';

function readApplyResultMessage(result: ApplyDecisionProblemResponse): string | undefined {
  const raw = result.applyResult as { message?: string; status?: string } | undefined;
  return typeof raw?.message === 'string' && raw.message.trim() ? raw.message.trim() : undefined;
}

/** apply 响应是否表示写入被阻断（非成功终态） */
export function isApplyOutcomeBlocked(result: ApplyDecisionProblemResponse): boolean {
  const applyStatus = String(result.applyResult?.status ?? '').trim().toLowerCase();
  const resolutionStatus = String(result.resolution?.status ?? '').trim().toUpperCase();
  const executionStatus = String(result.problem?.executionStatus ?? '').trim().toUpperCase();

  if (applyStatus === 'blocked' || applyStatus === 'failed') return true;
  if (resolutionStatus === 'FAILED') return true;
  if (executionStatus === 'FAILED') return true;

  return false;
}

export function describeApplyOutcomeFailure(result: ApplyDecisionProblemResponse): string {
  return (
    readApplyResultMessage(result) ??
    (result.revalidation?.status === 'PENDING'
      ? '行程复核仍在进行，请稍后刷新查看'
      : '应用未能完成，请刷新后重试或联系支持')
  );
}

/** 是否可视为已成功写入行程 */
export function isApplyOutcomeSuccessful(result: ApplyDecisionProblemResponse): boolean {
  if (isApplyOutcomeBlocked(result)) return false;

  const executionStatus = String(result.problem?.executionStatus ?? '').trim().toUpperCase();
  if (executionStatus === 'APPLIED' || executionStatus === 'EXECUTED') return true;

  const applyStatus = String(result.applyResult?.status ?? '').trim().toLowerCase();
  if (applyStatus === 'applied' || applyStatus === 'success' || applyStatus === 'completed') {
    return true;
  }

  return false;
}

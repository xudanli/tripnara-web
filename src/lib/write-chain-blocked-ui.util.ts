import { toast } from 'sonner';
import {
  EffectivePlanWriteChainRequiredError,
  formatLegacyApplyBlockedMessage,
  isLegacyApplyBlockedError,
  parseWriteChainBlockedFromThrown,
  shouldBlockDirectEffectivePlanWrite,
} from '@/lib/effective-plan-write-chain.util';
import {
  buildPlanStudioDecisionProblemPath,
  buildPlanStudioDecisionSpacePath,
} from '@/lib/plan-studio-decision-navigation.util';

export function resolveWriteChainNavigationPath(tripId: string, problemId?: string): string {
  const id = problemId?.trim();
  return id
    ? buildPlanStudioDecisionProblemPath(tripId, id)
    : buildPlanStudioDecisionSpacePath(tripId);
}

function resolveWriteChainProblemId(err: unknown, fallbackProblemId?: string): string | undefined {
  if (err instanceof EffectivePlanWriteChainRequiredError && err.problemId?.trim()) {
    return err.problemId.trim();
  }
  return fallbackProblemId?.trim() || undefined;
}

/** 写链阻断：toast + 可选深链；返回 true 表示已处理（勿重试 legacy 路径） */
export function handleWriteChainBlockedError(
  err: unknown,
  options: {
    tripId: string;
    problemId?: string;
    navigate?: (path: string) => void;
  },
): boolean {
  if (!isLegacyApplyBlockedError(err)) return false;

  const parsed = parseWriteChainBlockedFromThrown(err);
  toast.error(formatLegacyApplyBlockedMessage(err), {
    description: parsed?.details?.caller ? `来源：${parsed.details.caller}` : undefined,
  });

  if (options.navigate) {
    options.navigate(
      resolveWriteChainNavigationPath(
        options.tripId,
        resolveWriteChainProblemId(err, options.problemId),
      ),
    );
  }

  return true;
}

/** 写链开启时 proactive 提示并深链；返回 true 表示已拦截 */
export function notifyDirectWriteBlocked(
  options: {
    tripId: string;
    problemId?: string;
    message?: string;
    navigate?: (path: string) => void;
  },
): boolean {
  if (!shouldBlockDirectEffectivePlanWrite()) return false;

  const err = new EffectivePlanWriteChainRequiredError(options.problemId, options.message);
  return handleWriteChainBlockedError(err, options);
}

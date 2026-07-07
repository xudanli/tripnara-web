import {
  DecisionSemanticsApiError,
  decisionProblemsApi,
} from '@/api/decision-problems';
import { getRepairOptions } from '@/api/feasibility-repair';
import type { DecisionOption } from '@/types/decision-problem';
import type { FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';
import {
  isHardDecisionEnforcement,
  readPrimaryEnforcement,
  resolveDecisionProblemId,
} from '@/lib/decision-problem-enforcement.util';
import { deriveDecisionSpaceContentFromDetail } from '@/lib/decision-space-detail-content.util';
import type { DecisionProblemEnforcement } from '@/types/decision-problem';

export { resolveDecisionProblemId } from '@/lib/decision-problem-enforcement.util';

export interface ConflictEnforcementResult {
  enforcement?: DecisionProblemEnforcement;
  isHard: boolean;
}

export async function fetchConflictEnforcement(
  decisionProblemId: string,
  tripId?: string,
): Promise<ConflictEnforcementResult> {
  try {
    const problem = tripId
      ? await decisionProblemsApi.getProblem(tripId, decisionProblemId)
      : await decisionProblemsApi.getById(decisionProblemId);
    const enforcement =
      readPrimaryEnforcement(problem) ??
      (problem as { primaryEnforcement?: string }).primaryEnforcement;
    return {
      enforcement,
      isHard: isHardDecisionEnforcement(enforcement),
    };
  } catch (err) {
    if (tripId && decisionProblemsApi.isNotImplemented(err)) {
      const legacy = await decisionProblemsApi.getById(decisionProblemId);
      const enforcement = readPrimaryEnforcement(legacy);
      return { enforcement, isHard: isHardDecisionEnforcement(enforcement) };
    }
    throw err;
  }
}

export interface ConstraintConflictClickInput {
  tripId?: string;
  decisionProblemId: string;
  runRepair?: (issueId: string) => Promise<void>;
  onOpenFeasibilityReport?: () => void;
  /** 新 BFF：打开 decision-problem 抽屉 */
  onOpenDecisionProblem?: (problemId: string) => void;
}

/** 约束 / 可行性卡片点击冲突：先读 decision-problem，再决定是否走 repair */
export async function handleConstraintConflictClick(
  input: ConstraintConflictClickInput,
): Promise<ConflictEnforcementResult> {
  const result = await fetchConflictEnforcement(input.decisionProblemId, input.tripId);

  if (input.onOpenDecisionProblem) {
    input.onOpenDecisionProblem(input.decisionProblemId);
    return result;
  }

  if (result.isHard && input.runRepair) {
    await input.runRepair(input.decisionProblemId);
  }

  input.onOpenFeasibilityReport?.();
  return result;
}

/** 优先 GET detail.actions；勿 GET .../options（重复全量 feasibility） */
export async function loadDecisionProblemOptions(input: {
  tripId: string;
  problemId: string;
  fallbackIssueId?: string;
}): Promise<{ source: 'decision-problems' | 'feasibility-repair'; options: DecisionOption[] | FeasibilityRepairOptionDto[] }> {
  const { tripId, problemId, fallbackIssueId } = input;
  try {
    const detail = await decisionProblemsApi.getProblem(tripId, problemId);
    const { options } = deriveDecisionSpaceContentFromDetail(detail);
    if (options.length) {
      return { source: 'decision-problems', options };
    }
    if (!fallbackIssueId) {
      return { source: 'decision-problems', options: [] };
    }
  } catch (err) {
    if (!decisionProblemsApi.isNotImplemented(err) && !(err instanceof DecisionSemanticsApiError)) {
      throw err;
    }
    if (!fallbackIssueId) {
      if (decisionProblemsApi.isNotImplemented(err)) throw err;
      return { source: 'decision-problems', options: [] };
    }
  }

  if (fallbackIssueId) {
    const res = await getRepairOptions(tripId, fallbackIssueId);
    return { source: 'feasibility-repair', options: res.options };
  }

  return { source: 'decision-problems', options: [] };
}

export function mapDecisionOptionsToRepairOptions(
  options: DecisionOption[],
): FeasibilityRepairOptionDto[] {
  return options.map((option) => ({
    id: option.id,
    label: option.label ?? option.id,
    description: option.description,
    metadata: {
      decisionOptionType: option.type,
      requiresConfirmation: option.requiresConfirmation,
      executable: option.executable,
      tradeoffs: option.tradeoffs,
      executionCapability: option.executionCapability,
      source: option.source,
    },
  }));
}

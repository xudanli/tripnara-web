import { isTripConflictsOption } from '@/dto/frontend-planning-decision-card.util';
import type { AttractionExploreCandidatesResponse } from '@/types/attraction-explore';
import {
  isArrangeProposalWriteResponse,
  type PlanProposal,
} from '@/types/arrange-itinerary';

/**
 * 是否需打开「确认编排变更」。
 * PASS + 无冲突 + 无 trip_conflicts 方案 + 至多 1 个 decision 方案 → 可静默写入。
 * （含「保持原计划」在内，只要 ≥2 个 option 仍需确认。）
 */
export function shouldConfirmArrangeProposal(proposal: PlanProposal): boolean {
  const { validation, decisionPack } = proposal;

  if (validation.status !== 'PASS') return true;
  if (validation.conflicts.length > 0) return true;

  const options = decisionPack?.options ?? [];
  if (options.length > 1) return true;
  if (options.some(isTripConflictsOption)) return true;

  return false;
}

export type SettleArrangeWriteOutcome<T> =
  | { status: 'needs_confirmation'; result: T }
  | { status: 'auto_applied'; candidates?: AttractionExploreCandidatesResponse }
  | { status: 'passthrough'; result: T };

/**
 * 写入类响应：无歧义草案则自动 apply，否则原样返回供确认弹窗。
 */
export async function settleArrangeWriteResult<T>(
  result: T,
  apply: (
    proposalId: string,
    contextVersion: number,
  ) => Promise<{ candidates?: AttractionExploreCandidatesResponse }>,
): Promise<SettleArrangeWriteOutcome<T>> {
  if (!isArrangeProposalWriteResponse(result)) {
    return { status: 'passthrough', result };
  }
  if (shouldConfirmArrangeProposal(result.proposal)) {
    return { status: 'needs_confirmation', result };
  }
  try {
    const applied = await apply(result.proposal.proposalId, result.proposal.contextVersion);
    return { status: 'auto_applied', candidates: applied.candidates };
  } catch {
    return { status: 'needs_confirmation', result };
  }
}

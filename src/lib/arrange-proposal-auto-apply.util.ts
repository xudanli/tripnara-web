import { isTripConflictsOption } from '@/dto/frontend-planning-decision-card.util';
import type { AttractionExploreCandidatesResponse } from '@/types/attraction-explore';
import {
  isArrangeProposalWriteResponse,
  type PlanProposal,
} from '@/types/arrange-itinerary';

/**
 * 是否需打开「确认编排变更」。
 * PASS + 无冲突 + 无 trip_conflicts 方案 + 至多 1 个 decision 方案 → 可静默写入。
 * PLACE_CANDIDATE：用户已在排入弹窗选定日期时段时，无硬冲突则静默写入
 * （即便后端附带「保持原计划」备选也不再二次确认）。
 */
export function shouldConfirmArrangeProposal(proposal: PlanProposal): boolean {
  const { validation, decisionPack, intent } = proposal;

  if (validation.status === 'BLOCK') return true;
  if (validation.conflicts.length > 0) return true;

  const options = decisionPack?.options ?? [];
  if (options.some(isTripConflictsOption)) return true;

  /**
   * OR-Tools Planning Shadow：有观测附件时必须打开确认草案，
   * 否则静默 apply 会导致旁路对比面板永不展示。
   */
  if (proposal.ortoolsShadow != null) return true;

  if (intent === 'PLACE_CANDIDATE') {
    // WARN（如住宿未齐）不阻断排入；有硬冲突时上面已 return true
    return false;
  }

  if (validation.status !== 'PASS') return true;
  if (options.length > 1) return true;

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

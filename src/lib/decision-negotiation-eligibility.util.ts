import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';
import { canStartDecisionSpaceCollaboration } from '@/lib/decision-space-collaboration.util';

const POI_ACCESS_EXECUTION_ISSUE_KINDS = new Set([
  'poi_access_reservation_required',
  'poi_access_blocked',
]);

function readIssueKind(
  conflict?: PlanningConflictItem | null,
  problem?: DecisionProblemSummary | null,
  detail?: GatewayDecisionProblemDetailResult | null,
): string | undefined {
  return (
    conflict?.issue?.issueKind ??
    (typeof detail?.semanticKey === 'string' ? detail.semanticKey : undefined) ??
    problem?.semanticKey ??
    problem?.instanceKey
  );
}

/**
 * 镜像后端 isDecisionProblemNegotiationEligible（preflight 未接入前的 FE 护栏）。
 * 预约 / POI ACCESS 硬约束为执行型任务，不走结构化协商或团队投票。
 */
export function isDecisionProblemNegotiationEligible(input: {
  problem?: DecisionProblemSummary | null;
  conflict?: PlanningConflictItem | null;
  detail?: GatewayDecisionProblemDetailResult | null;
}): boolean {
  const issueKind = readIssueKind(input.conflict, input.problem, input.detail);
  if (issueKind) {
    if (POI_ACCESS_EXECUTION_ISSUE_KINDS.has(issueKind)) return false;
    if (issueKind.startsWith('poi_access_')) return false;
  }

  const semantic = `${input.problem?.semanticKey ?? ''} ${input.problem?.instanceKey ?? ''}`.toLowerCase();
  if (semantic.includes('poi_access') || semantic.includes('reservation')) return false;

  if (input.problem?.type === 'PREFERENCE_CONFLICT') return true;

  const executionMode = input.detail?.authority?.executionMode;
  if (
    executionMode &&
    executionMode !== 'MULTI_PARTY_APPROVAL' &&
    input.problem?.type === 'INFEASIBILITY'
  ) {
    const combined = `${input.problem.title ?? ''} ${input.conflict?.title ?? ''} ${input.conflict?.message ?? ''}`;
    if (/预订|预约|official|blue lagoon|poi.access/i.test(combined)) return false;
  }

  return true;
}

/**
 * 协商/投票可见性（优先 BFF negotiation.visible + preflight.canStart）。
 * 客户端 heuristic 仅在后端未投影 visible 时兜底。
 */
export function shouldShowDecisionSpaceCollaborationActions(input: {
  travelerCount: number;
  collaboratorCount: number;
  problem?: DecisionProblemSummary | null;
  conflict?: PlanningConflictItem | null;
  detail?: GatewayDecisionProblemDetailResult | null;
  /** detail.negotiation.visible — BFF SSOT */
  negotiationVisible?: boolean;
  preflightCanStart?: boolean;
}): { showNegotiate: boolean; showVote: boolean } {
  if (input.negotiationVisible === false) {
    return { showNegotiate: false, showVote: false };
  }

  if (
    !canStartDecisionSpaceCollaboration({
      travelerCount: input.travelerCount,
      collaboratorCount: input.collaboratorCount,
    })
  ) {
    return { showNegotiate: false, showVote: false };
  }

  if (input.preflightCanStart === false) {
    return { showNegotiate: false, showVote: false };
  }

  if (input.negotiationVisible !== true && !isDecisionProblemNegotiationEligible(input)) {
    return { showNegotiate: false, showVote: false };
  }

  return { showNegotiate: true, showVote: true };
}

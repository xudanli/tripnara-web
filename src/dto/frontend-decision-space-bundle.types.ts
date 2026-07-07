import type { PlanningDecisionPack } from '@/dto/frontend-planning-decision-pack.types';
import type { PlanningDecisionBasis } from '@/dto/frontend-planning-decision-basis.types';
import type { PlanningDecisionInspector } from '@/dto/frontend-planning-decision-inspector.types';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';

export type DecisionSpaceBundleSurface =
  | 'default'
  | 'middle'
  | 'inspector'
  | 'full'
  | (string & {});

export type DecisionSpaceBundleIncludeField =
  | 'problem'
  | 'basis'
  | 'pack'
  | 'pack.summary'
  | 'inspector.causalChain'
  | 'inspector.planDiff'
  | 'inspector.feasibility'
  | 'inspector.memberConsensus'
  | 'inspector.basis'
  | 'negotiation'
  | 'orchestration'
  | (string & {});

export type DecisionSpaceBundleBindingMode = 'problem' | 'proposal' | 'problem+proposal' | (string & {});

export interface DecisionSpaceBundleBinding {
  mode?: DecisionSpaceBundleBindingMode;
  problemId?: string | null;
  proposalId?: string | null;
  conflictId?: string | null;
  optionId?: string | null;
}

export interface DecisionSpaceBundleOrchestration {
  activeProposalId?: string | null;
  pendingProposalCount?: number;
  phase?: string | null;
}

export interface DecisionSpaceBundleDeferredReason {
  previewRequired?: boolean;
  [key: string]: unknown;
}

export interface DecisionSpaceBundleRefreshHints {
  problem?: string;
  preview?: string;
  inspector?: string;
  causalChain?: string;
  [key: string]: string | undefined;
}

export interface DecisionSpaceBundleMeta {
  included?: string[];
  deferred?: string[];
  tabEmptyState?: Record<string, boolean>;
  deferredReason?: DecisionSpaceBundleDeferredReason;
  refreshHints?: DecisionSpaceBundleRefreshHints;
}

/** tripnara.decision_space_bundle@v1 */
export interface DecisionSpaceBundle {
  schema: 'tripnara.decision_space_bundle@v1' | (string & {});
  tripId: string;
  tripVersion?: string;
  etag?: string;
  binding: DecisionSpaceBundleBinding;
  problem?: GatewayDecisionProblemDetailResult;
  basis?: PlanningDecisionBasis;
  pack?: PlanningDecisionPack;
  inspector?: PlanningDecisionInspector;
  negotiation?: unknown;
  orchestration?: DecisionSpaceBundleOrchestration;
  meta?: DecisionSpaceBundleMeta;
}

export interface DecisionSpaceBundleFetchParams {
  problemId?: string | null;
  proposalId?: string | null;
  conflictId?: string | null;
  focusConflictId?: string | null;
  optionId?: string | null;
  surface?: DecisionSpaceBundleSurface;
  include?: DecisionSpaceBundleIncludeField[] | string;
  exclude?: DecisionSpaceBundleIncludeField[] | string;
}

export type DecisionSpaceBundleFetchResult =
  | { status: 'ok'; data: DecisionSpaceBundle; etag?: string | null }
  | { status: 'not_modified'; etag?: string | null };

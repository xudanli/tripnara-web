/** PRD 3.12 §5.2 · Active Trip Dashboard 聚合 API */

import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';

export type ActiveTripDashboardVersion = 'active_trip_dashboard_v1';

export type ActiveTripViewerRole = 'captain' | 'member';

export type ActiveTripAwaitingViewerAction =
  | 'none'
  | 'confirm_rollback_proposal'
  | 'complete_assigned_task'
  | 'authorize_vault_milestone';

export type ContextualCardPriority = 'critical' | 'high' | 'normal';

export type ActiveTripContextualCard = {
  cardId: string;
  titleZh: string;
  descriptionZh: string;
  toolRoute: string | null;
  vaultLinked: boolean;
  priority: ContextualCardPriority;
};

export type ActiveTripCrewMember = {
  userId: string;
  role: ActiveTripViewerRole;
  displayName: string;
  mbtiType: string | null;
  cardTitle: string | null;
  reputationStars: number | null;
};

export type RouteRollbackProposalStatus =
  | 'pending_member_confirm'
  | 'approved'
  | 'rejected';

export type RouteRollbackProposal = {
  proposalId: string;
  proposedByUserId: string;
  proposedByDisplayName?: string;
  reasonZh: string;
  status: RouteRollbackProposalStatus;
  createdAt: string;
};

export type RouteContractVaultStatus = 'locked' | 'pending_vault';

export type ActiveTripRouteContractLock = {
  locked: boolean;
  milestones: Array<{
    id: string;
    labelZh: string;
    vaultStatus: RouteContractVaultStatus;
  }>;
  canCaptainRollbackMilestoneOrder: boolean;
  /** Phase 3 · 当前 viewer 是否可签署 Vault 里程碑 */
  viewerCanAuthorize: boolean;
};

export type ActiveTripTaskSummary = {
  total: number;
  pending: number;
  confirmed: number;
  assignedToViewer: number;
};

export type ActiveTripMatchSquareBinding = {
  recruitmentPostId: string;
  strategy: string;
  catalogId: string | null;
  vibeChipIds: string[];
  contextualCardIds: string[];
  sealedAt: string | null;
};

/** GET /api/trips/:tripId/active */
export type ActiveTripDashboard = {
  version: ActiveTripDashboardVersion;
  trip: {
    tripId: string;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  viewer: {
    userId: string;
    role: ActiveTripViewerRole;
    canProposeRollback: boolean;
    awaitingViewerAction: ActiveTripAwaitingViewerAction;
  };
  matchSquare: ActiveTripMatchSquareBinding | null;
  contextualCards: ActiveTripContextualCard[];
  crewDnaPanel: ActiveTripCrewMember[];
  collaborativeTasks: CollaborativeTaskView[];
  taskSummary: ActiveTripTaskSummary;
  pendingRollback: RouteRollbackProposal | null;
  routeContractLock: ActiveTripRouteContractLock | null;
  apiPaths: {
    collaborativeTasks: string;
    decisionEvents: string;
    routeContractLock: string;
    decisionReplay: string;
    templateBackflowPreview: string;
    templateBackflowCommit: string;
  };
};

export type TripDecisionEventRequest =
  | { action: 'propose_rollback'; reasonZh: string }
  | { action: 'confirm_rollback'; proposalId: string }
  | { action: 'reject_rollback'; proposalId: string }
  | {
      type: 'route_rollback';
      action: 'propose';
      planBRef: string;
      milestoneId?: string;
      reasonZh?: string;
    }
  | {
      type: 'route_rollback';
      action: 'confirm' | 'protest';
      proposalId?: string;
    };

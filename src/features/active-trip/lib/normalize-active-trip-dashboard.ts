import type {
  ActiveTripAwaitingViewerAction,
  ActiveTripContextualCard,
  ActiveTripDashboard,
  ActiveTripCrewMember,
  ActiveTripRouteContractLock,
  ActiveTripTaskSummary,
  ContextualCardPriority,
  RouteRollbackProposal,
} from '@/types/active-trip-dashboard';
import type { CollaborativeTaskView, CollaborativeTaskStatus } from '@/types/collaborative-task-flywheel';
import { buildRouteContractLockPlan } from '@/features/match-square/lib/route-contract-vault';
import { getStoredCollaborativeTaskFlywheel } from '@/features/match-square/lib/decision-engine/collaborative-task-flywheel-mock';
import {
  getActiveTripInstantiateContext,
  getPendingRollbackProposal,
  resolveCurrentUserId,
} from './active-trip-context-store';
import {
  getAuthorizedVaultMilestones,
  getVaultMilestoneOrder,
} from './vault-authorization-store';

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNullableString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function normalizePriority(raw: unknown): ContextualCardPriority {
  const p = String(raw ?? 'normal');
  if (p === 'critical' || p === 'high') return p;
  return 'normal';
}

function normalizeContextualCard(raw: unknown): ActiveTripContextualCard | null {
  const r = asRecord(raw);
  if (!r) return null;
  const cardId = asString(r.cardId ?? r.card_id ?? r.id);
  if (!cardId) return null;
  return {
    cardId,
    titleZh: asString(r.titleZh ?? r.title_zh ?? r.title, cardId),
    descriptionZh: asString(r.descriptionZh ?? r.description_zh ?? r.description),
    toolRoute: asNullableString(r.toolRoute ?? r.tool_route),
    vaultLinked: r.vaultLinked === true || r.vault_linked === true,
    priority: normalizePriority(r.priority),
  };
}

function normalizeCrewMember(raw: unknown): ActiveTripCrewMember | null {
  const r = asRecord(raw);
  if (!r) return null;
  const userId = asString(r.userId ?? r.user_id);
  if (!userId) return null;
  const roleRaw = asString(r.role);
  return {
    userId,
    role: roleRaw === 'captain' ? 'captain' : 'member',
    displayName: asString(r.displayName ?? r.display_name, '旅伴'),
    mbtiType: asNullableString(r.mbtiType ?? r.mbti_type),
    cardTitle: asNullableString(r.cardTitle ?? r.card_title),
    reputationStars:
      typeof r.reputationStars === 'number'
        ? r.reputationStars
        : typeof r.reputation_stars === 'number'
          ? r.reputation_stars
          : null,
  };
}

function normalizeRollback(raw: unknown): RouteRollbackProposal | null {
  const r = asRecord(raw);
  if (!r) return null;
  const proposalId = asString(r.proposalId ?? r.proposal_id ?? r.id);
  if (!proposalId) return null;
  const statusRaw = asString(r.status);
  const status =
    statusRaw === 'approved' || statusRaw === 'rejected'
      ? statusRaw
      : 'pending_member_confirm';
  return {
    proposalId,
    proposedByUserId: asString(r.proposedByUserId ?? r.proposed_by_user_id),
    proposedByDisplayName: asNullableString(
      r.proposedByDisplayName ?? r.proposed_by_display_name
    ) ?? undefined,
    reasonZh: asString(r.reasonZh ?? r.reason_zh ?? r.reason),
    status,
    createdAt: asString(r.createdAt ?? r.created_at, new Date().toISOString()),
  };
}

function normalizeRouteContractLock(raw: unknown): ActiveTripRouteContractLock | null {
  const r = asRecord(raw);
  if (!r) return null;
  const milestonesRaw = r.milestones;
  const milestones = Array.isArray(milestonesRaw)
    ? milestonesRaw
        .map((m) => {
          const item = asRecord(m);
          if (!item) return null;
          const id = asString(item.id);
          if (!id) return null;
          const vaultRaw = asString(item.vaultStatus ?? item.vault_status);
          return {
            id,
            labelZh: asString(item.labelZh ?? item.label_zh ?? item.label),
            vaultStatus: vaultRaw === 'locked' ? ('locked' as const) : ('pending_vault' as const),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : [];
  return {
    locked: r.locked === true,
    milestones,
    canCaptainRollbackMilestoneOrder:
      r.canCaptainRollbackMilestoneOrder === true ||
      r.can_captain_rollback_milestone_order === true,
    viewerCanAuthorize:
      r.viewerCanAuthorize === true || r.viewer_can_authorize === true,
  };
}

function normalizeCollaborativeTasksFromDashboard(raw: unknown): CollaborativeTaskView[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const r = asRecord(item);
      if (!r) return null;
      const id = asString(r.id ?? r.taskId);
      const templateId = asString(r.templateId ?? r.template_id);
      if (!id && !templateId) return null;
      const statusRaw = asString(r.status ?? 'pending');
      const status: CollaborativeTaskStatus =
        statusRaw === 'confirmed' || statusRaw === 'rolled_back' || statusRaw === 'timed_out'
          ? statusRaw
          : 'pending';
      const task: CollaborativeTaskView = {
        id: id || `ctask-${templateId}`,
        templateId,
        title: asString(r.title, templateId),
        description: typeof r.description === 'string' ? r.description : undefined,
        assigneeUserId:
          typeof r.assigneeUserId === 'string'
            ? r.assigneeUserId
            : typeof r.assignee_user_id === 'string'
              ? r.assignee_user_id
              : null,
        assigneeLabel:
          typeof r.assigneeLabel === 'string'
            ? r.assigneeLabel
            : typeof r.assignee_label === 'string'
              ? r.assignee_label
              : null,
        status,
        milestoneId:
          typeof r.milestoneId === 'string'
            ? r.milestoneId
            : typeof r.milestone_id === 'string'
              ? r.milestone_id
              : null,
        behaviorLog: [],
      };
      return task;
    })
    .filter((x): x is CollaborativeTaskView => x != null);
}

function normalizeTaskSummary(raw: unknown, tasks: CollaborativeTaskView[]): ActiveTripTaskSummary {
  const r = asRecord(raw);
  if (r) {
    return {
      total: typeof r.total === 'number' ? r.total : tasks.length,
      pending:
        typeof r.pending === 'number'
          ? r.pending
          : tasks.filter((t) => t.status === 'pending').length,
      confirmed:
        typeof r.confirmed === 'number'
          ? r.confirmed
          : tasks.filter((t) => t.status === 'confirmed').length,
      assignedToViewer:
        typeof r.assignedToViewer === 'number'
          ? r.assignedToViewer
          : typeof r.assigned_to_viewer === 'number'
            ? r.assigned_to_viewer
            : 0,
    };
  }
  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    confirmed: tasks.filter((t) => t.status === 'confirmed').length,
    assignedToViewer: 0,
  };
}

function normalizeAwaitingAction(raw: unknown): ActiveTripAwaitingViewerAction {
  const v = String(raw ?? 'none');
  if (
    v === 'confirm_rollback_proposal' ||
    v === 'complete_assigned_task' ||
    v === 'authorize_vault_milestone'
  ) {
    return v;
  }
  return 'none';
}

export function normalizeActiveTripDashboard(raw: unknown, tripId: string): ActiveTripDashboard | null {
  const r = asRecord(raw);
  if (!r) return null;

  const tripRaw = asRecord(r.trip) ?? r;
  const resolvedTripId = asString(tripRaw.tripId ?? tripRaw.trip_id ?? tripRaw.id, tripId);

  const collaborativeTasks = normalizeCollaborativeTasksFromDashboard(
    r.collaborativeTasks ?? r.collaborative_tasks
  );

  const viewerRaw = asRecord(r.viewer);
  const viewerUserId = asString(viewerRaw?.userId ?? viewerRaw?.user_id, resolveCurrentUserId());
  const viewerRole = asString(viewerRaw?.role) === 'captain' ? 'captain' : 'member';

  const matchSquareRaw = asRecord(r.matchSquare ?? r.match_square);
  const matchSquare = matchSquareRaw
    ? {
        recruitmentPostId: asString(
          matchSquareRaw.recruitmentPostId ?? matchSquareRaw.recruitment_post_id
        ),
        strategy: asString(matchSquareRaw.strategy),
        catalogId: asNullableString(matchSquareRaw.catalogId ?? matchSquareRaw.catalog_id),
        vibeChipIds: (() => {
          const raw = matchSquareRaw.vibeChipIds ?? matchSquareRaw.vibe_chip_ids;
          return Array.isArray(raw) ? raw.map((x: unknown) => String(x)) : [];
        })(),
        contextualCardIds: (() => {
          const raw = matchSquareRaw.contextualCardIds ?? matchSquareRaw.contextual_card_ids;
          return Array.isArray(raw) ? raw.map((x: unknown) => String(x)) : [];
        })(),
        sealedAt: asNullableString(matchSquareRaw.sealedAt ?? matchSquareRaw.sealed_at),
      }
    : null;

  const cardsRaw = r.contextualCards ?? r.contextual_cards;
  const contextualCards = Array.isArray(cardsRaw)
    ? cardsRaw.map(normalizeContextualCard).filter((x): x is ActiveTripContextualCard => x != null)
    : [];

  const crewRaw = r.crewDnaPanel ?? r.crew_dna_panel;
  const crewDnaPanel = Array.isArray(crewRaw)
    ? crewRaw.map(normalizeCrewMember).filter((x): x is ActiveTripCrewMember => x != null)
    : [];

  const taskSummary = normalizeTaskSummary(r.taskSummary ?? r.task_summary, collaborativeTasks);

  const apiPathsRaw = asRecord(r.apiPaths ?? r.api_paths);
  const base = `/api/trips/${resolvedTripId}`;

  return {
    version: 'active_trip_dashboard_v1',
    trip: {
      tripId: resolvedTripId,
      name: asString(tripRaw.name, 'Active Trip'),
      destination: asString(tripRaw.destination),
      startDate: asString(tripRaw.startDate ?? tripRaw.start_date),
      endDate: asString(tripRaw.endDate ?? tripRaw.end_date),
      status: asString(tripRaw.status, 'IN_PROGRESS'),
    },
    viewer: {
      userId: viewerUserId,
      role: viewerRole,
      canProposeRollback:
        viewerRaw?.canProposeRollback === true || viewerRaw?.can_propose_rollback === true,
      awaitingViewerAction: normalizeAwaitingAction(
        viewerRaw?.awaitingViewerAction ?? viewerRaw?.awaiting_viewer_action
      ),
    },
    matchSquare,
    contextualCards,
    crewDnaPanel,
    collaborativeTasks,
    taskSummary,
    pendingRollback: normalizeRollback(r.pendingRollback ?? r.pending_rollback),
    routeContractLock: normalizeRouteContractLock(
      r.routeContractLock ?? r.route_contract_lock
    ),
    apiPaths: {
      collaborativeTasks: asString(
        apiPathsRaw?.collaborativeTasks ?? apiPathsRaw?.collaborative_tasks,
        `${base}/collaborative-tasks`
      ),
      decisionEvents: asString(
        apiPathsRaw?.decisionEvents ?? apiPathsRaw?.decision_events,
        `${base}/decision-events`
      ),
      routeContractLock: asString(
        apiPathsRaw?.routeContractLock ?? apiPathsRaw?.route_contract_lock,
        `${base}/route-contract-lock`
      ),
      decisionReplay: asString(
        apiPathsRaw?.decisionReplay ?? apiPathsRaw?.decision_replay,
        `${base}/decision-replay`
      ),
      templateBackflowPreview: asString(
        apiPathsRaw?.templateBackflowPreview ?? apiPathsRaw?.template_backflow_preview,
        `${base}/template-backflow/preview`
      ),
      templateBackflowCommit: asString(
        apiPathsRaw?.templateBackflowCommit ?? apiPathsRaw?.template_backflow_commit,
        `${base}/template-backflow/commit`
      ),
    },
  };
}

function buildContextualCards(
  cardIds: string[],
  post: import('@/types/match-square').RecruitmentPostCard
): ActiveTripContextualCard[] {
  const chips = post.vibeLlm?.chips ?? [];
  const chipMap = new Map(chips.map((c) => [c.id, c]));

  return cardIds.map((cardId, index) => {
    const chip = chipMap.get(cardId);
    const vaultLinked = /vault|涉水|ford|hut|营地/i.test(cardId + (chip?.label ?? ''));
    return {
      cardId,
      titleZh: chip?.label ?? cardId.replace(/_/g, ' '),
      descriptionZh: '情境工具入口 · 行中按需打开',
      toolRoute: vaultLinked && post.routeTemplateCatalogId
        ? `/dashboard/route-directions/templates/${post.routeTemplateCatalogId}`
        : null,
      vaultLinked,
      priority: index === 0 ? 'critical' : index < 3 ? 'high' : 'normal',
    };
  });
}

function buildTaskSummary(tasks: CollaborativeTaskView[], viewerUserId: string): ActiveTripTaskSummary {
  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    confirmed: tasks.filter((t) => t.status === 'confirmed').length,
    assignedToViewer: tasks.filter(
      (t) => t.status === 'pending' && t.assigneeUserId === viewerUserId
    ).length,
  };
}

function resolveAwaitingAction(
  pendingRollback: RouteRollbackProposal | null,
  tasks: CollaborativeTaskView[],
  viewerUserId: string,
  viewerRole: 'captain' | 'member',
  routeContractLock: ActiveTripRouteContractLock | null
): ActiveTripAwaitingViewerAction {
  if (
    routeContractLock?.viewerCanAuthorize &&
    routeContractLock.milestones.some((m) => m.vaultStatus === 'pending_vault')
  ) {
    return 'authorize_vault_milestone';
  }
  if (
    pendingRollback?.status === 'pending_member_confirm' &&
    viewerRole === 'member'
  ) {
    return 'confirm_rollback_proposal';
  }
  const hasAssignedPending = tasks.some(
    (t) => t.status === 'pending' && t.assigneeUserId === viewerUserId
  );
  if (hasAssignedPending) return 'complete_assigned_task';
  return 'none';
}

function buildRouteContractLockState(
  tripId: string,
  post: import('@/types/match-square').RecruitmentPostCard,
  viewerRole: 'captain' | 'member'
): ActiveTripRouteContractLock | null {
  if (!post.routeTemplateCatalogId) return null;

  const plan = buildRouteContractLockPlan(
    post.routeTemplateCatalogId,
    post.planningStyle ?? post.teamworkStyle ?? 'co_planning'
  );
  if (!plan) return null;

  const authorized = new Set(getAuthorizedVaultMilestones(tripId));
  const customOrder = getVaultMilestoneOrder(tripId);
  const baseMilestones = plan.milestones.map((m) => ({
    id: m.id,
    labelZh: m.label,
    vaultStatus: authorized.has(m.id)
      ? ('locked' as const)
      : ('pending_vault' as const),
  }));

  let milestones = baseMilestones;
  if (customOrder?.length) {
    const byId = new Map(baseMilestones.map((m) => [m.id, m]));
    milestones = customOrder.map((id) => byId.get(id)).filter(Boolean) as typeof baseMilestones;
    for (const m of baseMilestones) {
      if (!milestones.some((x) => x.id === m.id)) milestones.push(m);
    }
  }

  const allLocked = milestones.every((m) => m.vaultStatus === 'locked');
  const hasPending = milestones.some((m) => m.vaultStatus === 'pending_vault');

  return {
    locked: allLocked,
    canCaptainRollbackMilestoneOrder: plan.captainCanRollback,
    viewerCanAuthorize: viewerRole === 'member' && hasPending,
    milestones,
  };
}

/** Mock / 客户端兜底 · 从 instantiate 上下文 + flywheel 构建 */
export function buildActiveTripDashboardMock(tripId: string): ActiveTripDashboard | null {
  const ctx = getActiveTripInstantiateContext(tripId);
  const flywheel = getStoredCollaborativeTaskFlywheel(tripId);
  if (!ctx && !flywheel) return null;

  const post = ctx?.postSnapshot;
  const viewerUserId = resolveCurrentUserId();
  const viewerRole =
    post && post.captainUserId === viewerUserId ? ('captain' as const) : ('member' as const);

  const tasks = flywheel?.tasks ?? [];
  const pendingRollback = getPendingRollbackProposal(tripId);

  const cardIds =
    ctx?.plan.contextualCardIds ??
    post?.vibeLlm?.chips?.map((c) => c.id) ??
    [];

  const vibeChipIds = post?.vibeLlm?.chips?.map((c) => c.id) ?? [];

  const crewDnaPanel: ActiveTripCrewMember[] = post
    ? [
        {
          userId: post.captainUserId,
          role: 'captain',
          displayName: post.captainDisplayName ?? '队长',
          mbtiType: post.captainMbtiType,
          cardTitle: post.captainCardTitle,
          reputationStars: post.captainReputationStars ?? null,
        },
        ...(ctx?.approvedApplications ?? []).map((app) => ({
          userId: app.applicantUserId,
          role: 'member' as const,
          displayName: app.applicantDisplayName,
          mbtiType: app.applicantMbtiType,
          cardTitle: app.applicantCardTitle,
          reputationStars: app.applicantReputationStars,
        })),
      ]
    : [];

  let routeContractLock: ActiveTripRouteContractLock | null = null;
  if (post) {
    routeContractLock = buildRouteContractLockState(tripId, post, viewerRole);
  }

  const taskSummary = buildTaskSummary(tasks, viewerUserId);
  const awaitingViewerAction = resolveAwaitingAction(
    pendingRollback,
    tasks,
    viewerUserId,
    viewerRole,
    routeContractLock
  );

  const canProposeRollback =
    viewerRole === 'captain' &&
    Boolean(routeContractLock?.canCaptainRollbackMilestoneOrder) &&
    !pendingRollback;

  return {
    version: 'active_trip_dashboard_v1',
    trip: {
      tripId,
      name: post ? `${post.destination} · Active Trip` : 'Active Trip',
      destination: post?.destination ?? '',
      startDate: post?.startDate ?? '',
      endDate: post?.endDate ?? '',
      status: 'IN_PROGRESS',
    },
    viewer: {
      userId: viewerUserId,
      role: viewerRole,
      canProposeRollback,
      awaitingViewerAction,
    },
    matchSquare: post
      ? {
          recruitmentPostId: post.id,
          strategy: ctx?.plan.strategy ?? 'generic_plaza_trip',
          catalogId: post.routeTemplateCatalogId ?? null,
          vibeChipIds,
          contextualCardIds: cardIds,
          sealedAt: ctx?.instantiatedAt ?? flywheel?.dispatchedAt ?? null,
        }
      : null,
    contextualCards: post ? buildContextualCards(cardIds, post) : [],
    crewDnaPanel,
    collaborativeTasks: tasks,
    taskSummary,
    pendingRollback,
    routeContractLock,
    apiPaths: {
      collaborativeTasks: `/api/trips/${tripId}/collaborative-tasks`,
      decisionEvents: `/api/trips/${tripId}/decision-events`,
      routeContractLock: `/api/trips/${tripId}/route-contract-lock`,
      decisionReplay: `/api/trips/${tripId}/decision-replay`,
      templateBackflowPreview: `/api/trips/${tripId}/template-backflow/preview`,
      templateBackflowCommit: `/api/trips/${tripId}/template-backflow/commit`,
    },
  };
}

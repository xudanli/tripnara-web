import type {
  CollaborativeTaskBehaviorLogEntry,
  CollaborativeTaskEventAction,
  CollaborativeTaskFlywheelMetadata,
  CollaborativeTaskStatus,
  CollaborativeTaskView,
  PreMatchDecisionBrief,
} from '@/types/collaborative-task-flywheel';

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function normalizeStatus(raw: unknown): CollaborativeTaskStatus {
  const s = String(raw ?? 'pending');
  if (s === 'confirmed' || s === 'rolled_back' || s === 'timed_out') return s;
  return 'pending';
}

function normalizeBehaviorLog(raw: unknown): CollaborativeTaskBehaviorLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const r = asRecord(entry);
      if (!r) return null;
      const action = r.action;
      if (action !== 'confirm' && action !== 'rollback' && action !== 'ack_timeout') return null;
      const logEntry: CollaborativeTaskBehaviorLogEntry = {
        action,
        at: asString(r.at ?? r.timestamp, new Date().toISOString()),
        actorUserId: typeof r.actorUserId === 'string' ? r.actorUserId : undefined,
      };
      return logEntry;
    })
    .filter((x): x is CollaborativeTaskBehaviorLogEntry => x != null);
}

export function normalizeCollaborativeTaskView(raw: unknown): CollaborativeTaskView | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = asString(r.id ?? r.taskId ?? r.task_id);
  const templateId = asString(r.templateId ?? r.template_id);
  if (!id && !templateId) return null;

  return {
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
    status: normalizeStatus(r.status),
    milestoneId:
      typeof r.milestoneId === 'string'
        ? r.milestoneId
        : typeof r.milestone_id === 'string'
          ? r.milestone_id
          : null,
    resolutionId:
      typeof r.resolutionId === 'string'
        ? r.resolutionId
        : typeof r.resolution_id === 'string'
          ? r.resolution_id
          : undefined,
    actionPlanId:
      typeof r.actionPlanId === 'string'
        ? r.actionPlanId
        : typeof r.action_plan_id === 'string'
          ? r.action_plan_id
          : undefined,
    decisionProblemId:
      typeof r.decisionProblemId === 'string'
        ? r.decisionProblemId
        : typeof r.decision_problem_id === 'string'
          ? r.decision_problem_id
          : typeof r.problemId === 'string'
            ? r.problemId
            : undefined,
    isSubTask: r.isSubTask === true || r.is_sub_task === true,
    source:
      typeof r.source === 'string'
        ? r.source
        : typeof r.taskSource === 'string'
          ? r.taskSource
          : typeof r.task_source === 'string'
            ? r.task_source
            : undefined,
    problemTitle:
      typeof r.problemTitle === 'string'
        ? r.problemTitle
        : typeof r.problem_title === 'string'
          ? r.problem_title
          : null,
    subTaskKind:
      typeof r.subTaskKind === 'string'
        ? r.subTaskKind
        : typeof r.sub_task_kind === 'string'
          ? r.sub_task_kind
          : null,
    subTaskStatus:
      typeof r.subTaskStatus === 'string'
        ? r.subTaskStatus
        : typeof r.sub_task_status === 'string'
          ? r.sub_task_status
          : null,
    behaviorLog: normalizeBehaviorLog(r.behaviorLog ?? r.behavior_log),
  };
}

export function normalizePreMatchDecisionBrief(raw: unknown): PreMatchDecisionBrief | null {
  const r = asRecord(raw);
  if (!r) return null;

  const narrativeLine = asString(r.narrativeLine ?? r.narrative_line);
  if (!narrativeLine) return null;

  const driversRaw = r.noiseDrivers ?? r.noise_drivers;
  const noiseDrivers = Array.isArray(driversRaw)
    ? driversRaw
        .map((d) => {
          const item = asRecord(d);
          if (!item) return null;
          return {
            milestoneId: typeof item.milestoneId === 'string' ? item.milestoneId : undefined,
            label: asString(item.label),
            factor: asString(item.factor),
          };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x?.label))
    : [];

  const mitigatingRaw = r.mitigatingTaskTemplateIds ?? r.mitigating_task_template_ids;
  const mitigatingTaskTemplateIds = Array.isArray(mitigatingRaw)
    ? mitigatingRaw.filter((x): x is string => typeof x === 'string')
    : [];

  return {
    hardMetricsPass: r.hardMetricsPass !== false && r.hard_metrics_pass !== false,
    inTripCollaborationNoisePercent:
      typeof r.inTripCollaborationNoisePercent === 'number'
        ? r.inTripCollaborationNoisePercent
        : typeof r.in_trip_collaboration_noise_percent === 'number'
          ? r.in_trip_collaboration_noise_percent
          : 0,
    noiseDrivers,
    suggestedSceneRoleAnchor:
      typeof r.suggestedSceneRoleAnchor === 'string'
        ? r.suggestedSceneRoleAnchor
        : typeof r.suggested_scene_role_anchor === 'string'
          ? r.suggested_scene_role_anchor
          : null,
    suggestedSceneRoleLabel:
      typeof r.suggestedSceneRoleLabel === 'string'
        ? r.suggestedSceneRoleLabel
        : typeof r.suggested_scene_role_label === 'string'
          ? r.suggested_scene_role_label
          : null,
    mitigatingTaskTemplateIds,
    narrativeLine,
  };
}

export function normalizeCollaborativeTaskFlywheel(
  raw: unknown
): CollaborativeTaskFlywheelMetadata | null {
  const r = asRecord(raw);
  if (!r) return null;

  const tasksRaw = r.tasks;
  const tasks = Array.isArray(tasksRaw)
    ? tasksRaw.map(normalizeCollaborativeTaskView).filter((x): x is CollaborativeTaskView => x != null)
    : [];

  const recruitmentPostId = asString(r.recruitmentPostId ?? r.recruitment_post_id);
  if (!recruitmentPostId && tasks.length === 0) return null;

  return {
    version: 'collaborative_task_flywheel_v1',
    recruitmentPostId,
    tasks,
    dispatchedAt: asString(r.dispatchedAt ?? r.dispatched_at, new Date().toISOString()),
  };
}

export function normalizeCollaborativeTaskEventAction(raw: unknown): CollaborativeTaskEventAction | null {
  const action = String(raw ?? '').trim();
  if (action === 'confirm' || action === 'rollback' || action === 'ack_timeout') return action;
  return null;
}

export function statusForAction(action: CollaborativeTaskEventAction): CollaborativeTaskStatus {
  if (action === 'confirm') return 'confirmed';
  if (action === 'rollback') return 'rolled_back';
  return 'timed_out';
}

export function extractFlywheelFromTripMetadata(
  metadata: Record<string, unknown> | undefined | null
): CollaborativeTaskFlywheelMetadata | null {
  if (!metadata) return null;
  return normalizeCollaborativeTaskFlywheel(
    metadata.collaborativeTaskFlywheel ?? metadata.collaborative_task_flywheel
  );
}

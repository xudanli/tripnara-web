import type {
  ExecutionAdjustmentQueueDto,
  ExecutionAlertDto,
  ExecutionAlertsDto,
  ExecutionInterventionDto,
  ExecutionUserActionDto,
  ExecutionUserNarrativeDto,
  InterventionWriteBranch,
  MobileDecisionAcceptRequest,
} from '@/types/mobile-execution';

export function isTepIntervention(item: ExecutionInterventionDto): boolean {
  return item.id.startsWith('intervention-tep-') && !item.decisionProblemId;
}

export function resolveInterventionWriteBranch(
  item: ExecutionInterventionDto,
): InterventionWriteBranch {
  if (isTepIntervention(item)) return 'tep';
  if (item.decisionProblemId) {
    if (
      item.semanticCapability === 'EXECUTION_SCHEDULE_INFEASIBLE' ||
      item.decisionProblemId.startsWith('problem_exec_slip_')
    ) {
      return 'slip';
    }
    return 'decision';
  }
  return 'risk';
}

export function resolveRiskIdForIntervention(item: ExecutionInterventionDto): string | null {
  return item.primaryRiskId ?? item.linkedRiskIds?.[0] ?? null;
}

/** v2：primaryRisk + independentRisks；勿重复渲染 alerts[] */
export function listExecutionAlertCards(data: ExecutionAlertsDto): ExecutionAlertDto[] {
  const cards: ExecutionAlertDto[] = [];
  if (data.primaryRisk) cards.push(data.primaryRisk);
  if (data.independentRisks?.length) {
    cards.push(...data.independentRisks);
  } else if (!data.primaryRisk && data.alerts?.length) {
    cards.push(...data.alerts);
  }
  return cards;
}

export function pickPrimaryUserAction(
  actions?: ExecutionUserActionDto[],
): ExecutionUserActionDto | undefined {
  return actions?.find((a) => a.role === 'primary' && a.enabled);
}

export function pickDeferUserAction(
  actions?: ExecutionUserActionDto[],
): ExecutionUserActionDto | undefined {
  return actions?.find((a) => a.role === 'defer' && a.enabled);
}

export function hasUserNarrative(
  narrative?: ExecutionUserNarrativeDto | null,
): narrative is ExecutionUserNarrativeDto {
  return Boolean(
    narrative?.whatHappened?.trim() ||
      narrative?.impactOnTrip?.trim() ||
      narrative?.recommendation?.trim(),
  );
}

export function alertLevelBadgeClass(level: ExecutionAlertDto['level']): string {
  switch (level) {
    case 'STOP':
      return 'border-gate-reject-border/50 bg-gate-reject/10 text-gate-reject-foreground';
    case 'REPLAN_REQUIRED':
      return 'border-gate-confirm-border/50 bg-gate-confirm/10 text-gate-confirm-foreground';
    default:
      return 'border-border/70 bg-muted/30 text-foreground';
  }
}

export function interventionPriorityLabel(priority: ExecutionInterventionDto['priority']): string {
  switch (priority) {
    case 'CRITICAL':
      return '紧急';
    case 'HIGH':
      return '高优先级';
    case 'MEDIUM':
      return '中优先级';
    default:
      return '低优先级';
  }
}

export function shouldShowExecutionTepHub(requiredAction?: string | null): boolean {
  return requiredAction === 'STOP' || requiredAction === 'REPLAN';
}

export function resolveQueueItemIdForDecisionProblem(
  queue: ExecutionAdjustmentQueueDto | null | undefined,
  decisionProblemId?: string | null,
): string | null {
  if (!decisionProblemId || !queue?.items?.length) return null;
  const match = queue.items.find((item) => item.decisionProblemId === decisionProblemId);
  return match?.id ?? null;
}

export function hasExecutionTepContent(
  alerts: ExecutionAlertsDto | null | undefined,
  queue: ExecutionAdjustmentQueueDto | null | undefined,
): boolean {
  if (queue && queue.pendingCount > 0) return true;
  if (!alerts) return false;
  if (shouldShowExecutionTepHub(alerts.requiredAction)) return true;
  if (alerts.primaryRisk) return true;
  return listExecutionAlertCards(alerts).length > 0;
}

export interface DecisionQueueHydratedDetail {
  recommendedActionId?: string;
  repairOptions?: unknown[];
  actions?: Record<string, { actionId?: string; enabled?: boolean } | undefined>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readRepairOptionId(option: unknown): string | null {
  const record = asRecord(option);
  if (!record) return null;
  const id = record.id ?? record.optionId ?? record.actionId;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function findRepairOptionId(
  repairOptions: unknown[] | undefined,
  targetId: string | null | undefined,
): string | null {
  if (!targetId?.trim() || !repairOptions?.length) return null;
  const match = repairOptions.find((option) => readRepairOptionId(option) === targetId.trim());
  return match ? readRepairOptionId(match) : null;
}

function readDecisionQueueActionId(
  actions: DecisionQueueHydratedDetail['actions'],
  key: string,
): string | null {
  const action = actions?.[key];
  const actionId = action?.actionId?.trim();
  return actionId || null;
}

/** accept 前 hydrate decision-queue/{id}，优先 repairOptions / recommendedActionId */
export function resolveDecisionAcceptRequest(
  item: ExecutionInterventionDto,
  detail?: DecisionQueueHydratedDetail | null,
): MobileDecisionAcceptRequest {
  const repairOptions = Array.isArray(detail?.repairOptions) ? detail.repairOptions : [];
  const recommendedId =
    detail?.recommendedActionId?.trim() ||
    item.recommendation?.recommendedActionId?.trim() ||
    readDecisionQueueActionId(detail?.actions, 'acceptRecommended') ||
    null;

  const optionId =
    findRepairOptionId(repairOptions, recommendedId) ||
    recommendedId ||
    (repairOptions.length ? readRepairOptionId(repairOptions[0]) : null) ||
    item.actions.primary.actionId?.trim() ||
    null;

  const actionId =
    readDecisionQueueActionId(detail?.actions, 'acceptRecommended') ||
    item.actions.primary.actionId?.trim() ||
    optionId;

  return {
    actionId: actionId ?? undefined,
    optionId: optionId ?? actionId ?? undefined,
  };
}

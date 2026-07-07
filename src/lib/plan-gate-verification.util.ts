import type { EvidenceItem, ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';
import type { GateStatus } from '@/lib/gate-status';
import { normalizeGateStatus } from '@/lib/gate-status';
import { humanizeWorkbenchDisplayText, isWorkbenchChooseActive } from '@/lib/planning-workbench-ux.util';
import type {
  PlanGateOverallStatus,
  PlanGatePendingConfirmation,
  PlanGateSubmitEligibility,
  PlanGateUiOutput,
  PlanGateUserConfirmationState,
} from '@/types/plan-gate';

/** 方案验证维度（用户侧，非人格卡片） */
export type PlanGateVerificationDimensionId =
  | 'safety_feasibility'
  | 'pace_load'
  | 'experience_completeness';

export type PlanGateVerificationDimensionStatus = PlanGateOverallStatus;

export interface PlanGateVerificationDimension {
  id: PlanGateVerificationDimensionId;
  label: string;
  status: PlanGateVerificationDimensionStatus;
  statusLabel: string;
  summary?: string;
  detailItems: string[];
}

export interface PlanGateVerificationModel {
  draftLabel: string;
  overallGateStatus: GateStatus;
  overallLabel: string;
  dimensions: PlanGateVerificationDimension[];
  pendingConfirmations: PlanGatePendingConfirmation[];
  headline?: string;
  source: 'planGate' | 'legacy';
}

const DIMENSION_STATUS_LABEL: Record<PlanGateVerificationDimensionStatus, string> = {
  pass: '通过',
  suggest_adjust: '建议调整',
  need_confirm: '需要确认',
  blocked: '阻塞',
  insufficient_data: '数据不足',
};

const OVERALL_GATE_LABEL: Record<GateStatus, string> = {
  ALLOW: '可提交',
  NEED_CONFIRM: '需要确认',
  SUGGEST_REPLACE: '建议调整',
  REJECT: '不可提交',
};

const DIMENSION_KEY_MAP: Record<string, PlanGateVerificationDimensionId> = {
  safetyFeasibility: 'safety_feasibility',
  safety_feasibility: 'safety_feasibility',
  paceLoad: 'pace_load',
  pace_load: 'pace_load',
  experienceCompleteness: 'experience_completeness',
  experience_completeness: 'experience_completeness',
};

export function mapPlanGateOverallStatusToGate(status: PlanGateOverallStatus): GateStatus {
  switch (status) {
    case 'pass':
      return 'ALLOW';
    case 'suggest_adjust':
      return 'SUGGEST_REPLACE';
    case 'blocked':
      return 'REJECT';
    case 'insufficient_data':
    case 'need_confirm':
    default:
      return 'NEED_CONFIRM';
  }
}

function mapPersonaVerdictToDimensionStatus(verdict: string | undefined): PlanGateVerificationDimensionStatus {
  const gate = normalizeGateStatus(verdict ?? 'NEED_CONFIRM');
  switch (gate) {
    case 'ALLOW':
      return 'pass';
    case 'SUGGEST_REPLACE':
      return 'suggest_adjust';
    case 'NEED_CONFIRM':
      return 'need_confirm';
    case 'REJECT':
      return 'blocked';
    default:
      return 'need_confirm';
  }
}

function collectDetailItems(
  explanation?: string | null,
  evidence?: EvidenceItem[] | null,
  confirmations?: string[] | null,
  checks?: Array<{ label?: string; detail?: string; description?: string }> | null,
  max = 4,
): string[] {
  const items: string[] = [];
  const summary = humanizeWorkbenchDisplayText(explanation);
  if (summary) items.push(summary);

  for (const check of checks ?? []) {
    const text =
      humanizeWorkbenchDisplayText(check.detail ?? check.description) ??
      humanizeWorkbenchDisplayText(check.label);
    if (text && !items.includes(text)) items.push(text);
    if (items.length >= max) break;
  }

  for (const item of evidence ?? []) {
    const text = humanizeWorkbenchDisplayText(item.excerpt ?? item.relevance ?? item.source);
    if (text && !items.includes(text)) items.push(text);
    if (items.length >= max) break;
  }

  for (const item of confirmations ?? []) {
    const text = humanizeWorkbenchDisplayText(item);
    if (text && !items.includes(text)) items.push(text);
    if (items.length >= max) break;
  }

  return items.slice(0, max);
}

function buildFromPlanGate(planGate: PlanGateUiOutput): PlanGateVerificationModel {
  const { verification } = planGate;
  const overallGateStatus = mapPlanGateOverallStatusToGate(verification.overallStatus);

  const dimensions: PlanGateVerificationDimension[] = verification.dimensions.map((dimension) => {
    const id = DIMENSION_KEY_MAP[dimension.key] ?? 'safety_feasibility';
    return {
      id,
      label: dimension.title,
      status: dimension.status,
      statusLabel: DIMENSION_STATUS_LABEL[dimension.status] ?? dimension.status,
      summary: humanizeWorkbenchDisplayText(dimension.summary),
      detailItems: collectDetailItems(dimension.summary, null, null, dimension.checks),
    };
  });

  return {
    draftLabel: verification.draftLabel,
    overallGateStatus,
    overallLabel: OVERALL_GATE_LABEL[overallGateStatus],
    dimensions,
    pendingConfirmations: verification.pendingConfirmations ?? [],
    headline: humanizeWorkbenchDisplayText(verification.headline),
    source: 'planGate',
  };
}

/** legacy：persona 映射（过渡） */
function buildLegacyVerificationModel(
  result: ExecutePlanningWorkbenchResponse,
): PlanGateVerificationModel {
  const personas = result.uiOutput.personas;
  const consolidated = result.uiOutput.consolidatedDecision;
  const overallGateStatus = normalizeGateStatus(consolidated?.status ?? 'NEED_CONFIRM');

  const abu = personas?.abu;
  const drdre = personas?.drdre;
  const neptune = personas?.neptune;

  const dimensions: PlanGateVerificationDimension[] = [
    {
      id: 'safety_feasibility',
      label: '安全与可行性',
      status: mapPersonaVerdictToDimensionStatus(abu?.verdict),
      statusLabel: DIMENSION_STATUS_LABEL[mapPersonaVerdictToDimensionStatus(abu?.verdict)],
      summary: humanizeWorkbenchDisplayText(abu?.explanation),
      detailItems: collectDetailItems(abu?.explanation, abu?.evidence, abu?.confirmations),
    },
    {
      id: 'pace_load',
      label: '节奏与负荷',
      status: mapPersonaVerdictToDimensionStatus(drdre?.verdict),
      statusLabel: DIMENSION_STATUS_LABEL[mapPersonaVerdictToDimensionStatus(drdre?.verdict)],
      summary: humanizeWorkbenchDisplayText(drdre?.explanation),
      detailItems: collectDetailItems(drdre?.explanation, drdre?.evidence, drdre?.confirmations),
    },
    {
      id: 'experience_completeness',
      label: '体验与完整性',
      status: mapPersonaVerdictToDimensionStatus(neptune?.verdict),
      statusLabel: DIMENSION_STATUS_LABEL[mapPersonaVerdictToDimensionStatus(neptune?.verdict)],
      summary: humanizeWorkbenchDisplayText(neptune?.explanation),
      detailItems: collectDetailItems(neptune?.explanation, neptune?.evidence, neptune?.confirmations),
    },
  ];

  const confirmationItems = result.uiOutput.confirmations ?? [];
  const pendingConfirmations: PlanGatePendingConfirmation[] = confirmationItems.map((item, index) => ({
    id: `signoff_${index}`,
    title: `确认项 ${index + 1}`,
    description: humanizeWorkbenchDisplayText(item) || item,
    kind: 'sign_off',
  }));

  return {
    draftLabel: `A${result.planState?.plan_version ?? '—'}`,
    overallGateStatus,
    overallLabel: OVERALL_GATE_LABEL[overallGateStatus],
    dimensions,
    pendingConfirmations,
    source: 'legacy',
  };
}

/** 优先 uiOutput.planGate，fallback persona 映射 */
export function buildPlanGateVerificationModel(
  result: ExecutePlanningWorkbenchResponse | null,
): PlanGateVerificationModel | null {
  if (!result) return null;
  if (result.uiOutput.planGate) {
    return buildFromPlanGate(result.uiOutput.planGate);
  }
  return buildLegacyVerificationModel(result);
}

export function planGateDimensionStatusClass(status: PlanGateVerificationDimensionStatus): string {
  switch (status) {
    case 'pass':
      return 'text-success bg-muted/10 border-gate-allow-border/50';
    case 'suggest_adjust':
      return 'text-gate-suggest-foreground bg-gate-suggest/10 border-gate-suggest-border/50';
    case 'need_confirm':
      return 'text-warning bg-muted/10 border-border/50';
    case 'blocked':
      return 'text-error bg-muted/10 border-border/50';
    case 'insufficient_data':
      return 'text-muted-foreground bg-muted/30 border-border/60';
  }
}

export function resolvePlanGateTradeoffConfirmations(
  model: PlanGateVerificationModel | null,
): PlanGatePendingConfirmation[] {
  return model?.pendingConfirmations.filter((item) => item.kind === 'trade_off') ?? [];
}

export function resolvePlanGateSignOffConfirmations(
  model: PlanGateVerificationModel | null,
): PlanGatePendingConfirmation[] {
  return model?.pendingConfirmations.filter((item) => item.kind === 'sign_off') ?? [];
}

export function arePlanGateConfirmationsSatisfied(
  submitEligibility: PlanGateSubmitEligibility | undefined,
  userConfirmations: PlanGateUserConfirmationState[],
  model: PlanGateVerificationModel | null,
): boolean {
  if (!submitEligibility) {
    const signOffs = resolvePlanGateSignOffConfirmations(model);
    if (signOffs.length === 0) return true;
    return signOffs.every((item) => userConfirmations.some((c) => c.confirmationId === item.id && c.accepted));
  }

  const required = submitEligibility.requiredConfirmationIds;
  if (required.length === 0) {
    return submitEligibility.mode === 'ready' || submitEligibility.canSubmitToTimeline;
  }

  const satisfied = new Set([
    ...submitEligibility.satisfiedConfirmationIds,
    ...userConfirmations.filter((c) => c.accepted).map((c) => c.confirmationId),
  ]);

  return required.every((id) => satisfied.has(id));
}

export function buildPlanGateConfirmedItemsPayload(
  userConfirmations: PlanGateUserConfirmationState[],
): import('@/types/plan-gate').PlanGateConfirmedItemPayload[] {
  return userConfirmations
    .filter((item) => item.accepted)
    .map((item) => ({
      confirmationId: item.confirmationId,
      accepted: true,
      ...(item.choiceId ? { choiceId: item.choiceId } : {}),
    }));
}

export function resolvePlanGateCanProceed(
  planGate: PlanGateUiOutput | undefined,
  userConfirmations: PlanGateUserConfirmationState[],
  model: PlanGateVerificationModel | null,
): { canProceed: boolean; blocked: boolean; reason?: string } {
  if (!planGate) {
    return { canProceed: true, blocked: false };
  }

  const { submitEligibility } = planGate;
  if (submitEligibility.mode === 'blocked') {
    return {
      canProceed: false,
      blocked: true,
      reason: submitEligibility.blockers[0] ?? '存在阻塞项，暂无法提交',
    };
  }

  const confirmationsDone = arePlanGateConfirmationsSatisfied(
    submitEligibility,
    userConfirmations,
    model,
  );

  const hasPendingTradeOff = resolvePlanGateTradeoffConfirmations(model).some(
    (item) =>
      !userConfirmations.some((c) => c.confirmationId === item.id && c.accepted && c.choiceId),
  );

  if (hasPendingTradeOff) {
    return { canProceed: false, blocked: false, reason: '请先完成取舍确认' };
  }

  if (!confirmationsDone) {
    return { canProceed: false, blocked: false, reason: '请先完成全部确认项' };
  }

  if (submitEligibility.mode === 'insufficient_data') {
    return { canProceed: false, blocked: true, reason: '数据不足，请补充后重试' };
  }

  return {
    canProceed:
      submitEligibility.canSubmitToTimeline ||
      submitEligibility.canSubmitWithAcceptedRisk ||
      submitEligibility.mode === 'ready',
    blocked: false,
  };
}

export function resolvePlanGateWizardStepFromResult(
  result: ExecutePlanningWorkbenchResponse | null,
  userConfirmations: PlanGateUserConfirmationState[],
): import('@/hooks/usePlanGateFlow').PlanGateWizardStep | null {
  if (!result) return null;

  const model = buildPlanGateVerificationModel(result);
  const planGate = result.uiOutput.planGate;

  if (planGate) {
    const tradeOffs = resolvePlanGateTradeoffConfirmations(model);
    const unsatisfiedTradeOff = tradeOffs.some(
      (item) =>
        !userConfirmations.some((c) => c.confirmationId === item.id && c.accepted && c.choiceId),
    );
    if (unsatisfiedTradeOff) return 'tradeoffs';

    if (planGate.submitEligibility.mode === 'blocked') return 'verify';
    if (planGate.submitEligibility.mode === 'ready') return 'verify';
    if (planGate.submitEligibility.mode === 'pending_confirmations') return 'verify';
    return 'verify';
  }

  // legacy
  if (isWorkbenchChooseActive(result)) return 'tradeoffs';
  return 'verify';
}

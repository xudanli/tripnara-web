/**
 * 硬约束求解器 enforce 元数据 — 与 BFF `trip-constraint-hard-enforcement.util.ts` 对齐。
 * 约束控制台展示 · trip-conflicts → feasibility → verdict 共用此 SSOT。
 */
import type { TripConstraint, TripConstraintViolationResult } from '@/types/trip-constraints';
import type {
  FeasibilityIssueKind,
  FeasibilityIssuePriority,
} from '@/types/trip-feasibility-report';
import { apiConstraintIdToUi } from '@/lib/trip-constraints.adapter';

/** BFF templateId（source.templateId） */
export type HardConstraintEnforcementTemplateId =
  | 'max_daily_drive'
  | 'no_night_drive'
  | 'budget_total'
  | string;

/** feasibility / trip-conflicts issueKind */
export type HardConstraintEnforcementIssueKind = 'daily_drive' | 'no_night_drive' | 'budget';

/** 违反后的 verdict 通道 */
export type HardConstraintVerdictChannel = 'NOT_EXECUTABLE' | 'BUDGET_GATE';

export interface HardConstraintEnforcementSpec {
  templateId: HardConstraintEnforcementTemplateId;
  /** GET /constraints items[].id */
  constraintIds: readonly string[];
  /** 约束控制台 UI id（apiConstraintIdToUi 后） */
  uiIds: readonly string[];
  issueKind: HardConstraintEnforcementIssueKind;
  /** 检测逻辑（产品说明） */
  detectionLabel: string;
  violationResult: TripConstraintViolationResult;
  violationResultLabel: string;
  /** BLOCK → must_handle + severity high */
  feasibilityPriority: FeasibilityIssuePriority;
  feasibilitySeverity: 'high' | 'medium' | 'low';
  /** Guardian transport 硬阻断 */
  hardConstraintBlocked: boolean;
  verdictChannel: HardConstraintVerdictChannel;
  ruleLabelDefault: string;
}

/** P1 — 求解器 enforce 模板（顺序即展示优先级） */
export const HARD_CONSTRAINT_ENFORCEMENT_SPECS: readonly HardConstraintEnforcementSpec[] = [
  {
    templateId: 'max_daily_drive',
    constraintIds: ['c_max_daily_drive', 'max_daily_drive', 'daily_drive'],
    uiIds: ['daily_drive', 'max_daily_drive'],
    issueKind: 'daily_drive',
    detectionLabel: '当日 DRIVING 累计超时',
    violationResult: 'BLOCK',
    violationResultLabel: '阻断执行',
    feasibilityPriority: 'must_handle',
    feasibilitySeverity: 'high',
    hardConstraintBlocked: true,
    verdictChannel: 'NOT_EXECUTABLE',
    ruleLabelDefault: '单日驾驶时长不超过设定上限',
  },
  {
    templateId: 'no_night_drive',
    constraintIds: ['c_no_night_drive', 'no_night_drive'],
    uiIds: ['no_night_drive'],
    issueKind: 'no_night_drive',
    detectionLabel: '驾驶段结束晚于 SunCalc 日落 + 缓冲',
    violationResult: 'BLOCK',
    violationResultLabel: '阻断执行',
    feasibilityPriority: 'must_handle',
    feasibilitySeverity: 'high',
    hardConstraintBlocked: true,
    verdictChannel: 'NOT_EXECUTABLE',
    ruleLabelDefault: '日落后不得继续驾驶（含缓冲）',
  },
  {
    templateId: 'budget_total',
    constraintIds: ['c_budget_total', 'budget_total', 'budget'],
    uiIds: ['budget'],
    issueKind: 'budget',
    detectionLabel: 'Budget OS / constraint-checker（既有链路）',
    violationResult: 'BLOCK',
    violationResultLabel: '阻断执行',
    feasibilityPriority: 'must_handle',
    feasibilitySeverity: 'high',
    hardConstraintBlocked: false,
    verdictChannel: 'BUDGET_GATE',
    ruleLabelDefault: '总花费不得超过预算上限（含容忍额度）',
  },
] as const;

const specByTemplateId = new Map<string, HardConstraintEnforcementSpec>();
const specByConstraintId = new Map<string, HardConstraintEnforcementSpec>();
const specByUiId = new Map<string, HardConstraintEnforcementSpec>();
const specByIssueKind = new Map<string, HardConstraintEnforcementSpec>();

for (const spec of HARD_CONSTRAINT_ENFORCEMENT_SPECS) {
  specByTemplateId.set(spec.templateId, spec);
  specByIssueKind.set(spec.issueKind, spec);
  for (const id of spec.constraintIds) specByConstraintId.set(id, spec);
  for (const id of spec.uiIds) specByUiId.set(id, spec);
}

export function resolveHardEnforcementSpec(input: {
  templateId?: string | null;
  constraintId?: string | null;
  uiId?: string | null;
  issueKind?: string | null;
}): HardConstraintEnforcementSpec | undefined {
  const issueKind = input.issueKind?.trim();
  if (issueKind && specByIssueKind.has(issueKind)) {
    return specByIssueKind.get(issueKind);
  }

  const templateId = input.templateId?.trim();
  if (templateId && specByTemplateId.has(templateId)) {
    return specByTemplateId.get(templateId);
  }

  for (const rawId of [input.constraintId, input.uiId]) {
    const id = rawId?.trim();
    if (!id) continue;
    if (specByConstraintId.has(id)) return specByConstraintId.get(id);
    if (specByUiId.has(id)) return specByUiId.get(id);
    const ui = apiConstraintIdToUi(id);
    if (specByUiId.has(ui)) return specByUiId.get(ui);
    if (specByConstraintId.has(ui)) return specByConstraintId.get(ui);
    if (id.startsWith('c_')) {
      const stripped = id.slice(2);
      if (specByTemplateId.has(stripped)) return specByTemplateId.get(stripped);
      if (specByConstraintId.has(stripped)) return specByConstraintId.get(stripped);
    }
  }

  return undefined;
}

/** 用户可调 pacing 硬约束 — 与 BFF section 排除一致，永不归入 readonly_official */
export const USER_ADJUSTABLE_PACING_TEMPLATE_IDS = new Set<HardConstraintEnforcementTemplateId>([
  'max_daily_drive',
  'no_night_drive',
]);

export function isUserAdjustablePacingHardConstraint(
  constraint: Pick<TripConstraint, 'id' | 'source'>,
): boolean {
  const templateId = constraint.source?.templateId?.trim();
  if (templateId && USER_ADJUSTABLE_PACING_TEMPLATE_IDS.has(templateId)) return true;

  const spec = resolveHardEnforcementSpec({
    templateId,
    constraintId: constraint.id,
    uiId: apiConstraintIdToUi(constraint.id),
  });
  return Boolean(spec && USER_ADJUSTABLE_PACING_TEMPLATE_IDS.has(spec.templateId));
}

export function resolveHardEnforcementSpecForConstraint(
  constraint: Pick<TripConstraint, 'id' | 'source'>,
): HardConstraintEnforcementSpec | undefined {
  return resolveHardEnforcementSpec({
    templateId: constraint.source?.templateId,
    constraintId: constraint.id,
    uiId: apiConstraintIdToUi(constraint.id),
  });
}

export function resolveConstraintUiIdsForEnforcementIssueKind(
  issueKind: string | undefined,
): string[] {
  const spec = resolveHardEnforcementSpec({ issueKind });
  return spec ? [...spec.uiIds] : [];
}

export function resolveConstraintApiIdsForEnforcementIssueKind(
  issueKind: string | undefined,
): string[] {
  const spec = resolveHardEnforcementSpec({ issueKind });
  return spec ? [...spec.constraintIds] : [];
}

export function isHardConstraintBlockViolation(
  violationResult: TripConstraintViolationResult | undefined | null,
): boolean {
  if (!violationResult) return false;
  return violationResult === 'BLOCK';
}

/** contractMeta.violationResult === BLOCK → feasibility must_handle + severity high */
export function resolveFeasibilitySignalsForHardConstraint(input: {
  violationResult?: TripConstraintViolationResult | null;
  templateId?: string | null;
  constraintId?: string | null;
  issueKind?: FeasibilityIssueKind | string | null;
}): { priority: FeasibilityIssuePriority; severity: 'high' | 'medium' | 'low' } | null {
  const spec = resolveHardEnforcementSpec({
    templateId: input.templateId,
    constraintId: input.constraintId,
    issueKind: input.issueKind,
  });

  if (isHardConstraintBlockViolation(input.violationResult)) {
    return { priority: 'must_handle', severity: 'high' };
  }

  if (spec?.violationResult === 'BLOCK') {
    return {
      priority: spec.feasibilityPriority,
      severity: spec.feasibilitySeverity,
    };
  }

  if (spec) {
    return {
      priority: spec.feasibilityPriority,
      severity: spec.feasibilitySeverity,
    };
  }

  return null;
}

export function isHardConstraintBlockedIssueKind(
  issueKind: string | undefined | null,
): boolean {
  const spec = resolveHardEnforcementSpec({ issueKind });
  return spec?.hardConstraintBlocked === true;
}

export function isEnforcedHardConstraintIssueKind(
  issueKind: string | undefined | null,
): boolean {
  return Boolean(issueKind && specByIssueKind.has(issueKind));
}

export function resolveEnforcementRuleLabelDefault(
  metaKeyOrTemplateId: string,
): string | undefined {
  return (
    specByTemplateId.get(metaKeyOrTemplateId)?.ruleLabelDefault ??
    specByConstraintId.get(metaKeyOrTemplateId)?.ruleLabelDefault ??
    specByUiId.get(metaKeyOrTemplateId)?.ruleLabelDefault
  );
}

export function resolveEnforcementViolationLabel(
  metaKeyOrTemplateId: string,
): string | undefined {
  const spec =
    specByTemplateId.get(metaKeyOrTemplateId) ??
    specByConstraintId.get(metaKeyOrTemplateId) ??
    specByUiId.get(metaKeyOrTemplateId);
  return spec?.violationResultLabel;
}

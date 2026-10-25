import type {
  DecisionCaseActionKind,
  DecisionCaseDomain,
  DecisionCaseEnrichmentStage,
  DecisionCaseMeta,
  DecisionCaseRequiredness,
  DecisionCaseScope,
  DecisionCaseSourceKind,
  DecisionCaseUiGroup,
  DecisionCaseWritebackTarget,
  DecisionOpportunityListResponse,
  DecisionOpportunitySummary,
} from '@/types/decision-case';

const SOURCE_KINDS = new Set([
  'REQUIRED_CHOICE',
  'RULE_TRIGGER',
  'OPPORTUNITY',
  'WORLD_EVENT',
]);

const REQUIREDNESS = new Set(['BLOCKING', 'IMPORTANT', 'OPTIONAL']);

const UI_GROUP_FROM_RAW: Record<string, DecisionCaseUiGroup> = {
  MUST_CONFIRM: 'MUST_CONFIRM',
  IMPORTANT_CHOICE: 'IMPORTANT_CHOICE',
  WORTH_CONSIDERING: 'WORTH_CONSIDERING',
  必须确认: 'MUST_CONFIRM',
  重要选择: 'IMPORTANT_CHOICE',
  关键选择: 'IMPORTANT_CHOICE',
  值得考虑: 'WORTH_CONSIDERING',
};

export const DECISION_CASE_UI_GROUP_LABEL: Record<
  'MUST_CONFIRM' | 'IMPORTANT_CHOICE' | 'WORTH_CONSIDERING',
  string
> = {
  MUST_CONFIRM: '必须确认',
  IMPORTANT_CHOICE: '重要选择',
  WORTH_CONSIDERING: '值得考虑',
};

export const DECISION_CASE_UI_GROUP_ORDER: Array<
  'MUST_CONFIRM' | 'IMPORTANT_CHOICE' | 'WORTH_CONSIDERING'
> = ['MUST_CONFIRM', 'IMPORTANT_CHOICE', 'WORTH_CONSIDERING'];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function normalizeUiGroup(
  raw: unknown,
  requiredness?: DecisionCaseRequiredness,
  materialityScore?: number,
): DecisionCaseUiGroup | undefined {
  const key = asString(raw);
  if (key && UI_GROUP_FROM_RAW[key]) return UI_GROUP_FROM_RAW[key];

  if (requiredness === 'BLOCKING') return 'MUST_CONFIRM';
  if (requiredness === 'IMPORTANT') return 'IMPORTANT_CHOICE';
  if (requiredness === 'OPTIONAL') return 'WORTH_CONSIDERING';

  if (materialityScore != null) {
    if (materialityScore >= 9) return 'MUST_CONFIRM';
    if (materialityScore >= 6) return 'IMPORTANT_CHOICE';
    if (materialityScore >= 3) return 'WORTH_CONSIDERING';
  }

  return undefined;
}

function normalizeWritebackTargets(raw: unknown): DecisionCaseWritebackTarget[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const targets = raw
    .map((item) => asString(item))
    .filter(Boolean) as DecisionCaseWritebackTarget[];
  return targets.length ? targets : undefined;
}

function normalizeBreakdown(raw: unknown): DecisionCaseMeta['materialityBreakdown'] | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const breakdown = {
    budget: asNumber(record.budget),
    time: asNumber(record.time),
    safety: asNumber(record.safety),
    fitness: asNumber(record.fitness),
    team: asNumber(record.team),
    bookingUrgency: asNumber(record.bookingUrgency ?? record.booking_urgency),
    irreversibility: asNumber(record.irreversibility),
  };
  return Object.values(breakdown).some((v) => v != null) ? breakdown : undefined;
}

function normalizeEligibility(raw: unknown): DecisionCaseMeta['eligibility'] | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const eligible = record.eligible === true || record.eligible === false ? record.eligible : undefined;
  if (eligible == null) return undefined;

  const checksRaw = Array.isArray(record.checks) ? record.checks : [];
  const checks = checksRaw
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const code = asString(row.code);
      if (!code || (row.passed !== true && row.passed !== false)) return null;
      return {
        code,
        passed: row.passed === true,
        message: asString(row.message),
        dimension: asString(row.dimension),
        detail: asString(row.detail),
      };
    })
    .filter(Boolean) as NonNullable<DecisionCaseMeta['eligibility']>['checks'];

  const softWarnings = Array.isArray(record.softWarnings ?? record.soft_warnings)
    ? ((record.softWarnings ?? record.soft_warnings) as unknown[])
        .map((item) => asString(item))
        .filter(Boolean) as string[]
    : undefined;

  const eligibleOptionIds = Array.isArray(
    record.eligibleOptionIds ?? record.eligible_option_ids,
  )
    ? ((record.eligibleOptionIds ?? record.eligible_option_ids) as unknown[])
        .map((item) => asString(item))
        .filter(Boolean) as string[]
    : undefined;

  return {
    eligible,
    reason: asString(record.reason),
    checks: checks?.length ? checks : undefined,
    softWarnings: softWarnings?.length ? softWarnings : undefined,
    eligibleOptionIds: eligibleOptionIds?.length ? eligibleOptionIds : undefined,
  };
}

export function normalizeDecisionCaseConstraintHints(
  raw: unknown,
): import('@/types/decision-case').DecisionCaseConstraintHints | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const fordingExcluded =
    record.fordingExcluded === true ||
    record.fording_excluded === true ||
    record.fordingExcluded === false ||
    record.fording_excluded === false
      ? Boolean(record.fordingExcluded ?? record.fording_excluded)
      : undefined;
  const writebackPayload = asRecord(record.writebackPayload ?? record.writeback_payload) ?? undefined;
  if (fordingExcluded == null && !writebackPayload) return undefined;
  return {
    ...(fordingExcluded != null ? { fordingExcluded } : {}),
    ...(writebackPayload ? { writebackPayload } : {}),
  };
}

/** 从 BFF problem / list item 上的 decisionCase 归一化 */
export function normalizeDecisionCaseMeta(raw: unknown): DecisionCaseMeta | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;

  const sourceKindRaw = asString(record.sourceKind ?? record.source_kind);
  const requirednessRaw = asString(record.requiredness)?.toUpperCase();
  if (!sourceKindRaw || !requirednessRaw) return undefined;

  const sourceKind = (
    SOURCE_KINDS.has(sourceKindRaw) ? sourceKindRaw : sourceKindRaw
  ) as DecisionCaseSourceKind;
  const requiredness = (
    REQUIREDNESS.has(requirednessRaw) ? requirednessRaw : requirednessRaw
  ) as DecisionCaseRequiredness;

  const materialityScore = asNumber(record.materialityScore ?? record.materiality_score);
  const enrichmentStage = asString(
    record.enrichmentStage ?? record.enrichment_stage,
  ) as DecisionCaseEnrichmentStage | undefined;
  const uiGroup = normalizeUiGroup(
    record.uiGroup ?? record.ui_group,
    requiredness,
    materialityScore,
  );
  const uiGroupLabelZh =
    asString(record.uiGroupLabelZh ?? record.ui_group_label_zh) ??
    (uiGroup === 'MUST_CONFIRM' ||
    uiGroup === 'IMPORTANT_CHOICE' ||
    uiGroup === 'WORTH_CONSIDERING'
      ? DECISION_CASE_UI_GROUP_LABEL[uiGroup]
      : undefined);

  const meta: DecisionCaseMeta = {
    sourceKind,
    requiredness,
    domain: asString(record.domain) as DecisionCaseDomain | undefined,
    scope: asString(record.scope) as DecisionCaseScope | undefined,
    actionKind: asString(record.actionKind ?? record.action_kind) as
      | DecisionCaseActionKind
      | undefined,
    materialityScore,
    materialityBreakdown: normalizeBreakdown(
      record.materialityBreakdown ?? record.materiality_breakdown,
    ),
    enrichmentStage,
    writebackTargets: normalizeWritebackTargets(
      record.writebackTargets ?? record.writeback_targets,
    ),
    uiGroup,
    uiGroupLabelZh,
    eligibility: normalizeEligibility(record.eligibility),
  };

  return meta;
}

/** 解析队列分组键（有 decisionCase 时） */
export function resolveDecisionCaseUiGroupKey(
  decisionCase: DecisionCaseMeta | null | undefined,
): 'MUST_CONFIRM' | 'IMPORTANT_CHOICE' | 'WORTH_CONSIDERING' | null {
  if (!decisionCase) return null;
  const group = normalizeUiGroup(
    decisionCase.uiGroup,
    decisionCase.requiredness,
    decisionCase.materialityScore,
  );
  if (group === 'MUST_CONFIRM' || group === 'IMPORTANT_CHOICE' || group === 'WORTH_CONSIDERING') {
    return group;
  }
  return null;
}

/**
 * BFF 未带 decisionCase.uiGroup 时，按 P0 semanticKey / problemId 兜底入组，
 * 避免冰川等机会卡掉进「其他」。
 */
export function inferUiGroupFromSemanticKey(
  semanticKey?: string | null,
  problemId?: string | null,
): 'MUST_CONFIRM' | 'IMPORTANT_CHOICE' | 'WORTH_CONSIDERING' | null {
  const blob = `${semanticKey ?? ''} ${problemId ?? ''}`.toUpperCase();
  if (
    /REQUIRED_CHOICE|VEHICLE_ROAD_FIT|RENTAL_INSURANCE|FROAD_VEHICLE_MISMATCH/.test(blob) ||
    /(?:^|\s)DC_(?:VEHICLE|INSURANCE|FROAD)_/.test(` ${blob}`)
  ) {
    return 'MUST_CONFIRM';
  }
  if (
    /OPPORTUNITY\.|GLACIER_EXPERIENCE|HIGH_IMPACT_EXPERIENCE|LANDING_LONG_DRIVE|RING_VS_SOUTH|EXCESSIVE_DAILY_DRIVE/.test(
      blob,
    ) ||
    /(?:^|\s)DC_(?:GLACIER|LANDING|RING|DRIVE|EXP)_/.test(` ${blob}`)
  ) {
    return 'IMPORTANT_CHOICE';
  }
  return null;
}

export function resolveProblemUiGroupKey(
  item: Pick<import('@/types/decision-problem').DecisionProblemSummary, 'decisionCase' | 'semanticKey' | 'id'>,
): 'MUST_CONFIRM' | 'IMPORTANT_CHOICE' | 'WORTH_CONSIDERING' | null {
  return (
    resolveDecisionCaseUiGroupKey(item.decisionCase) ??
    inferUiGroupFromSemanticKey(item.semanticKey, item.id)
  );
}

export function decisionCaseUiGroupLabel(
  key: 'MUST_CONFIRM' | 'IMPORTANT_CHOICE' | 'WORTH_CONSIDERING',
  overrideZh?: string | null,
): string {
  const trimmed = overrideZh?.trim();
  if (trimmed) return trimmed;
  return DECISION_CASE_UI_GROUP_LABEL[key];
}

export function normalizeDecisionOpportunitySummary(
  raw: unknown,
): DecisionOpportunitySummary | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = asString(record.id ?? record.opportunityId ?? record.opportunity_id);
  const title = asString(record.title);
  if (!id || !title) return null;
  return {
    id,
    title,
    message: asString(record.message ?? record.summary),
    semanticKey: asString(record.semanticKey ?? record.semantic_key),
    sourceKind: asString(record.sourceKind ?? record.source_kind) as
      | DecisionCaseSourceKind
      | undefined,
    domain: asString(record.domain) as DecisionCaseDomain | undefined,
    materialityScore: asNumber(record.materialityScore ?? record.materiality_score),
    status: asString(record.status) as DecisionOpportunitySummary['status'],
    eligibility: normalizeEligibility(record.eligibility),
    ineligibilityReason: asString(
      record.ineligibilityReason ?? record.ineligibility_reason ?? record.reason,
    ),
  };
}

export function normalizeDecisionOpportunityListResponse(
  raw: unknown,
  tripId: string,
): DecisionOpportunityListResponse {
  const record = asRecord(raw);
  const listRaw = Array.isArray(raw)
    ? raw
    : Array.isArray(record?.items)
      ? record!.items
      : Array.isArray(record?.opportunities)
        ? record!.opportunities
        : [];
  const items = listRaw
    .map((item) => normalizeDecisionOpportunitySummary(item))
    .filter(Boolean) as DecisionOpportunitySummary[];
  return {
    tripId: asString(record?.tripId ?? record?.trip_id) ?? tripId,
    items,
  };
}

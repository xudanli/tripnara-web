import type {
  DecisionExpectedOutcome,
  DecisionObservedOutcome,
  DecisionOutcomeMetric,
  DecisionOutcomeUnit,
  DecisionOutcomeValidation,
  DecisionOutcomeValidationSummary,
  DecisionOutcomeVerdict,
  ExperienceOutcome,
} from '@/types/decision-problem';

export const OUTCOME_METRIC_LABELS: Record<string, string> = {
  CONSTRAINT_VIOLATION: '约束违规',
  DRIVING_DURATION: '驾驶时长',
  ACTIVITY_COMPLETION: '活动完成',
  ARRIVAL_TIME: '到达时间',
};

export const OUTCOME_VERDICT_LABELS: Record<string, string> = {
  PENDING: '待验证',
  CONFIRMED: '决策有效',
  PARTIALLY_CONFIRMED: '部分符合',
  REFUTED: '预测未兑现',
  INCONCLUSIVE: '证据不足',
};

export function outcomeMetricLabel(metric: DecisionOutcomeMetric): string {
  return OUTCOME_METRIC_LABELS[metric] ?? metric;
}

export function outcomeVerdictLabel(verdict: DecisionOutcomeVerdict | undefined): string {
  if (!verdict) return '待验证';
  return OUTCOME_VERDICT_LABELS[verdict] ?? verdict;
}

export function outcomeVerdictBadgeClass(verdict: DecisionOutcomeVerdict | undefined): string {
  const normalized = String(verdict ?? 'PENDING').trim().toUpperCase();
  switch (normalized) {
    case 'CONFIRMED':
      return 'bg-muted text-success border-gate-allow-border';
    case 'PARTIALLY_CONFIRMED':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'REFUTED':
      return 'bg-muted text-error border-border';
    case 'INCONCLUSIVE':
    case 'PENDING':
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function formatUnitValue(value: number, unit?: DecisionOutcomeUnit): string {
  if (unit === 'MINUTE') return `${value} 分钟`;
  if (unit === 'HOUR') return `${value} 小时`;
  if (unit === 'DAY') return `${value} 天`;
  if (unit === 'PERCENT') return `${value}%`;
  if (unit === 'CURRENCY') return `${value}`;
  return String(value);
}

export function formatExpectedOutcome(outcome: DecisionExpectedOutcome): string {
  const { expectedValue, tolerance, unit, metric } = outcome;
  if (typeof expectedValue === 'boolean') {
    if (metric === 'CONSTRAINT_VIOLATION') {
      return expectedValue ? '仍存在问题' : '问题应消解';
    }
    return expectedValue ? '是' : '否';
  }
  if (typeof expectedValue === 'number') {
    const base = formatUnitValue(expectedValue, unit);
    if (tolerance != null && Number.isFinite(tolerance)) {
      return `${base}（±${formatUnitValue(tolerance, unit)}）`;
    }
    return base;
  }
  return String(expectedValue);
}

export function formatObservedOutcome(outcome: DecisionObservedOutcome): string {
  const { actualValue, metric } = outcome;
  if (typeof actualValue === 'boolean') {
    if (metric === 'CONSTRAINT_VIOLATION') {
      return actualValue ? '仍存在' : '已消解';
    }
    return actualValue ? '是' : '否';
  }
  if (typeof actualValue === 'number') {
    return String(actualValue);
  }
  return String(actualValue);
}

export interface OutcomeComparisonRow {
  metric: DecisionOutcomeMetric;
  label: string;
  expected?: DecisionExpectedOutcome;
  observed?: DecisionObservedOutcome;
  matched: boolean | null;
}

export function buildOutcomeComparisonRows(
  validation: Pick<DecisionOutcomeValidation, 'expectedOutcomes' | 'observedOutcomes'>,
): OutcomeComparisonRow[] {
  const observedByMetric = new Map(
    validation.observedOutcomes.map((item) => [item.metric, item]),
  );
  const metrics = new Set<DecisionOutcomeMetric>([
    ...validation.expectedOutcomes.map((item) => item.metric),
    ...validation.observedOutcomes.map((item) => item.metric),
  ]);

  return [...metrics].map((metric) => {
    const expected = validation.expectedOutcomes.find((item) => item.metric === metric);
    const observed = observedByMetric.get(metric);
    let matched: boolean | null = null;
    if (expected && observed) {
      matched = String(expected.expectedValue) === String(observed.actualValue);
    }
    return {
      metric,
      label: outcomeMetricLabel(metric),
      expected,
      observed,
      matched,
    };
  });
}

export function resolveValidationHeadline(
  validation: DecisionOutcomeValidation | DecisionOutcomeValidationSummary | null | undefined,
): string {
  if (!validation) return '尚未验证决策效果';
  if (validation.explanation?.trim()) return validation.explanation.trim();
  return outcomeVerdictLabel(validation.verdict);
}

export const OUTCOME_FAILURE_REASON_LABELS: Record<string, string> = {
  PREDICTION_ERROR: '预测与观测不符',
  DATA_STALE: 'Ledger 已重算，原预测可能过期',
  EXECUTION_DEVIATION: '执行偏离',
  USER_BEHAVIOR_CHANGE: '用户行为变化',
  EXTERNAL_EVENT: '外部事件',
  INSUFFICIENT_EVIDENCE: '证据不足',
};

export const OBSERVED_SOURCE_LABELS: Record<string, string> = {
  SYSTEM_INFERENCE: '可行性推断',
  POI_FEEDBACK: 'POI 反馈',
  USER_ARRIVAL_CLICK: '用户确认到达',
  ITINERARY_ITEM_STATUS: '行程项状态',
  BOOKING_CHECKIN: '预订签到',
  NAVIGATION_EVENT: '导航事件',
  GPS: 'GPS',
  FEASIBILITY: '可行性',
};

export const EXPERIENCE_METRIC_LABELS: Record<string, string> = {
  USER_SATISFACTION: '满意度',
  REGRET: '后悔度',
  GROUP_CONFLICT: '团队冲突',
};

export function failureReasonLabel(reason: string): string {
  return OUTCOME_FAILURE_REASON_LABELS[reason] ?? reason;
}

export function observedSourceLabel(source: string | undefined): string | undefined {
  if (!source) return undefined;
  return OBSERVED_SOURCE_LABELS[source] ?? source;
}

export function hasDataStaleFailure(
  validation: Pick<DecisionOutcomeValidation, 'failureReasons' | 'verdict'> | null | undefined,
): boolean {
  return Boolean(
    validation?.failureReasons?.includes('DATA_STALE') ||
      (validation?.verdict === 'PARTIALLY_CONFIRMED' &&
        validation.failureReasons?.some((r) => r === 'DATA_STALE')),
  );
}

export function experienceMetricLabel(metric: string): string {
  return EXPERIENCE_METRIC_LABELS[metric] ?? metric;
}

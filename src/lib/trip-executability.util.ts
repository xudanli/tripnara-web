import type { ConstraintsSummaryResponse } from '@/types/planning-constraints';
import type {
  DailyDrivePlan,
  DriveLoadTier,
  ExecutabilityStatus,
  ExecutabilityStripLevel,
  LocalRepairPreview,
  PlanningRuleResult,
  RuleOutcome,
  RuleSeverity,
  TripExecutabilityView,
  ValidationFinding,
} from '@/types/trip-executability';

export const SEVERITY_WEIGHT: Record<RuleSeverity, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

export const OUTCOME_BADGE_LABEL: Record<RuleOutcome, string> = {
  REJECT: '无法执行',
  SUGGEST_REPAIR: '建议调整',
  NEED_CONFIRM: '需确认',
  CAUTION: '注意',
  PASS: '通过',
  UNKNOWN: '待更新',
};

export const REPAIR_ACTION_LABEL: Record<LocalRepairPreview['action'], string> = {
  REMOVE: '删除停靠',
  REPLACE: '替换活动',
  SHIFT: '调整时间',
  REROUTE: '改道',
};

export const STRIP_LEVEL_BG: Record<ExecutabilityStripLevel, string> = {
  success: 'bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] border-[color-mix(in_srgb,var(--color-success)_35%,transparent)]',
  warning: 'bg-[color-mix(in_srgb,var(--color-warning)_12%,transparent)] border-[color-mix(in_srgb,var(--color-warning)_35%,transparent)]',
  danger: 'bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)]',
  neutral: 'bg-muted/30 border-border/70',
};

const STATUS_LABEL_FALLBACK: Record<ExecutabilityStatus, string> = {
  EXECUTABLE: '可以出发',
  EXECUTABLE_WITH_CAUTION: '可以出发（留意）',
  REQUIRES_CONFIRMATION: '需确认后出发',
  REQUIRES_REPAIR: '需要调整后才能出发',
  NOT_EXECUTABLE: '无法执行',
  UNKNOWN: '待更新',
};

export function isIcelandDestination(destination?: string | null): boolean {
  if (!destination?.trim()) return false;
  const code = destination.split(',')[0]?.trim().toUpperCase();
  return code === 'IS' || destination.toLowerCase().includes('iceland') || destination.includes('冰岛');
}

export type TepTransportScopeSource =
  | ConstraintsSummaryResponse
  | { transport?: { scope?: string | null } }
  | null
  | undefined;

export function readTransportScope(summary?: TepTransportScopeSource): string | null {
  const transport = summary?.transport as { scope?: string } | undefined;
  return transport?.scope?.trim() || null;
}

/** 冰岛 + 自驾 scope 时展示 TEP 模块 */
export function shouldShowSelfDriveExecutability(
  destination: string | undefined | null,
  constraintsSummary?: TepTransportScopeSource,
): boolean {
  if (!isIcelandDestination(destination)) return false;
  return readTransportScope(constraintsSummary) === 'self_drive_only';
}

export function sortFindingsBySeverity(findings: ValidationFinding[]): ValidationFinding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity],
  );
}

export function findingRefsDay(finding: ValidationFinding, dayIndex: number): boolean {
  const token = `day_${dayIndex}`;
  return finding.affectedRefs.some((ref) => ref === token || ref.startsWith(`${token}_`));
}

export function collectDayRiskMessages(
  day: DailyDrivePlan,
  findings: ValidationFinding[],
  ruleResults: PlanningRuleResult[],
  tepRuleResults?: PlanningRuleResult[],
): string[] {
  const dayRefs = new Set<string>([
    `day_${day.dayIndex}`,
    ...day.legs.map((l) => l.legId),
    ...day.activities.map((a) => a.ref),
  ]);

  const matchesRef = (refs: string[]) => refs.some((ref) => dayRefs.has(ref));

  const messages: string[] = [];
  for (const finding of findings) {
    if (matchesRef(finding.affectedRefs) || findingRefsDay(finding, day.dayIndex)) {
      messages.push(finding.message);
    }
  }
  for (const rule of [...(tepRuleResults ?? []), ...ruleResults]) {
    if (matchesRef(rule.affectedRefs)) {
      messages.push(rule.explanation);
    }
  }
  return [...new Set(messages)].slice(0, 3);
}

export function inferDriveLoadTier(day: DailyDrivePlan): DriveLoadTier {
  const minutes = day.legs.reduce(
    (sum, leg) => sum + (leg.adjustedMinutes ?? leg.baseNavigationMinutes),
    0,
  );
  if (minutes >= 420) return 'EXTREME';
  if (minutes >= 300) return 'HIGH';
  if (minutes >= 180) return 'MEDIUM';
  return 'LOW';
}

export function extractDriveLoadTierFromMessages(messages: string[]): DriveLoadTier | null {
  for (const msg of messages) {
    const match = msg.match(/\b(LOW|MEDIUM|HIGH|EXTREME)\b/i);
    if (match) return match[1].toUpperCase() as DriveLoadTier;
  }
  return null;
}

export function resolveVulnerableDayIndex(
  findings: ValidationFinding[],
  dailyDrivePlans: DailyDrivePlan[],
): number | null {
  let bestDay: number | null = null;
  let bestWeight = 0;

  for (const finding of findings) {
    const weight = SEVERITY_WEIGHT[finding.severity];
    for (const ref of finding.affectedRefs) {
      const dayMatch = ref.match(/^day_(\d+)$/);
      if (!dayMatch) continue;
      const dayIndex = Number.parseInt(dayMatch[1], 10);
      if (!Number.isFinite(dayIndex)) continue;
      if (weight > bestWeight) {
        bestWeight = weight;
        bestDay = dayIndex;
      }
    }
  }

  if (bestDay != null) return bestDay;

  if (dailyDrivePlans.length === 0) return null;
  return dailyDrivePlans.reduce((worst, day) => {
    const worstLoad = inferDriveLoadTier(worst);
    const dayLoad = inferDriveLoadTier(day);
    const rank: Record<DriveLoadTier, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      EXTREME: 4,
    };
    return rank[dayLoad] > rank[worstLoad] ? day : worst;
  }).dayIndex;
}

export function resolveDegradedRuleResults(
  ruleResults: PlanningRuleResult[],
): PlanningRuleResult | null {
  return ruleResults.find((r) => r.degraded === true) ?? null;
}

export function formatExecutabilityStatusLabel(status: ExecutabilityStatus): string {
  return STATUS_LABEL_FALLBACK[status] ?? status;
}

export type ConfirmExecutabilityConstraintsSummary = {
  allReady: boolean;
  isVersionConfirmed?: boolean;
  isUserConfirmed?: boolean;
  needsReconfirm?: boolean;
};

export function toConfirmExecutabilityConstraintsSummary(
  summary: ConfirmExecutabilityConstraintsSummary | null | undefined,
): ConfirmExecutabilityConstraintsSummary | null {
  if (!summary) return null;
  if (summary.isVersionConfirmed != null) return summary;
  if (summary.needsReconfirm) {
    return {
      ...summary,
      isVersionConfirmed: false,
    };
  }
  return summary;
}

export function canConfirmTripWithExecutability(
  executability: TripExecutabilityView | null | undefined,
  constraintsSummary: ConfirmExecutabilityConstraintsSummary | null | undefined,
): boolean {
  const normalized = toConfirmExecutabilityConstraintsSummary(constraintsSummary);
  if (!executability || !normalized) return false;
  const versionOk =
    normalized.isVersionConfirmed !== false &&
    (normalized.isVersionConfirmed === true || normalized.isUserConfirmed === true);
  return (
    executability.ui.canCommit &&
    normalized.allReady &&
    versionOk
  );
}

export function parseExecutabilityDeepLink(deepLink: string): {
  tab?: string;
  filter?: string;
} {
  const params = new URLSearchParams(deepLink.includes('=') ? deepLink : `tab=${deepLink}`);
  return {
    tab: params.get('tab') ?? undefined,
    filter: params.get('filter') ?? undefined,
  };
}

export interface DayExecutabilityBadgeModel {
  dayIndex: number;
  loadTier: DriveLoadTier | null;
  isVulnerable: boolean;
  flexibleCount: number;
  weatherSensitiveCount: number;
  findingCount: number;
  maxSeverityWeight: number;
}

export function buildDayExecutabilityBadgeModel(
  dayIndex: number,
  exec: TripExecutabilityView,
  vulnerableDayIndex: number | null,
): DayExecutabilityBadgeModel {
  const plan = exec.dailyDrivePlans.find((d) => d.dayIndex === dayIndex);
  const findings = exec.assessment.findings.filter(
    (f) =>
      findingRefsDay(f, dayIndex) ||
      f.affectedRefs.some((ref) => plan && (ref === plan.origin.ref || ref === plan.destination.ref)),
  );
  const maxSeverityWeight = findings.reduce(
    (max, f) => Math.max(max, SEVERITY_WEIGHT[f.severity]),
    0,
  );
  const riskMessages = plan
    ? collectDayRiskMessages(
        plan,
        exec.assessment.findings,
        exec.assessment.ruleResults,
        exec.tepRuleResults,
      )
    : [];
  const loadTier =
    (plan ? extractDriveLoadTierFromMessages(riskMessages) : null) ?? (plan ? inferDriveLoadTier(plan) : null);

  return {
    dayIndex,
    loadTier,
    isVulnerable: vulnerableDayIndex === dayIndex,
    flexibleCount: plan
      ? plan.activities.filter(
          (a) => a.flexibility === 'REMOVABLE' || a.flexibility === 'REPLACEABLE',
        ).length
      : 0,
    weatherSensitiveCount: plan ? plan.activities.filter((a) => a.weatherSensitive).length : 0,
    findingCount: findings.length,
    maxSeverityWeight,
  };
}

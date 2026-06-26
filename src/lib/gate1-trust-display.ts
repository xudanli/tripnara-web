import type {
  Gate1TrustCardSubjectType,
  Gate1TrustConfidenceLevel,
  Gate1TrustDataSourceKind,
} from '@/types/decision-os';

export function gate1TrustConfidenceLabel(level: Gate1TrustConfidenceLevel): string {
  switch (level) {
    case 'HIGH':
      return '高置信';
    case 'MEDIUM':
      return '中置信';
    case 'LOW':
      return '低置信';
    case 'UNKNOWN':
      return '待补充';
  }
}

/** ConfidenceBadge 配色：HIGH green · MEDIUM amber · LOW orange · UNKNOWN gray */
export function trustConfidenceToneClass(level: Gate1TrustConfidenceLevel): string {
  switch (level) {
    case 'HIGH':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100';
    case 'MEDIUM':
      return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100';
    case 'LOW':
      return 'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-100';
    case 'UNKNOWN':
      return 'border-border bg-muted text-muted-foreground';
  }
}

export function parseTrustConfidenceLevel(value: string): Gate1TrustConfidenceLevel {
  const upper = value.toUpperCase();
  if (upper === 'HIGH' || upper === 'MEDIUM' || upper === 'LOW' || upper === 'UNKNOWN') {
    return upper;
  }
  return 'UNKNOWN';
}

export function gate1TrustSubjectTypeLabel(type: Gate1TrustCardSubjectType): string {
  switch (type) {
    case 'CANDIDATE':
      return '候选方案';
    case 'PLAN_B':
      return 'Plan B';
    case 'DECISION':
      return '决策';
  }
}

export function gate1TrustDataSourceKindLabel(kind: Gate1TrustDataSourceKind): string {
  switch (kind) {
    case 'HUMAN_ASSISTED':
      return '人工协助';
    case 'SANITIZED_CONSTRAINT':
      return '脱敏约束';
    case 'CONFLICT_REPORT':
      return '冲突报告';
    case 'READINESS':
      return 'Readiness';
    case 'ADVISOR':
      return '顾问';
    case 'SYSTEM':
      return '系统';
  }
}

export function formatTrustConfidenceScore(score: number | null | undefined): string | null {
  if (score == null) return null;
  return `${Math.round(score * 100)}%`;
}

export function filterParticipantTrustCards<T extends { subjectType: Gate1TrustCardSubjectType }>(
  cards: T[],
): T[] {
  return cards.filter((card) => card.subjectType !== 'DECISION');
}

export function findCandidateTrustCard(
  cards: Array<{ subjectType: Gate1TrustCardSubjectType; subjectId: string }>,
  candidateId: string,
) {
  return cards.find(
    (card) => card.subjectType === 'CANDIDATE' && card.subjectId === candidateId,
  );
}

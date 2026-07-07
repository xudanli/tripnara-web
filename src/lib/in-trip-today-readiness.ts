import type {
  InTripTodayReadiness,
  InTripTodayReadinessEngine,
  InTripTodayReadinessStatus,
} from '@/types/in-trip-execution';

export function isTodayReadinessEngine(
  readiness: InTripTodayReadiness | null | undefined,
): readiness is InTripTodayReadinessEngine {
  return readiness?.source === 'readiness_engine';
}

export function todayReadinessStatusLabel(status: InTripTodayReadinessStatus): string {
  switch (status) {
    case 'block':
      return '不可执行';
    case 'warn':
      return '需关注';
    case 'pass':
      return '可执行';
    default:
      return status;
  }
}

export function todayReadinessStatusClasses(status: InTripTodayReadinessStatus): string {
  switch (status) {
    case 'block':
      return 'text-error bg-muted border-border';
    case 'warn':
      return 'text-amber-800 bg-amber-50 border-amber-200';
    case 'pass':
      return 'text-success bg-muted border-gate-allow-border';
    default:
      return 'text-muted-foreground bg-muted border-border';
  }
}

export function todayReadinessScoreClasses(score: number): string {
  if (score < 70) return 'text-error';
  if (score < 85) return 'text-amber-600';
  return 'text-success';
}

export function todayReadinessBorderClasses(status: InTripTodayReadinessStatus): string {
  switch (status) {
    case 'block':
      return 'border-l-gate-reject-foreground';
    case 'warn':
      return 'border-l-amber-500';
    case 'pass':
      return 'border-l-gate-allow-foreground';
    default:
      return '';
  }
}

export const TODAY_READINESS_DIMENSION_LABELS: Record<string, string> = {
  evidenceCoverage: '证据覆盖',
  scheduleFeasibility: '行程可行',
  transportCertainty: '交通确定性',
  safetyRisk: '安全风险',
};

import type { TripFeasibilityReportDto } from '@/types/trip-feasibility-report';

/** 与后端 computeCanStartExecute 对齐（adapter fallback） */
export function computeCanStartExecute(report: TripFeasibilityReportDto): boolean {
  if (report.canStartExecute != null) return report.canStartExecute;
  if (!report.verifiedAt || report.isStale) return false;
  if (report.verdict.status !== 'EXECUTABLE') return false;
  if (report.summary.mustHandle > 0) return false;
  return true;
}

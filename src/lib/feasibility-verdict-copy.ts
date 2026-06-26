import type { TripFeasibilityReportDto } from '@/types/trip-feasibility-report';

/** 与 FeasibilitySummaryChips 同一套 summary 口径 */
export function buildFeasibilityVerdictSubheadline(
  summary: TripFeasibilityReportDto['summary'],
): string | undefined {
  const parts: string[] = [];
  if (summary.mustHandle > 0) parts.push(`${summary.mustHandle} 项必须处理`);
  if (summary.suggestAdjust > 0) parts.push(`${summary.suggestAdjust} 项建议调整`);
  if (summary.pendingConfirm > 0) parts.push(`${summary.pendingConfirm} 项需确认`);
  if (parts.length === 0) return undefined;
  return `有 ${parts.join('、')}`;
}

/** 后端 subheadline 优先（含 MC 概率文案）；无则回退 summary 拼接 */
export function resolveFeasibilityVerdictSubheadline(
  verdictSubheadline: string | undefined,
  summary: TripFeasibilityReportDto['summary'],
): string | undefined {
  const fromBackend = verdictSubheadline?.trim();
  if (fromBackend) return fromBackend;
  return buildFeasibilityVerdictSubheadline(summary);
}

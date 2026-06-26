import type {
  ReadinessCheckResult,
  RiskWarningsResponse,
  ScoreBreakdownResponse,
} from '@/api/readiness';
import { countNestedFindingItems } from '@/lib/readiness-nested-counts';

export type GateStatus = 'BLOCK' | 'WARN' | 'PASS';
export type GateWarnReason = 'pack_must' | 'coverage_must' | 'low_score' | null;

export interface ReadinessDrawerStats {
  displayBlockers: number;
  displayMust: number;
  /** When true, the must count comes from pack rules (safety/packing), not coverage gaps. */
  mustIsPackSafety: boolean;
  displayShould: number;
  displayRisks: number;
  coverageBlockers: number;
  packMust: number;
}

export function getReadinessDrawerStats(
  readinessResult: ReadinessCheckResult | null | undefined,
  scoreBreakdown: ScoreBreakdownResponse | null | undefined,
  riskWarnings?: RiskWarningsResponse | null,
  options?: { remainingPackMust?: number },
): ReadinessDrawerStats {
  const nested = countNestedFindingItems(readinessResult);
  const coverageBlockers = scoreBreakdown?.summary?.blockers ?? 0;
  const coverageMust =
    scoreBreakdown?.summary?.must ?? scoreBreakdown?.summary?.warnings ?? 0;
  const coverageShould =
    scoreBreakdown?.summary?.should ?? scoreBreakdown?.summary?.suggestions ?? 0;
  const packMust = nested.must;
  const packShould = nested.should;

  const displayRisks =
    riskWarnings != null
      ? riskWarnings.summary?.totalRisks ?? riskWarnings.risks?.length ?? 0
      : (readinessResult?.risks?.length ?? 0) +
        (readinessResult?.findings?.reduce((sum, f) => sum + (f.risks?.length || 0), 0) ?? 0);

  const mustIsPackSafety = packMust > 0;
  const displayMust =
    mustIsPackSafety && options?.remainingPackMust != null
      ? options.remainingPackMust
      : mustIsPackSafety
        ? packMust
        : coverageMust;
  const displayShould = packShould > 0 ? packShould : coverageShould;

  return {
    displayBlockers: coverageBlockers,
    displayMust,
    mustIsPackSafety,
    displayShould,
    displayRisks,
    coverageBlockers,
    packMust,
  };
}

export function computeReadinessGate(
  readinessResult: ReadinessCheckResult | null | undefined,
  scoreBreakdown: ScoreBreakdownResponse | null | undefined,
  options?: { remainingPackMust?: number },
): { status: GateStatus; warnReason: GateWarnReason } {
  const stats = getReadinessDrawerStats(readinessResult, scoreBreakdown, undefined, options);
  const score = scoreBreakdown?.score?.overall;
  const remainingPackMust =
    options?.remainingPackMust ?? stats.packMust;

  if (stats.coverageBlockers > 0) {
    return { status: 'BLOCK', warnReason: null };
  }
  if (remainingPackMust > 0) {
    return { status: 'WARN', warnReason: 'pack_must' };
  }
  if (stats.displayMust > 0) {
    return { status: 'WARN', warnReason: 'coverage_must' };
  }
  if (score !== undefined && score < 70) {
    return { status: 'WARN', warnReason: 'low_score' };
  }
  return { status: 'PASS', warnReason: null };
}

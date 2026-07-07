/**
 * 三 surface 计数对齐（联调 / 开发断言）。
 * problems.meta.openCount ≈ conflicts.summary.total ≈ overview.totalOpenProblemCount
 */

export interface DecisionSurfaceCounts {
  problemsOpenCount?: number;
  conflictsTotal?: number;
  overviewOpenCount?: number;
  /** Timeline BFF stats.conflictCount */
  timelineConflictCount?: number;
  /** 期望 ssot_planning_conflicts */
  timelineConflictCountSource?: string;
}

export interface DecisionSurfaceAlignmentResult {
  aligned: boolean;
  ssotSourceAligned: boolean;
  deltas: {
    problemsVsConflicts: number | null;
    problemsVsOverview: number | null;
    conflictsVsOverview: number | null;
    timelineVsConflicts: number | null;
  };
  message?: string;
}

const DEFAULT_TOLERANCE = 0;

export function assertDecisionSurfaceCountsAligned(
  counts: DecisionSurfaceCounts,
  tolerance = DEFAULT_TOLERANCE,
): DecisionSurfaceAlignmentResult {
  const { problemsOpenCount, conflictsTotal, overviewOpenCount, timelineConflictCount, timelineConflictCountSource } =
    counts;

  const delta = (a?: number, b?: number): number | null => {
    if (a == null || b == null) return null;
    return Math.abs(a - b);
  };

  const problemsVsConflicts = delta(problemsOpenCount, conflictsTotal);
  const problemsVsOverview = delta(problemsOpenCount, overviewOpenCount);
  const conflictsVsOverview = delta(conflictsTotal, overviewOpenCount);
  const timelineVsConflicts = delta(timelineConflictCount, conflictsTotal);

  const within = (d: number | null) => d == null || d <= tolerance;

  const ssotSourceAligned =
    timelineConflictCountSource == null ||
    timelineConflictCount == null ||
    timelineConflictCountSource === 'ssot_planning_conflicts';

  const aligned =
    within(problemsVsConflicts) &&
    within(problemsVsOverview) &&
    within(conflictsVsOverview) &&
    within(timelineVsConflicts) &&
    ssotSourceAligned;

  let message: string | undefined;
  if (!aligned) {
    const parts: string[] = [];
    if (problemsVsConflicts != null && problemsVsConflicts > tolerance) {
      parts.push(`problems(${problemsOpenCount}) vs conflicts(${conflictsTotal}) Δ${problemsVsConflicts}`);
    }
    if (problemsVsOverview != null && problemsVsOverview > tolerance) {
      parts.push(`problems(${problemsOpenCount}) vs overview(${overviewOpenCount}) Δ${problemsVsOverview}`);
    }
    if (conflictsVsOverview != null && conflictsVsOverview > tolerance) {
      parts.push(`conflicts(${conflictsTotal}) vs overview(${overviewOpenCount}) Δ${conflictsVsOverview}`);
    }
    if (timelineVsConflicts != null && timelineVsConflicts > tolerance) {
      parts.push(
        `timeline(${timelineConflictCount}) vs conflicts(${conflictsTotal}) Δ${timelineVsConflicts}`,
      );
    }
    if (!ssotSourceAligned) {
      parts.push(
        `timeline.conflictCountSource=${timelineConflictCountSource ?? 'unknown'}（期望 ssot_planning_conflicts）`,
      );
    }
    message = parts.join('; ');
  }

  return {
    aligned,
    ssotSourceAligned,
    deltas: { problemsVsConflicts, problemsVsOverview, conflictsVsOverview, timelineVsConflicts },
    message,
  };
}

/** F208 等路线实体应在 problems + conflicts 同时出现（联调断言） */
export function assertEntityInBothSurfaces(
  entityRef: string,
  problems: Array<{ semanticKey?: string; instanceKey?: string; title?: string }>,
  conflicts: Array<{ semanticKey?: string; title?: string; message?: string }>,
): boolean {
  const needle = entityRef.trim().toUpperCase();
  if (!needle) return true;

  const haystack = (parts: (string | undefined)[]) =>
    parts.some((p) => (p ?? '').toUpperCase().includes(needle));

  const inProblems = problems.some((p) =>
    haystack([p.semanticKey, p.instanceKey, p.title]),
  );
  const inConflicts = conflicts.some((c) =>
    haystack([c.semanticKey, c.title, c.message]),
  );

  return inProblems === inConflicts;
}

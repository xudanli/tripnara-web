import type { DecisionProblemSummary } from '@/types/decision-problem';

/** 1-based day number → 该天关联的 OPEN 决策问题 */
export function openDecisionProblemsByDay(
  items: DecisionProblemSummary[] | null | undefined,
): Map<number, DecisionProblemSummary[]> {
  const map = new Map<number, DecisionProblemSummary[]>();
  if (!items?.length) return map;

  for (const item of items) {
    if (item.status === 'RESOLVED' || item.status === 'DISMISSED') continue;
    const days = item.affectedDayNumbers?.length
      ? item.affectedDayNumbers
      : parseDayNumbersFromTitle(item.title);
    for (const day of days) {
      const list = map.get(day) ?? [];
      list.push(item);
      map.set(day, list);
    }
  }
  return map;
}

function parseDayNumbersFromTitle(title: string): number[] {
  const match = title.match(/第(\d+)天/);
  if (!match) return [];
  const day = Number(match[1]);
  return Number.isFinite(day) ? [day] : [];
}

/** 0-based day index → problems */
export function openDecisionProblemsForDayIndex(
  items: DecisionProblemSummary[] | null | undefined,
  dayIndex: number,
): DecisionProblemSummary[] {
  return openDecisionProblemsByDay(items).get(dayIndex + 1) ?? [];
}

export function dayIndexesWithOpenDecisionProblems(
  items: DecisionProblemSummary[] | null | undefined,
): Set<number> {
  const set = new Set<number>();
  for (const day of openDecisionProblemsByDay(items).keys()) {
    set.add(day - 1);
  }
  return set;
}

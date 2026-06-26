import type {
  FeasibilityDayStatusDto,
  FeasibilityIssueDto,
} from '@/types/trip-feasibility-report';

/** 从 issue 文案解析「第 N 天」 */
export function parseDayNumberFromIssueMessage(message?: string | null): number | undefined {
  if (!message) return undefined;
  const match = message.match(/第\s*(\d+)\s*天/);
  if (!match) return undefined;
  const day = Number(match[1]);
  return Number.isFinite(day) && day > 0 ? day : undefined;
}

/**
 * 统一 issue → 天序号（1-based）。
 * 优先 dayTimeline 归属，再 affectedDays / 文案 / deepLink / anchors。
 */
export function resolveFeasibilityIssueDayNumber(
  issue: FeasibilityIssueDto,
  dayTimeline?: FeasibilityDayStatusDto[],
): number | undefined {
  const fromTimeline = dayTimeline?.find((day) => day.issueIds.includes(issue.id))?.dayNumber;
  if (fromTimeline != null) return fromTimeline;

  const fromAffected = issue.affectedDays?.find((day) => day > 0);
  if (fromAffected != null) return fromAffected;

  const fromMessage =
    parseDayNumberFromIssueMessage(issue.message) ??
    parseDayNumberFromIssueMessage(issue.title);
  if (fromMessage != null) return fromMessage;

  const deepLinkDay = issue.uiHints?.deepLink?.dayIndex;
  if (deepLinkDay != null && deepLinkDay >= 0) return deepLinkDay + 1;

  const anchorDay = issue.anchors?.fromDayNumber ?? issue.anchors?.toDayNumber;
  if (anchorDay != null && anchorDay > 0) return anchorDay;

  return undefined;
}

/** 某 issue 可能关联多天（跨天路段等） */
export function resolveFeasibilityIssueDayNumbers(
  issue: FeasibilityIssueDto,
  dayTimeline?: FeasibilityDayStatusDto[],
): number[] {
  const days = new Set<number>();

  for (const day of dayTimeline ?? []) {
    if (day.issueIds.includes(issue.id)) days.add(day.dayNumber);
  }

  for (const day of issue.affectedDays ?? []) {
    if (day > 0) days.add(day);
  }

  const parsed =
    parseDayNumberFromIssueMessage(issue.message) ??
    parseDayNumberFromIssueMessage(issue.title);
  if (parsed != null) days.add(parsed);

  if (issue.anchors?.fromDayNumber) days.add(issue.anchors.fromDayNumber);
  if (issue.anchors?.toDayNumber) days.add(issue.anchors.toDayNumber);

  const deepLinkDay = issue.uiHints?.deepLink?.dayIndex;
  if (deepLinkDay != null && deepLinkDay >= 0) days.add(deepLinkDay + 1);

  return [...days].sort((a, b) => a - b);
}

/**
 * 将 issues 挂回 dayTimeline，修复后端 affectedDays / issueIds 不一致。
 */
export function reconcileFeasibilityDayTimeline(
  dayTimeline: FeasibilityDayStatusDto[],
  issues: FeasibilityIssueDto[],
): FeasibilityDayStatusDto[] {
  const dayMap = new Map<number, FeasibilityDayStatusDto>();

  for (const day of dayTimeline) {
    dayMap.set(day.dayNumber, { ...day, issueIds: [...day.issueIds] });
  }

  const maxDay = Math.max(
    0,
    ...dayTimeline.map((d) => d.dayNumber),
    ...issues.flatMap((i) => resolveFeasibilityIssueDayNumbers(i, dayTimeline)),
  );

  for (const issue of issues) {
    const dayNumbers = resolveFeasibilityIssueDayNumbers(issue, dayTimeline);
    const targets = dayNumbers.length > 0 ? dayNumbers : maxDay > 0 ? [1] : [];

    for (const dayNumber of targets) {
      const existing =
        dayMap.get(dayNumber) ??
        ({
          dayNumber,
          status: 'warning' as const,
          issueIds: [],
        } satisfies FeasibilityDayStatusDto);

      if (!existing.issueIds.includes(issue.id)) {
        existing.issueIds.push(issue.id);
      }
      dayMap.set(dayNumber, existing);
    }
  }

  return [...dayMap.values()]
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => {
      const dayIssues = day.issueIds
        .map((id) => issues.find((item) => item.id === id))
        .filter((item): item is FeasibilityIssueDto => item != null);
      const hasBlocker = dayIssues.some((item) => item.priority === 'must_handle');
      const hasWarn = dayIssues.some((item) => item.priority === 'suggest_adjust');
      return {
        ...day,
        status: hasBlocker ? 'blocked' : hasWarn ? 'warning' : day.status,
      };
    });
}

export function resolveFeasibilityIssueDayLabel(
  issue: FeasibilityIssueDto,
  dayTimeline?: FeasibilityDayStatusDto[],
): string | null {
  const day = resolveFeasibilityIssueDayNumber(issue, dayTimeline);
  return day != null ? `第 ${day} 天` : null;
}

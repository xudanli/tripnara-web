import type { DecisionProblemSummary } from '@/types/decision-problem';
import {
  extractRouteContextFromTitle,
  inferDecisionProblemScope,
  type QueueDisplayDecisionProblem,
} from '@/lib/decision-problem-queue-context.util';
import { textsSubstantiallyOverlap } from '@/lib/text-dedupe.util';

const DAY_TITLE_PREFIX_RE = /^第\s*(\d+)\s*天\s*[·・:：\-—]?\s*(.*)$/u;
const LUNCH_LATE_TITLE_RE = /^预计\s*(.+?)\s*结束于.+[，,]?\s*晚于午餐窗/u;
const LONG_QUEUE_TITLE_LEN = 36;

export interface DecisionProblemQueueDisplay {
  dayNumbers: number[];
  dayBadge: string | null;
  issueTitle: string;
  contextLine: string | null;
}

function uniqueSortedDays(days: number[]): number[] {
  return [...new Set(days.filter((day) => Number.isFinite(day) && day > 0))].sort((a, b) => a - b);
}

function formatDayBadge(dayNumbers: number[]): string | null {
  if (dayNumbers.length === 0) return null;
  if (dayNumbers.length === 1) return `第 ${dayNumbers[0]} 天`;
  return `第 ${dayNumbers.join('、')} 天`;
}

function isDayOnlyScope(text: string, dayNumbers: number[]): boolean {
  const trimmed = text.trim();
  if (/^第\s*\d+\s*天$/u.test(trimmed)) return true;
  if (dayNumbers.length === 1) {
    return trimmed === `Day ${dayNumbers[0]}` || trimmed === `第${dayNumbers[0]}天`;
  }
  return false;
}

function stripDayPrefixFromContext(text: string, dayNumbers: number[]): string {
  let value = text.trim();
  for (const day of dayNumbers) {
    value = value
      .replace(new RegExp(`^第\\s*${day}\\s*天\\s*[·・:：\\-—]?\\s*`, 'u'), '')
      .replace(new RegExp(`^Day\\s*${day}\\s*[·・:：\\-—]?\\s*`, 'iu'), '')
      .trim();
  }
  return value;
}

/** 后端把诊断句塞进 title 时，队列行改用短标题 + POI/路线副文案 */
function shortenQueueIssueTitle(
  issueTitle: string,
  contextLine: string | null,
  queueCategoryLabel?: string,
): { issueTitle: string; contextLine: string | null } {
  const trimmed = issueTitle.trim();
  if (!trimmed) return { issueTitle, contextLine };

  const lunchMatch = trimmed.match(LUNCH_LATE_TITLE_RE);
  if (lunchMatch) {
    const poi = lunchMatch[1]?.trim();
    const poiContext = poi && contextLine !== poi ? poi : contextLine ?? poi ?? null;
    return {
      issueTitle: '午餐窗冲突',
      contextLine: poiContext,
    };
  }

  if (trimmed.length > LONG_QUEUE_TITLE_LEN) {
    const routeContext = extractRouteContextFromTitle(trimmed);
    const shortTitle =
      queueCategoryLabel === '日程'
        ? '行程时间冲突'
        : queueCategoryLabel === '交通'
          ? '交通缓冲偏紧'
          : queueCategoryLabel ?? '需调整';
    return {
      issueTitle: shortTitle,
      contextLine: contextLine ?? routeContext ?? trimmed,
    };
  }

  return { issueTitle: trimmed, contextLine };
}

/** 决策队列卡片 · 拆分天次 / 标题 / 补充说明，避免重复标题难以区分 */
export function resolveDecisionProblemQueueDisplay(
  item: DecisionProblemSummary & {
    queueCategoryLabel?: string;
    categoryLabel?: string;
  },
): DecisionProblemQueueDisplay {
  const categoryLabel = item.categoryLabel?.trim() || item.queueCategoryLabel?.trim();
  const enriched = inferDecisionProblemScope(item);
  const rawTitle = item.title.trim();
  const titleMatch = rawTitle.match(DAY_TITLE_PREFIX_RE);

  let issueTitle = rawTitle;
  const dayNumbers = uniqueSortedDays([
    ...(enriched.affectedDayNumbers ?? []),
    ...(item.affectedDayNumbers ?? []),
  ]);

  if (titleMatch) {
    const dayFromTitle = Number(titleMatch[1]);
    if (Number.isFinite(dayFromTitle) && dayFromTitle > 0 && !dayNumbers.includes(dayFromTitle)) {
      dayNumbers.push(dayFromTitle);
    }
    dayNumbers.sort((a, b) => a - b);
    const remainder = titleMatch[2]?.trim();
    if (remainder) issueTitle = remainder;
  }

  const scopeCandidates = [
    enriched.affectedScopeSummary,
    item.affectedScopeSummary,
    item.impactScopeHeadline,
  ]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];

  let contextLine: string | null = null;
  for (const candidate of scopeCandidates) {
    if (isDayOnlyScope(candidate, dayNumbers)) continue;
    const stripped = stripDayPrefixFromContext(candidate, dayNumbers);
    if (stripped && stripped !== issueTitle) {
      contextLine = stripped;
      break;
    }
  }

  const shortened = shortenQueueIssueTitle(
    issueTitle || rawTitle,
    contextLine,
    categoryLabel,
  );

  let resolvedContextLine = shortened.contextLine;
  const causalHeadline = item.causalStoryHeadline?.trim();
  const guardianHeadline = item.guardianCausalHeadline?.trim();
  const redundantRefs = [shortened.issueTitle, causalHeadline, guardianHeadline].filter(Boolean);

  if (
    resolvedContextLine &&
    redundantRefs.some((ref) => textsSubstantiallyOverlap(resolvedContextLine, ref))
  ) {
    const routeOnly =
      extractRouteContextFromTitle(causalHeadline ?? resolvedContextLine) ??
      extractRouteContextFromTitle(guardianHeadline ?? '');
    resolvedContextLine =
      routeOnly &&
      !redundantRefs.some((ref) => textsSubstantiallyOverlap(routeOnly, ref)) &&
      !textsSubstantiallyOverlap(routeOnly, shortened.issueTitle)
        ? routeOnly
        : null;
  }

  return {
    dayNumbers,
    dayBadge: formatDayBadge(dayNumbers),
    issueTitle: shortened.issueTitle,
    contextLine: resolvedContextLine,
  };
}

function enforcementSortScore(item: DecisionProblemSummary): number {
  switch (item.primaryEnforcement) {
    case 'BLOCK':
      return 0;
    case 'REQUIRE_ADJUSTMENT':
      return 1;
    case 'REQUIRE_CONFIRMATION':
      return 2;
    case 'WARN':
      return 3;
    case 'ADVISE':
      return 4;
    default:
      return 5;
  }
}

function workflowSortScore(item: DecisionProblemSummary): number {
  const workflow = String(item.workflowStatus ?? item.status ?? '')
    .trim()
    .toUpperCase();
  if (workflow === 'WAITING_DECISION') return 0;
  if (workflow.includes('BLOCK')) return 1;
  return 2;
}

/** 队列排序：enforcement 优先 → 天次 → 待决策工作流 */
export function compareDecisionProblemsForQueue(
  a: DecisionProblemSummary,
  b: DecisionProblemSummary,
): number {
  const enforcementDiff = enforcementSortScore(a) - enforcementSortScore(b);
  if (enforcementDiff !== 0) return enforcementDiff;

  const dayA = resolveDecisionProblemQueueDisplay(a).dayNumbers[0] ?? 999;
  const dayB = resolveDecisionProblemQueueDisplay(b).dayNumbers[0] ?? 999;
  if (dayA !== dayB) return dayA - dayB;

  const workflowDiff = workflowSortScore(a) - workflowSortScore(b);
  if (workflowDiff !== 0) return workflowDiff;

  return a.title.localeCompare(b.title, 'zh');
}

/** 左栏队列行副文案：第 N 天 · 分类 */
export function formatQueueRowContextLine(item: QueueDisplayDecisionProblem): string | null {
  const display = resolveDecisionProblemQueueDisplay(item);
  const parts = [display.dayBadge, item.queueCategoryLabel?.trim()].filter(Boolean) as string[];
  return parts.length ? parts.join(' · ') : null;
}

export interface QueueDayGroup {
  day: number | null;
  items: QueueDisplayDecisionProblem[];
}

/** 问题 > 5 且同日 ≥ 2 时轻分组；否则扁平列表 */
export function groupQueueProblemsByDay(
  items: QueueDisplayDecisionProblem[],
): QueueDayGroup[] {
  if (items.length <= 5) {
    return [{ day: null, items }];
  }

  const buckets = new Map<number, QueueDisplayDecisionProblem[]>();
  const ungrouped: QueueDisplayDecisionProblem[] = [];

  for (const item of items) {
    const day = resolveDecisionProblemQueueDisplay(item).dayNumbers[0];
    if (day == null || day >= 999) {
      ungrouped.push(item);
      continue;
    }
    const bucket = buckets.get(day) ?? [];
    bucket.push(item);
    buckets.set(day, bucket);
  }

  const groups: QueueDayGroup[] = [...buckets.entries()]
    .sort(([dayA], [dayB]) => dayA - dayB)
    .map(([day, bucketItems]) =>
      bucketItems.length >= 2
        ? { day, items: bucketItems }
        : { day: null, items: bucketItems },
    );

  if (ungrouped.length) {
    groups.push({ day: null, items: ungrouped });
  }

  if (groups.every((group) => group.day == null)) {
    return [{ day: null, items }];
  }

  return groups;
}

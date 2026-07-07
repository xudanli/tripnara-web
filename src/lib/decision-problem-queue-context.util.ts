import type { ImpactScopeView } from '@/types/impact-scope';
import {
  arrangementDisplayLabel,
  resolveImpactScopeDays,
} from '@/lib/impact-scope-i18n.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';

const GENERIC_BUFFER_TITLES = new Set([
  '交通缓冲偏紧',
  '转场缓冲偏紧',
  '缓冲偏紧',
  '转场缓冲不足',
  '交通缓冲不足',
]);

const DAY_IN_TEXT_RE = /第\s*(\d+)\s*天/gu;
const ROUTE_ARROW_RE = /([^→\n]{1,40}(?:→|->)[^→\n：:（(]{1,40})/u;
const BUFFER_TITLE_SUFFIX_RE = /(?:交通缓冲|转场缓冲)\s*[·・:：\-—]\s*(.+)$/u;
const POI_END_TIME_RE = /预计\s*[「"']?([^」"'\s]+)[」"']?\s*结束于/u;

function uniqueSortedDays(days: number[]): number[] {
  return [...new Set(days.filter((d) => Number.isFinite(d) && d > 0))].sort((a, b) => a - b);
}

function parseDaysFromText(text: string): number[] {
  const days: number[] = [];
  for (const match of text.matchAll(DAY_IN_TEXT_RE)) {
    const day = Number(match[1]);
    if (Number.isFinite(day) && day > 0) days.push(day);
  }
  const dayMatch = text.match(/[：:]_?day[_-]?(\d+)/i);
  if (dayMatch) {
    const day = Number(dayMatch[1]);
    if (Number.isFinite(day) && day > 0) days.push(day);
  }
  for (const match of text.matchAll(/(?:^|[^a-z0-9])day[_-]?(\d+)(?:$|[^0-9])/gi)) {
    const day = Number(match[1]);
    if (Number.isFinite(day) && day > 0) days.push(day);
  }
  return uniqueSortedDays(days);
}

function normalizeRouteFragment(text: string): string {
  return text
    .replace(/第\s*\d+\s*天\s*[·・:：\-—]?\s*/u, '')
    .replace(/[（(][^)）]*[)）]/gu, '')
    .replace(/[：:].*$/u, '')
    .replace(/\s*(→|->)\s*/g, ' → ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractRouteContextFromTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return null;

  const bufferSuffix = trimmed.match(BUFFER_TITLE_SUFFIX_RE);
  if (bufferSuffix?.[1]) {
    const route = normalizeRouteFragment(bufferSuffix[1]);
    if (route && !GENERIC_BUFFER_TITLES.has(route)) return route;
  }

  const poiMatch = trimmed.match(POI_END_TIME_RE);
  if (poiMatch?.[1]) return poiMatch[1].trim();

  const routeMatch = trimmed.match(ROUTE_ARROW_RE);
  if (routeMatch?.[1]) {
    const route = normalizeRouteFragment(routeMatch[1]);
    if (route.length >= 3) return route;
  }

  return null;
}

export function extractContextFromImpactScopeView(
  view: ImpactScopeView | null | undefined,
): { dayNumbers: number[]; contextLine: string | null } {
  if (!view) return { dayNumbers: [], contextLine: null };

  const dayNumbers = resolveImpactScopeDays(view);
  const arrangementLabels = (view.arrangements ?? [])
    .map(arrangementDisplayLabel)
    .filter(Boolean);

  if (arrangementLabels.length >= 2) {
    return {
      dayNumbers,
      contextLine: arrangementLabels.slice(0, 3).join(' → '),
    };
  }
  if (arrangementLabels.length === 1) {
    return { dayNumbers, contextLine: arrangementLabels[0]! };
  }

  const params = view.narrative?.params ?? view.detailNarrative?.params;
  if (params && typeof params === 'object') {
    const record = params as Record<string, unknown>;
    const labelList = Array.isArray(record.arrangementLabels)
      ? record.arrangementLabels.filter((v): v is string => typeof v === 'string' && v.trim())
      : [];
    if (labelList.length >= 2) {
      return { dayNumbers, contextLine: labelList.slice(0, 3).join(' → ') };
    }
    if (labelList.length === 1) {
      return { dayNumbers, contextLine: labelList[0]!.trim() };
    }

    const from = [record.fromLabel, record.fromName, record.originLabel, record.fromPlaceLabel]
      .find((v): v is string => typeof v === 'string' && v.trim())
      ?.trim();
    const to = [record.toLabel, record.toName, record.destinationLabel, record.toPlaceLabel]
      .find((v): v is string => typeof v === 'string' && v.trim())
      ?.trim();
    if (from && to) {
      return { dayNumbers, contextLine: `${from} → ${to}` };
    }

    const activity = [record.activityLabel, record.poiName, record.subjectLabel, record.placeName]
      .find((v): v is string => typeof v === 'string' && v.trim())
      ?.trim();
    if (activity) {
      return { dayNumbers, contextLine: activity };
    }
  }

  const triggerDetail = view.trigger?.detail?.trim() || view.trigger?.label?.trim();
  if (triggerDetail) {
    return { dayNumbers, contextLine: triggerDetail };
  }

  return { dayNumbers, contextLine: null };
}

export function extractContextFromConflictMessage(message: string): {
  dayNumbers: number[];
  contextLine: string | null;
} {
  const trimmed = message.trim();
  if (!trimmed) return { dayNumbers: [], contextLine: null };

  const dayNumbers = parseDaysFromText(trimmed);
  const routeFromTitle = extractRouteContextFromTitle(trimmed);
  if (routeFromTitle) {
    return { dayNumbers, contextLine: routeFromTitle };
  }

  const colonParts = trimmed.split(/[：:]/u);
  if (colonParts.length >= 2) {
    const head = colonParts[0]?.trim();
    if (head && head.length >= 3 && head.length <= 48) {
      return { dayNumbers, contextLine: normalizeRouteFragment(head) };
    }
  }

  return { dayNumbers, contextLine: null };
}

export function isGenericTravelBufferTitle(title: string): boolean {
  const trimmed = title.trim();
  return GENERIC_BUFFER_TITLES.has(trimmed) || /^交通缓冲偏紧$/u.test(trimmed);
}

export interface EnrichedDecisionProblemScope {
  affectedDayNumbers?: number[];
  affectedScopeSummary?: string;
}

/** 从 problem 自身字段 + impactScope 推断队列展示用的天次/上下文 */
export function inferDecisionProblemScope(
  problem: DecisionProblemSummary,
): EnrichedDecisionProblemScope {
  const dayNumbers = uniqueSortedDays([
    ...(problem.affectedDayNumbers ?? []),
    ...(problem.scope?.dayIds ?? []),
    ...(problem.scope?.affectedDays ?? []),
  ]);
  let contextLine = problem.affectedScopeSummary?.trim() || problem.impactScopeHeadline?.trim() || null;

  if (problem.impactScopeView) {
    const fromImpact = extractContextFromImpactScopeView(problem.impactScopeView);
    for (const day of fromImpact.dayNumbers) {
      if (!dayNumbers.includes(day)) dayNumbers.push(day);
    }
    dayNumbers.sort((a, b) => a - b);
    if (!contextLine && fromImpact.contextLine) contextLine = fromImpact.contextLine;
  }

  if (!contextLine) {
    contextLine = extractRouteContextFromTitle(problem.title);
  }

  if (!dayNumbers.length) {
    dayNumbers.push(...parseDaysFromText(problem.title));
    dayNumbers.push(...parseDaysFromText(problem.id));
    if (problem.semanticKey) {
      dayNumbers.push(...parseDaysFromText(problem.semanticKey));
    }
    if (problem.description) {
      dayNumbers.push(...parseDaysFromText(problem.description));
    }
    dayNumbers.sort((a, b) => a - b);
  }

  const scopeSummary =
    contextLine && !isDayOnlyScopeSummary(contextLine, dayNumbers)
      ? stripDayPrefixFromScope(contextLine, dayNumbers)
      : null;

  return {
    affectedDayNumbers: dayNumbers.length ? dayNumbers : undefined,
    affectedScopeSummary: scopeSummary ?? undefined,
  };
}

function isDayOnlyScopeSummary(text: string, dayNumbers: number[]): boolean {
  const trimmed = text.trim();
  if (/^第\s*\d+\s*天$/u.test(trimmed)) return true;
  if (dayNumbers.length === 1) {
    return trimmed === `Day ${dayNumbers[0]}` || trimmed === `第${dayNumbers[0]}天`;
  }
  return false;
}

function stripDayPrefixFromScope(text: string, dayNumbers: number[]): string {
  let value = text.trim();
  for (const day of dayNumbers) {
    value = value
      .replace(new RegExp(`^第\\s*${day}\\s*天\\s*[·・:：\\-—]?\\s*`, 'u'), '')
      .replace(new RegExp(`^Day\\s*${day}\\s*[·・:：\\-—]?\\s*`, 'iu'), '')
      .trim();
  }
  return value;
}

const LUNCH_LATE_TITLE_RE = /^预计\s*.+\s*结束于.+[，,]?\s*晚于午餐窗/u;
const LONG_QUEUE_TITLE_LEN = 36;

/** 决策 problem.title 被写成完整诊断句（非队列短标题） */
export function isDiagnosticQueueTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return false;
  if (LUNCH_LATE_TITLE_RE.test(trimmed)) return true;
  if (/^预计\s+.+\s*结束于/u.test(trimmed)) return true;
  return trimmed.length > LONG_QUEUE_TITLE_LEN;
}

/** 左栏队列行 — decision-problems SSOT 投影（不再 merge planning-conflicts） */
export interface QueueDisplayDecisionProblem extends DecisionProblemSummary {
  /** @deprecated 使用 categoryLabel */
  queueCategoryLabel?: string;
}

/** GET decision-problems → 左栏队列展示模型（仅别名 categoryLabel） */
export function mapDecisionProblemsForQueueDisplay(
  problems: DecisionProblemSummary[],
): QueueDisplayDecisionProblem[] {
  if (!problems.length) return problems;

  return problems.map((problem) => {
    const categoryLabel = problem.categoryLabel?.trim();
    if (!categoryLabel) return problem;
    return { ...problem, queueCategoryLabel: categoryLabel };
  });
}

/**
 * @deprecated Gateway v2 列表已自带 queue 字段；请用 mapDecisionProblemsForQueueDisplay
 */
export function enrichDecisionProblemsForQueueDisplay(
  problems: DecisionProblemSummary[],
  _conflicts?: PlanningConflictItem[],
): QueueDisplayDecisionProblem[] {
  return mapDecisionProblemsForQueueDisplay(problems);
}

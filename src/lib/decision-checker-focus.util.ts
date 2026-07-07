import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import { summarizePlanningConflicts } from '@/lib/planning-conflicts.util';
import { openDecisionProblemsForDayIndex } from '@/lib/decision-problems-by-day.util';
import {
  resolveConflictForDecisionProblem,
  resolveDecisionProblemForConflict,
} from '@/lib/planning-conflicts-decision.util';
import { resolveDecisionProblemDescription, mapDecisionOptionsToCheckerScenarios } from '@/lib/decision-problem-display.util';
import type { DecisionCheckerPlanningInterim } from '@/lib/decision-checker-interim.util';
import type { PlanningConflictSummary } from '@/lib/planning-conflicts.util';
import type {
  DecisionOption,
  DecisionProblemDetail,
  DecisionProblemSummary,
} from '@/types/decision-problem';
import type {
  DecisionCheckerResponse,
  DecisionCheckerScenarioDto,
  DecisionCheckerEvidenceDto,
  DecisionCheckerEvidenceItemDto,
  DecisionCheckerImpactDto,
} from '@/types/decision-checker';

export interface DecisionSpaceFocusContext {
  conflict?: PlanningConflictItem | null;
  problem?: DecisionProblemSummary | null;
  problemDetail?: DecisionProblemDetail | null;
  problemOptions?: DecisionOption[];
  /** 工作台按天联动：0-based，展示当天全部证据/影响 */
  scheduleDayIndex?: number;
  scheduleDayProblems?: DecisionProblemSummary[];
  scheduleDayConflicts?: PlanningConflictItem[];
  /** 中栏当日冲突行 / 时间轴 POI 等补充关键词 */
  scheduleDayExtraTokens?: string[];
  /** 中栏当日时间轴 POI 展示名（用于补齐 BFF 未投影的证据） */
  scheduleDayTimelinePois?: string[];
}

export interface DecisionCheckerFocusTokens {
  titleTokens: string[];
  dayNumbers: number[];
  refIds: Set<string>;
}

export interface WorkbenchScheduleDayFocus {
  conflict: PlanningConflictItem | null;
  problem: DecisionProblemSummary | null;
  dayIndex: number;
  dayProblems: DecisionProblemSummary[];
  dayConflicts: PlanningConflictItem[];
}

/** 冲突/问题是否关联指定天（1-based day number） */
export function planningConflictAffectsDay(
  item: PlanningConflictItem,
  dayNumber: number,
): boolean {
  const days = item.affectedDays ?? item.issue?.affectedDays;
  if (days?.includes(dayNumber)) return true;
  const haystack = `${item.title ?? ''} ${item.message ?? ''}`;
  return (
    haystack.includes(`第 ${dayNumber} 天`) ||
    haystack.includes(`第${dayNumber}天`) ||
    haystack.includes(`Day ${dayNumber}`)
  );
}

/** 工作台 · 按中栏选中天解析决策检查器焦点 */
export function resolveWorkbenchFocusForScheduleDay(input: {
  dayIndex: number;
  conflicts: PlanningConflictItem[];
  decisionProblems?: DecisionProblemSummary[];
}): WorkbenchScheduleDayFocus {
  const { dayIndex, conflicts, decisionProblems } = input;
  const dayNumber = dayIndex + 1;
  const problems = decisionProblems ?? [];
  const dayProblems = openDecisionProblemsForDayIndex(problems, dayIndex);
  const primaryProblem = dayProblems[0] ?? null;

  const dayConflicts = conflicts.filter((item) => planningConflictAffectsDay(item, dayNumber));
  const conflict =
    dayConflicts.find((item) => item.priority === 'must_handle') ??
    (primaryProblem
      ? resolveConflictForDecisionProblem(primaryProblem, conflicts) ?? null
      : null) ??
    dayConflicts.find((item) => item.priority === 'suggest_adjust') ??
    dayConflicts[0] ??
    null;

  const problem =
    primaryProblem ??
    (conflict ? resolveDecisionProblemForConflict(conflict, problems) ?? null : null);

  return { conflict, problem, dayIndex, dayProblems, dayConflicts };
}

/**
 * BFF decision-checker 投影焦点：按选中天传 focusConflictId，否则默认 Day 1 poi-access。
 * issue-gap 序号不等于日历天（如第 5 天可能是 issue-gap-4）；取当日首个 issue-gap-*。
 */
export function resolveDecisionCheckerFocusConflictIdForDay(
  conflicts: PlanningConflictItem[],
  dayNumber: number,
): string | null {
  const dayConflicts = conflicts.filter((item) => planningConflictAffectsDay(item, dayNumber));
  if (!dayConflicts.length) return null;

  const gapConflicts = dayConflicts
    .filter((item) => item.id.startsWith('issue-gap-'))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (gapConflicts.length > 0) {
    return gapConflicts[0]!.id;
  }

  const picked =
    dayConflicts.find((item) => item.priority === 'must_handle') ??
    dayConflicts.find((item) => item.priority === 'suggest_adjust') ??
    dayConflicts[0];

  return picked?.id ?? null;
}

/** BFF 已按当日 conflict 投影 evidence（focusConflictId 属于当日冲突集） */
export function isDecisionCheckerBackendFocusedForScheduleDay(
  data: Pick<DecisionCheckerResponse, 'focusConflictId'> | null | undefined,
  dayNumber: number,
  dayConflicts: PlanningConflictItem[],
): boolean {
  const focusId = data?.focusConflictId?.trim();
  if (!focusId) return false;
  return dayConflicts.some((item) => item.id === focusId);
}

/** 去掉【攻略调整】等展示前缀，便于 POI 名匹配 */
export function stripDecisionCheckerDisplayPrefixes(text: string): string {
  return text.replace(/^[\[【][^\]】]+[\]】]\s*/g, '').trim();
}

/** 从冲突行 / 时间轴 / 问题标题提取 POI 与描述关键词（中英文括号、路由段） */
export function extractDecisionCheckerPoiTokens(raw?: string | null): string[] {
  const text = stripDecisionCheckerDisplayPrefixes(raw?.trim() ?? '');
  if (!text) return [];

  const tokens = new Set<string>();
  const segments = text.split(/·|->|→|—|→|,/);

  for (const segment of segments) {
    const part = segment.trim();
    if (!part || part.length < 2) continue;
    if (/^第\s?\d+\s?天/.test(part)) continue;

    tokens.add(part);

    const beforeParen = part.split(/[（(]/)[0]?.trim();
    if (beforeParen && beforeParen.length >= 2 && beforeParen !== part) {
      tokens.add(beforeParen);
    }

    const inParen = part.match(/[（(]([^）)]+)[）)]/)?.[1]?.trim();
    if (inParen && inParen.length >= 2) tokens.add(inParen);

    const beforeColon = part.split(/：|:/)[0]?.trim();
    if (
      beforeColon &&
      beforeColon.length >= 2 &&
      beforeColon !== part &&
      !/^第\s?\d+\s?天/.test(beforeColon)
    ) {
      tokens.add(beforeColon);
    }
  }

  if (text.length >= 2 && !/^第\s?\d+\s?天/.test(text)) {
    tokens.add(text);
  }

  return [...tokens];
}

function expandTokenMatchVariants(token: string): string[] {
  const variants = [token];
  const short = token.split(/：|:/)[0]?.trim();
  if (short && short !== token) variants.push(short);
  return variants;
}

function extractDayNumbersFromHaystack(haystack: string): number[] {
  const days = new Set<number>();
  const patterns = [/第\s*(\d+)\s*天/g, /day\s*(\d+)/gi];
  for (const pattern of patterns) {
    for (const match of haystack.matchAll(pattern)) {
      const day = Number(match[1]);
      if (Number.isFinite(day) && day > 0) days.add(day);
    }
  }
  return [...days];
}

/** 从当前决策问题提取证据/影响过滤关键词 */
export function buildDecisionCheckerFocusTokens(
  focus: DecisionSpaceFocusContext,
): DecisionCheckerFocusTokens {
  const titleTokens = new Set<string>();
  const dayNumbers = new Set<number>();
  const refIds = new Set<string>();

  const addTitleToken = (raw?: string | null) => {
    for (const token of extractDecisionCheckerPoiTokens(raw)) {
      titleTokens.add(token);
    }
  };

  const addDay = (value?: number | null) => {
    if (value != null && Number.isFinite(value) && value > 0) dayNumbers.add(value);
  };

  addTitleToken(focus.problem?.title);
  addTitleToken(focus.conflict?.title);
  addTitleToken(focus.problem?.affectedScopeSummary);
  addTitleToken(focus.conflict?.message);

  if (focus.scheduleDayIndex != null) {
    addDay(focus.scheduleDayIndex + 1);
  }
  for (const problem of focus.scheduleDayProblems ?? []) {
    addTitleToken(problem.title);
    addTitleToken(problem.affectedScopeSummary);
    for (const day of problem.affectedDayNumbers ?? []) addDay(day);
    if (problem.id) refIds.add(problem.id);
    for (const ref of problem.sourceRefs ?? []) {
      if (ref.refId?.trim()) refIds.add(ref.refId.trim());
    }
  }
  for (const conflict of focus.scheduleDayConflicts ?? []) {
    addTitleToken(conflict.title);
    addTitleToken(conflict.message);
    for (const day of conflict.affectedDays ?? []) addDay(day);
    for (const day of conflict.issue?.affectedDays ?? []) addDay(day);
    if (conflict.id) refIds.add(conflict.id);
    if (conflict.issue?.id) refIds.add(conflict.issue.id);
  }
  for (const extra of focus.scheduleDayExtraTokens ?? []) {
    addTitleToken(extra);
  }
  for (const poi of focus.scheduleDayTimelinePois ?? []) {
    addTitleToken(poi);
  }

  for (const day of focus.problem?.affectedDayNumbers ?? []) addDay(day);
  for (const day of focus.conflict?.affectedDays ?? []) addDay(day);
  for (const scope of focus.problemDetail?.affectedScopeDisplay ?? []) {
    addTitleToken(scope.label);
    addTitleToken(scope.secondaryLabel);
    scope.placeNames?.forEach((name) => addTitleToken(name));
    addDay(scope.dayIndex);
  }

  if (focus.problem?.id) refIds.add(focus.problem.id);
  if (focus.conflict?.id) refIds.add(focus.conflict.id);
  if (focus.conflict?.issue?.id) refIds.add(focus.conflict.issue.id);
  for (const ref of focus.problem?.sourceRefs ?? []) {
    if (ref.refId?.trim()) refIds.add(ref.refId.trim());
  }

  return {
    titleTokens: [...titleTokens],
    dayNumbers: [...dayNumbers],
    refIds,
  };
}

function textHaystack(parts: Array<string | undefined>): string {
  return parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function haystackMentionsDay(haystack: string, day: number): boolean {
  return (
    haystack.includes(`第 ${day} 天`) ||
    haystack.includes(`第${day}天`) ||
    haystack.includes(`day ${day}`)
  );
}

/** 工作台按天：先匹配当天标签；无日期标签时再按当日 POI/冲突关键词匹配，排除其它天 */
function normalizePoiMatchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function poiNameMatchesHaystack(poiName: string, haystack: string): boolean {
  const poi = normalizePoiMatchText(poiName);
  const text = normalizePoiMatchText(haystack);
  if (!poi || poi.length < 2 || !text) return false;
  if (text.includes(poi)) return true;

  const short = poi.split(/[（(]/)[0]?.trim();
  return Boolean(short && short.length >= 2 && short !== poi && text.includes(short));
}

/** 工作台按天：证据须命中当日时间轴 POI，避免「教堂」等短词误匹配其它天 */
export function itemMatchesScheduleDayTimelinePois(
  haystack: string,
  timelinePois: string[],
): boolean {
  if (timelinePois.length === 0) return false;
  return timelinePois.some((poi) => poiNameMatchesHaystack(poi, haystack));
}

function itemMatchesScheduleDayEvidence(
  haystack: string,
  dayNumber: number,
  tokens: DecisionCheckerFocusTokens,
  timelinePois?: string[],
): boolean {
  const mentionedDays = extractDayNumbersFromHaystack(haystack);
  if (mentionedDays.includes(dayNumber) || haystackMentionsDay(haystack, dayNumber)) {
    if (timelinePois?.length) {
      return itemMatchesScheduleDayTimelinePois(haystack, timelinePois);
    }
    return true;
  }
  if (mentionedDays.length > 0 && !mentionedDays.includes(dayNumber)) {
    return false;
  }

  if (timelinePois?.length) {
    return itemMatchesScheduleDayTimelinePois(haystack, timelinePois);
  }

  for (const token of tokens.titleTokens) {
    for (const variant of expandTokenMatchVariants(token)) {
      const needle = variant.toLowerCase();
      if (needle.length >= 3 && haystack.includes(needle)) return true;
    }
  }

  return false;
}

function itemMatchesFocusTokens(
  haystack: string,
  tokens: DecisionCheckerFocusTokens,
  options?: {
    scheduleDay?: boolean;
    scheduleDayNumber?: number;
    timelinePois?: string[];
  },
): boolean {
  if (options?.scheduleDay && options.scheduleDayNumber != null) {
    return itemMatchesScheduleDayEvidence(
      haystack,
      options.scheduleDayNumber,
      tokens,
      options.timelinePois,
    );
  }

  if (tokens.refIds.size > 0) {
    // refs checked separately on evidence items
  }

  for (const token of tokens.titleTokens) {
    for (const variant of expandTokenMatchVariants(token)) {
      const needle = variant.toLowerCase();
      if (needle.length >= 2 && haystack.includes(needle)) return true;
    }
  }

  if (tokens.titleTokens.length === 0) {
    for (const day of tokens.dayNumbers) {
      if (
        haystack.includes(`第 ${day} 天`) ||
        haystack.includes(`第${day}天`) ||
        haystack.includes(`day ${day}`)
      ) {
        return true;
      }
    }
  }

  for (const day of tokens.dayNumbers) {
    const dayHit =
      haystack.includes(`第 ${day} 天`) ||
      haystack.includes(`第${day}天`) ||
      haystack.includes(`day ${day}`);
    if (!dayHit) continue;
    if (tokens.titleTokens.length === 0) return true;
    for (const token of tokens.titleTokens) {
      if (haystack.includes(token.toLowerCase())) return true;
    }
  }

  return false;
}

function summarizeEvidenceItems(
  items: DecisionCheckerEvidenceItemDto[],
  source: DecisionCheckerEvidenceDto,
): DecisionCheckerEvidenceDto['summary'] {
  const summary = { high: 0, medium: 0, low: 0, lastUpdatedAt: source.summary?.lastUpdatedAt };
  for (const item of items) {
    summary[item.reliability]++;
  }
  return summary;
}

/** 决策空间 · 按当前问题裁剪证据 Tab */
export function filterDecisionCheckerEvidenceForFocus(
  evidence: DecisionCheckerEvidenceDto,
  focus: DecisionSpaceFocusContext,
): DecisionCheckerEvidenceDto {
  const items = evidence.items ?? [];
  const scheduleDay = focus.scheduleDayIndex != null;
  const scheduleDayNumber =
    focus.scheduleDayIndex != null ? focus.scheduleDayIndex + 1 : undefined;

  if (!focus.problem && !focus.conflict && focus.scheduleDayIndex == null) {
    return evidence;
  }

  const tokens = buildDecisionCheckerFocusTokens(focus);
  const canFilter =
    tokens.titleTokens.length > 0 ||
    tokens.dayNumbers.length > 0 ||
    tokens.refIds.size > 0;

  const timelinePois = focus.scheduleDayTimelinePois?.filter(Boolean) ?? [];
  const focusMatchOptions = {
    scheduleDay,
    scheduleDayNumber,
    timelinePois: timelinePois.length > 0 ? timelinePois : undefined,
  };

  let filtered = items;
  if (canFilter) {
    filtered = items.filter((item) => {
      const haystack = textHaystack([item.title, item.subtitle]);
      if (item.refs?.some((ref) => tokens.refIds.has(ref.id))) {
        if (!scheduleDay || scheduleDayNumber == null) return true;
        const mentionedDays = extractDayNumbersFromHaystack(haystack);
        if (mentionedDays.length > 0) {
          return mentionedDays.includes(scheduleDayNumber);
        }
        if (timelinePois.length > 0) {
          return itemMatchesScheduleDayTimelinePois(haystack, timelinePois);
        }
        return false;
      }
      return itemMatchesFocusTokens(haystack, tokens, focusMatchOptions);
    });
  } else if (scheduleDay && scheduleDayNumber != null) {
    filtered = items.filter((item) =>
      itemMatchesScheduleDayEvidence(
        textHaystack([item.title, item.subtitle]),
        scheduleDayNumber,
        tokens,
        timelinePois.length > 0 ? timelinePois : undefined,
      ),
    );
  }

  const judgmentExplanation =
    evidence.judgmentExplanation &&
    itemMatchesFocusTokens(textHaystack([evidence.judgmentExplanation]), tokens, focusMatchOptions)
      ? evidence.judgmentExplanation
      : scheduleDay
        ? undefined
        : evidence.judgmentExplanation;

  if (filtered.length === 0) {
    return {
      ...evidence,
      items: [],
      summary: { high: 0, medium: 0, low: 0, lastUpdatedAt: evidence.summary?.lastUpdatedAt },
      judgmentExplanation: undefined,
    };
  }

  return {
    ...evidence,
    items: filtered,
    summary: summarizeEvidenceItems(filtered, evidence),
    judgmentExplanation,
  };
}

/** 决策空间 · 按当前问题裁剪影响 Tab */
export function filterDecisionCheckerImpactForFocus(
  impact: DecisionCheckerImpactDto,
  focus: DecisionSpaceFocusContext,
): DecisionCheckerImpactDto {
  if (!focus.problem && !focus.conflict && focus.scheduleDayIndex == null) return impact;

  const scheduleDay = focus.scheduleDayIndex != null;
  const scheduleDayNumber =
    focus.scheduleDayIndex != null ? focus.scheduleDayIndex + 1 : undefined;
  const tokens = buildDecisionCheckerFocusTokens(focus);
  if (tokens.titleTokens.length === 0 && tokens.dayNumbers.length === 0) return impact;

  const constraints = (impact.constraints ?? []).filter((row) =>
    itemMatchesFocusTokens(textHaystack([row.name, row.status, row.constraintId]), tokens, {
      scheduleDay,
      scheduleDayNumber,
    }),
  );
  const cascade = (impact.cascade ?? []).filter((node) =>
    itemMatchesFocusTokens(textHaystack([node.title, node.description]), tokens, {
      scheduleDay,
      scheduleDayNumber,
    }),
  );

  const aiText = impact.aiInterpretation?.text;
  const aiInterpretation =
    aiText &&
    itemMatchesFocusTokens(textHaystack([aiText]), tokens, {
      scheduleDay,
      scheduleDayNumber,
    })
      ? impact.aiInterpretation
      : constraints.length > 0 || cascade.length > 0
        ? scheduleDay
          ? undefined
          : impact.aiInterpretation
        : undefined;

  return {
    ...impact,
    constraints,
    cascade,
    aiInterpretation,
  };
}

export function isDecisionCheckerFocusedOnConflict(
  data: Pick<DecisionCheckerResponse, 'focusConflictId' | 'overview'> | null | undefined,
  conflict?: PlanningConflictItem | null,
): boolean {
  if (!data || !conflict) return false;
  const focusId = data.focusConflictId;
  const primaryId = data.overview.conflict.primary?.conflictId;
  return focusId === conflict.id || primaryId === conflict.id;
}

function scenarioToRepairPlan(scenario: DecisionCheckerScenarioDto) {
  return {
    id: scenario.id,
    source: 'feasibility_repair' as const,
    badge: scenario.badgeLabel ?? '推荐',
    title: scenario.title,
    description: scenario.description,
    recommended: scenario.badge === 'recommended' || scenario.badge === 'best',
    metrics: scenario.metrics,
    benefits: [] as string[],
  };
}

function buildFocusedPrimaryConflict(
  focus: DecisionSpaceFocusContext,
): DecisionCheckerResponse['overview']['conflict']['primary'] {
  const conflict = focus.conflict;
  const problem = focus.problem;
  const message =
    resolveDecisionProblemDescription(focus.problemDetail, problem) ??
    conflict?.message ??
    problem?.affectedScopeSummary ??
    '';
  const title = problem?.title ?? conflict?.title ?? '当前决策问题';
  const conflictId = conflict?.id ?? problem?.id ?? 'focus';
  const severity =
    problem?.primaryEnforcement === 'BLOCK' ||
    problem?.primaryEnforcement === 'REQUIRE_ADJUSTMENT' ||
    conflict?.priority === 'must_handle'
      ? ('hard' as const)
      : ('soft' as const);

  return {
    conflictId,
    severity,
    title,
    message,
    affectedDays: conflict?.affectedDays ?? problem?.affectedDayNumbers,
  };
}

/** 决策空间 · 将行程级 decision-checker 裁剪为当前队列选中项 */
export function scopeDecisionCheckerForDecisionSpace(
  data: DecisionCheckerResponse,
  focus: DecisionSpaceFocusContext,
): DecisionCheckerResponse {
  const hasFocus =
    Boolean(focus.conflict || focus.problem) || focus.scheduleDayIndex != null;
  if (!hasFocus) return data;

  const backendAligned = isDecisionCheckerFocusedOnConflict(data, focus.conflict);
  const scheduleDayNumber =
    focus.scheduleDayIndex != null ? focus.scheduleDayIndex + 1 : undefined;
  const trustBackendDayEvidence =
    scheduleDayNumber != null &&
    !focus.problem &&
    isDecisionCheckerBackendFocusedForScheduleDay(
      data,
      scheduleDayNumber,
      focus.scheduleDayConflicts ?? [],
    );
  const hasProblemFocus = Boolean(focus.problem);
  const problemOptions = focus.problemOptions ?? [];

  const scenarios =
    problemOptions.length > 0
      ? mapDecisionOptionsToCheckerScenarios(problemOptions)
      : hasProblemFocus
        ? []
        : backendAligned
          ? data.counterfactual.scenarios
          : [];

  const primary = buildFocusedPrimaryConflict(focus);
  const repairPlan =
    scenarios.length > 0
      ? scenarioToRepairPlan(scenarios[0]!)
      : hasProblemFocus
        ? undefined
        : backendAligned
          ? data.overview.repairPlan
          : undefined;

  return {
    ...data,
    focusConflictId: focus.conflict?.id ?? focus.problem?.id ?? data.focusConflictId,
    overview: {
      ...data.overview,
      conflict: {
        hardCount: hasProblemFocus
          ? primary.severity === 'hard'
            ? 1
            : 0
          : backendAligned
            ? (data.overview.conflict.hardCount ?? 0)
            : primary.severity === 'hard'
              ? 1
              : 0,
        softCount: hasProblemFocus
          ? primary.severity === 'soft'
            ? 1
            : 0
          : backendAligned
            ? data.overview.conflict.softCount
            : primary.severity === 'soft'
              ? 1
              : 0,
        primary,
      },
      repairPlan,
      aiSuggestion:
        hasProblemFocus || !backendAligned ? undefined : data.overview.aiSuggestion,
    },
    counterfactual: {
      ...data.counterfactual,
      headline: focus.problem?.title ?? focus.conflict?.title ?? data.counterfactual.headline,
      scenarios,
      ifUnchanged: backendAligned ? data.counterfactual.ifUnchanged : undefined,
    },
    evidence:
      trustBackendDayEvidence && !(focus.scheduleDayTimelinePois?.length)
        ? data.evidence
        : filterDecisionCheckerEvidenceForFocus(data.evidence, focus),
    impact: filterDecisionCheckerImpactForFocus(data.impact, focus),
  };
}

export function buildDecisionCheckerPlanningInterimForFocus(input: {
  summary: PlanningConflictSummary;
  items: PlanningConflictItem[];
  verdictHeadline?: string | null;
  planningLoading?: boolean;
  focusConflict?: PlanningConflictItem | null;
  focusProblem?: DecisionProblemSummary | null;
  focusProblemDetail?: DecisionProblemDetail | null;
  /** 工作台按天联动：计数与副标题对齐，不用全行程 summary */
  scheduleDayConflicts?: PlanningConflictItem[];
}): DecisionCheckerPlanningInterim | null {
  const {
    summary,
    items,
    verdictHeadline,
    planningLoading,
    focusConflict,
    focusProblem,
    focusProblemDetail,
    scheduleDayConflicts,
  } = input;

  const scopedSummary =
    scheduleDayConflicts != null ? summarizePlanningConflicts(scheduleDayConflicts) : summary;
  const scopedItems = scheduleDayConflicts ?? items;

  if (planningLoading && scopedSummary.total === 0 && scopedItems.length === 0) {
    return null;
  }

  const focusedMessage = resolveDecisionProblemDescription(focusProblemDetail, focusProblem);
  const focusedTitle = focusProblem?.title ?? focusConflict?.title;
  const focusedMessageFallback = focusConflict?.message ?? focusProblem?.affectedScopeSummary;

  const top =
    focusConflict ??
    scopedItems.find((item) => item.priority === 'must_handle') ??
    scopedItems.find((item) => item.priority === 'suggest_adjust') ??
    scopedItems[0];

  return {
    total: scopedSummary.total,
    mustHandle: scopedSummary.mustHandle,
    suggestAdjust: scopedSummary.suggestAdjust,
    verdictHeadline: verdictHeadline ?? undefined,
    topConflictTitle: focusedTitle ?? top?.title,
    topConflictMessage: focusedMessage ?? focusedMessageFallback ?? top?.message,
  };
}

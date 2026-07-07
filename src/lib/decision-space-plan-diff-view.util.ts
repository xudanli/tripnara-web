import type {
  PlanningDecisionCounterfactualRow,
  PlanningDecisionImpactScope,
  PlanningDecisionPackOption,
} from '@/dto/frontend-planning-decision-pack.types';
import { matchPackOptionIdForAction } from '@/lib/decision-proposal-option-view.util';
import type { ItineraryDiffEntry } from '@/types/feasibility-repair';
import type { GatewayDecisionPreviewResult } from '@/lib/unified-gateway-response.util';

export type PlanDiffDeltaTone = 'good' | 'bad' | 'neutral' | 'buffer';

export type PlanDiffImpactTagTone = 'good' | 'caution' | 'risk' | 'muted' | 'neutral';

export interface PlanDiffChangeRow {
  id: string;
  label: string;
  before: string;
  after: string;
  delta: string;
  deltaTone: PlanDiffDeltaTone;
}

export interface PlanDiffScopeChip {
  id: string;
  label: string;
  tone: PlanDiffImpactTagTone;
}

export interface PlanDiffTimelineNode {
  id: string;
  label: string;
  time: string;
  durationAfterMinutes?: number;
  unchanged?: boolean;
}

export interface PlanDiffTimelineTrack {
  variant: 'original' | 'proposed';
  label: string;
  nodes: PlanDiffTimelineNode[];
}

export interface PlanDiffView {
  optionLetter: string;
  optionBadge?: string;
  optionTitle?: string;
  changes: PlanDiffChangeRow[];
  scopeChips: PlanDiffScopeChip[];
  unchangedItems: string[];
  timelines: PlanDiffTimelineTrack[];
  summaryLine?: string;
  isEmpty: boolean;
  isDemo?: boolean;
}

export interface PlanDiffCounterfactualRowInput {
  id?: string;
  label: string;
  before: string;
  after: string;
}

/** 时间轴节点 — 仅 HH:mm 行程事件，不含交通缓冲等指标行 */
export interface PlanDiffTimelineMilestoneInput {
  id: string;
  label: string;
  originalTime: string;
  newTime: string;
  deltaMinutes?: number;
  durationAfterMinutes?: number;
  originalDurationAfterMinutes?: number;
}

const CLOCK_TIME = /^\d{1,2}:\d{2}$/;
const MINUTE_VALUE = /^[+-]?\d+\s*分钟$/;

function clockTimeToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isClockTime(value: string): boolean {
  return CLOCK_TIME.test(value.trim());
}

export function isPlanDiffTimelineEventLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return false;
  return !/交通缓冲|^缓冲$|buffer/i.test(trimmed);
}

export function shortenPlanDiffTimelineLabel(label: string): string {
  const trimmed = label.trim();
  if (/结束时间$/.test(trimmed)) {
    return trimmed.replace(/结束时间$/, '（结束）');
  }
  return trimmed.replace(/时间$/, '') || trimmed;
}

/** 过滤缓冲行、按原计划时间排序 */
export function normalizePlanDiffTimelineMilestones(
  milestones: PlanDiffTimelineMilestoneInput[],
): PlanDiffTimelineMilestoneInput[] {
  return [...milestones]
    .filter(
      (milestone) =>
        isPlanDiffTimelineEventLabel(milestone.label) &&
        isClockTime(milestone.originalTime) &&
        isClockTime(milestone.newTime),
    )
    .sort(
      (a, b) =>
        (clockTimeToMinutes(a.originalTime) ?? 0) - (clockTimeToMinutes(b.originalTime) ?? 0),
    )
    .map((milestone) => ({
      ...milestone,
      label: shortenPlanDiffTimelineLabel(milestone.label),
    }));
}

export function planDiffTimelineMilestonesFromChangeRows(
  rows: Array<{
    id: string;
    itemLabel: string;
    before: string;
    after: string;
    deltaMinutes?: number;
  }>,
): PlanDiffTimelineMilestoneInput[] {
  return normalizePlanDiffTimelineMilestones(
    rows.map((row) => ({
      id: row.id,
      label: row.itemLabel,
      originalTime: row.before,
      newTime: row.after,
      deltaMinutes: row.deltaMinutes,
    })),
  );
}

function resolveMilestoneDurationAfter(
  milestones: PlanDiffTimelineMilestoneInput[],
  index: number,
  timeKey: 'originalTime' | 'newTime',
  explicit?: number,
): number | undefined {
  if (explicit != null && explicit >= 0) return explicit;
  const current = milestones[index];
  const next = milestones[index + 1];
  if (!current || !next) return undefined;
  const currentMin = clockTimeToMinutes(current[timeKey]);
  const nextMin = clockTimeToMinutes(next[timeKey]);
  if (currentMin == null || nextMin == null) return undefined;
  const diff = nextMin - currentMin;
  return diff >= 0 ? diff : undefined;
}

export function buildPlanDiffTimelineTracks(
  milestones: PlanDiffTimelineMilestoneInput[],
  optionLetter = 'A',
): PlanDiffTimelineTrack[] {
  const normalized = normalizePlanDiffTimelineMilestones(milestones);
  if (!normalized.length) return [];

  return [
    {
      variant: 'original',
      label: '原计划',
      nodes: normalized.map((milestone, index) => ({
        id: `${milestone.id}_orig`,
        label: milestone.label,
        time: milestone.originalTime,
        unchanged: milestone.originalTime === milestone.newTime,
        durationAfterMinutes: resolveMilestoneDurationAfter(
          normalized,
          index,
          'originalTime',
          milestone.originalDurationAfterMinutes,
        ),
      })),
    },
    {
      variant: 'proposed',
      label: `新计划（方案 ${optionLetter}）`,
      nodes: normalized.map((milestone, index) => ({
        id: `${milestone.id}_new`,
        label: milestone.label,
        time: milestone.newTime,
        unchanged: milestone.originalTime === milestone.newTime,
        durationAfterMinutes: resolveMilestoneDurationAfter(
          normalized,
          index,
          'newTime',
          milestone.durationAfterMinutes,
        ),
      })),
    },
  ];
}

function parseSignedMinutes(value: string): number | null {
  const match = value.trim().match(/^([+-]?\d+)\s*分钟$/);
  return match ? Number(match[1]) : null;
}

function parseMinutesDelta(before: string, after: string): { delta: string; tone: PlanDiffDeltaTone } | null {
  const clockDelta = (() => {
    const beforeMin = clockTimeToMinutes(before);
    const afterMin = clockTimeToMinutes(after);
    if (beforeMin == null || afterMin == null) return null;
    const diff = afterMin - beforeMin;
    if (diff === 0) return { delta: '0 分钟', tone: 'neutral' as const };
    const sign = diff > 0 ? '+' : '';
    return {
      delta: `${sign}${diff} 分钟`,
      tone: (diff < 0 ? 'good' : 'bad') as PlanDiffDeltaTone,
    };
  })();
  if (clockDelta) return clockDelta;

  const beforeMinutes = parseSignedMinutes(before);
  const afterMinutes = parseSignedMinutes(after);
  if (beforeMinutes != null && afterMinutes != null) {
    const diff = afterMinutes - beforeMinutes;
    const sign = diff > 0 ? '+' : '';
    return {
      delta: `${sign}${diff} 分钟`,
      tone: diff > 0 ? 'good' : diff < 0 ? 'bad' : 'neutral',
    };
  }

  return null;
}

function isBufferRowLabel(label: string): boolean {
  return /交通缓冲/.test(label);
}

function rowFromCounterfactual(row: PlanDiffCounterfactualRowInput, index: number): PlanDiffChangeRow {
  const parsed = parseMinutesDelta(row.before, row.after);
  return {
    id: row.id ?? `cf_${index}`,
    label: row.label,
    before: row.before,
    after: row.after,
    delta: parsed?.delta ?? (row.before === row.after ? '—' : '变更'),
    deltaTone: isBufferRowLabel(row.label)
      ? 'buffer'
      : (parsed?.tone ?? 'neutral'),
  };
}

function rowFromItineraryDiff(entry: ItineraryDiffEntry, index: number): PlanDiffChangeRow | null {
  if (entry.changeType !== 'time_changed') return null;
  const label = entry.before?.title ?? entry.after?.title ?? '行程项';
  const before = entry.before?.time ?? '—';
  const after = entry.after?.time ?? '—';
  const parsed = parseMinutesDelta(before, after);
  return {
    id: `${entry.slotId}-${index}`,
    label,
    before,
    after,
    delta: parsed?.delta ?? '变更',
    deltaTone: parsed?.tone ?? 'neutral',
  };
}

function countTimeLikeChanges(rows: PlanDiffChangeRow[]): number {
  return rows.filter((row) => isClockTime(row.before) && isClockTime(row.after)).length;
}

function buildScopeChips(input: {
  changes: PlanDiffChangeRow[];
  mutationLines: string[];
  impactScope?: PlanningDecisionImpactScope;
  memberCount?: number;
}): PlanDiffScopeChip[] {
  const chips: PlanDiffScopeChip[] = [];
  const timeCount = countTimeLikeChanges(input.changes);
  if (timeCount > 0) {
    chips.push({
      id: 'time',
      label: `修改 ${timeCount} 个时间点`,
      tone: 'good',
    });
  } else if (input.changes.length) {
    chips.push({
      id: 'time',
      label: `修改 ${input.changes.length} 个时间点`,
      tone: 'good',
    });
  }

  const routeMatches = input.mutationLines.filter((line) => /路线|路段/.test(line));
  const routeCountMatch = routeMatches.join(' ').match(/(\d+)\s*段?(路线|路段)/);
  if (routeCountMatch) {
    chips.push({
      id: 'route',
      label: `重算 ${routeCountMatch[1]} 段路线`,
      tone: 'good',
    });
  } else if (routeMatches.length || (input.impactScope?.itemIds?.length ?? 0) > 1) {
    chips.push({ id: 'route', label: '重算路线', tone: 'good' });
  }

  if (input.memberCount && input.memberCount > 0) {
    chips.push({
      id: 'member',
      label: `影响 ${input.memberCount} 位成员`,
      tone: 'neutral',
    });
  }

  const neutralPatterns: Array<{ id: string; pattern: RegExp; label: string }> = [
    { id: 'booking', pattern: /预约不变|预订不变|预约保持/, label: '预约不变' },
    { id: 'budget', pattern: /预算不变|费用不变/, label: '预算不变' },
  ];
  const joined = input.mutationLines.join(' ');
  for (const item of neutralPatterns) {
    if (item.pattern.test(joined)) {
      chips.push({ id: item.id, label: item.label, tone: 'neutral' });
    }
  }

  return chips;
}

function buildUnchangedItems(mutationLines: string[], hints: string[] = []): string[] {
  const fromMutations = mutationLines.filter((line) => /不变|保持|未改|不受影响/.test(line));
  const merged = [...hints, ...fromMutations];
  const seen = new Set<string>();
  return merged.filter((line) => {
    const key = line.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}

function buildTimelinesFromCounterfactualRows(
  rows: PlanDiffCounterfactualRowInput[],
  optionLetter: string,
): PlanDiffTimelineTrack[] {
  const milestones = planDiffTimelineMilestonesFromChangeRows(
    rows.map((row, index) => ({
      id: row.id ?? `cf_${index}`,
      itemLabel: row.label,
      before: row.before,
      after: row.after,
    })),
  );
  return buildPlanDiffTimelineTracks(milestones, optionLetter);
}

function buildSummaryLine(input: {
  changes: PlanDiffChangeRow[];
  previewSummary?: string;
}): string | undefined {
  const previewSummary = input.previewSummary?.trim();
  if (previewSummary) return previewSummary;

  const bufferRow = input.changes.find((row) => /缓冲/.test(row.label));
  if (!bufferRow) return undefined;

  const beforeMinutes = parseSignedMinutes(bufferRow.before);
  const afterMinutes = parseSignedMinutes(bufferRow.after);
  if (beforeMinutes == null || afterMinutes == null) return undefined;

  const saved = Math.abs(
    input.changes
      .filter((row) => isClockTime(row.before) && isClockTime(row.after))
      .map((row) => {
        const b = clockTimeToMinutes(row.before);
        const a = clockTimeToMinutes(row.after);
        return b != null && a != null ? b - a : 0;
      })
      .find((value) => value > 0) ?? 20,
  );

  return `总计节省 ${saved} 分钟缓冲，交通缓冲由 ${bufferRow.before} → ${bufferRow.after}`;
}

/** 从 decisionPack 选中项提取 preview 降级用的 counterfactual */
export function resolvePlanDiffFallbackFromPack(
  packOptions: PlanningDecisionPackOption[] | undefined,
  selectedOptionId: string | null | undefined,
): {
  counterfactualRows: PlanningDecisionCounterfactualRow[];
  unchangedHints: string[];
  impactScope?: PlanningDecisionImpactScope;
} | undefined {
  if (!packOptions?.length || !selectedOptionId?.trim()) return undefined;

  const packOptionId = matchPackOptionIdForAction(packOptions, selectedOptionId);
  const packOption = packOptions.find(
    (option) => option.id === packOptionId || option.action?.actionId === selectedOptionId,
  );
  if (!packOption?.counterfactualRows?.length) return undefined;

  const unchangedHints = (packOption.costItems ?? packOption.costs ?? [])
    .map((item) => (typeof item === 'string' ? item : item.text))
    .filter((text) => /不变|保持|未改|不受影响/.test(text))
    .slice(0, 4);

  return {
    counterfactualRows: packOption.counterfactualRows,
    unchangedHints,
    impactScope: packOption.impactScope,
  };
}

export function buildPlanDiffView(input: {
  itineraryDiff?: ItineraryDiffEntry[];
  preview?: GatewayDecisionPreviewResult | null;
  mutationLines?: string[];
  comparison?: { before: string; after: string };
  optionLetter?: string;
  optionTitle?: string;
  counterfactualRows?: PlanDiffCounterfactualRowInput[];
  impactScope?: PlanningDecisionImpactScope;
  unchangedHints?: string[];
  memberCount?: number;
}): PlanDiffView | null {
  const optionLetter = input.optionLetter ?? 'A';
  const mutationLines = input.mutationLines ?? [];

  const counterfactualChanges = (input.counterfactualRows ?? []).map(rowFromCounterfactual);
  const itineraryChanges = (input.itineraryDiff ?? [])
    .map(rowFromItineraryDiff)
    .filter(Boolean) as PlanDiffChangeRow[];

  let allChanges = counterfactualChanges.length
    ? counterfactualChanges
    : itineraryChanges;

  if (!allChanges.length && input.comparison) {
    const parsed = parseMinutesDelta(input.comparison.before, input.comparison.after);
    allChanges = [
      {
        id: 'tradeoff-comparison',
        label: input.optionTitle?.trim() || '时间安排',
        before: input.comparison.before,
        after: input.comparison.after,
        delta: parsed?.delta ?? '变更',
        deltaTone: parsed?.tone ?? 'neutral',
      },
    ];
  }

  const previewSummary =
    (input.preview as GatewayDecisionPreviewResult & { impactSummary?: string })?.impactSummary?.trim();

  if (!allChanges.length && !mutationLines.length && !previewSummary) return null;

  const scopeChips = buildScopeChips({
    changes: allChanges,
    mutationLines,
    impactScope: input.impactScope,
    memberCount: input.memberCount,
  });

  const unchangedItems = buildUnchangedItems(mutationLines, input.unchangedHints);
  const timelines = buildTimelinesFromCounterfactualRows(
    input.counterfactualRows ?? [],
    optionLetter,
  );
  const summaryLine = buildSummaryLine({ changes: allChanges, previewSummary });

  return {
    optionLetter,
    optionTitle: input.optionTitle,
    changes: allChanges,
    scopeChips,
    unchangedItems,
    timelines,
    summaryLine,
    isEmpty: allChanges.length === 0,
  };
}

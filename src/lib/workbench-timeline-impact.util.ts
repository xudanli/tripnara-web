import type {
  WorkbenchConflictLine,
  WorkbenchTimelineEntry,
} from '@/components/plan-studio/workbench/useWorkbenchItineraryData';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { CascadeAffectedItem, CascadeUiHint } from '@/types/readiness-cascade';
import { getCascadeRecommendationLabel } from '@/lib/readiness-cascade.util';

export interface WorkbenchTimelineImpact {
  conclusion: string;
  reason: string;
}

export interface WorkbenchDayContextSummary {
  statusLabel: string;
  statusTone: 'ok' | 'caution' | 'danger';
  headline: string;
  mainReason?: string;
  suggestion?: string;
}

function normalizeMatchText(value?: string | null): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

function tokenMatchesEntry(token: string, entry: Pick<WorkbenchTimelineEntry, 'title' | 'subtitle'>): boolean {
  const normalizedToken = normalizeMatchText(token);
  if (!normalizedToken || normalizedToken.length < 2) return false;
  const haystack = normalizeMatchText(`${entry.title} ${entry.subtitle ?? ''}`);
  return haystack.includes(normalizedToken) || normalizedToken.includes(haystack.slice(0, 12));
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const split = trimmed.split(/[。；;]/)[0]?.trim();
  return split || trimmed;
}

export function resolveTimelineEntryImpact(
  entry: Pick<WorkbenchTimelineEntry, 'id' | 'title' | 'subtitle'>,
  input: {
    cascadeHints?: CascadeUiHint[];
    cascadeAffected?: CascadeAffectedItem[];
    conflictLines?: WorkbenchConflictLine[];
  },
): WorkbenchTimelineImpact | null {
  for (const hint of input.cascadeHints ?? []) {
    const label = hint.entityLabel?.trim();
    if (label && tokenMatchesEntry(label, entry)) {
      return {
        conclusion: firstSentence(hint.message),
        reason:
          hint.netImpactMinutes != null && hint.netImpactMinutes > 0
            ? `预计增加 ${hint.netImpactMinutes} 分钟`
            : getCascadeRecommendationLabel(hint.recommendation, true),
      };
    }
  }

  for (const item of input.cascadeAffected ?? []) {
    const label = item.entityRef.label?.trim();
    if (label && tokenMatchesEntry(label, entry)) {
      return {
        conclusion: firstSentence(item.message),
        reason:
          item.impactAlgebra?.netImpactMinutes != null && item.impactAlgebra.netImpactMinutes > 0
            ? `预计增加 ${item.impactAlgebra.netImpactMinutes} 分钟`
            : getCascadeRecommendationLabel(item.recommendation, true),
      };
    }
  }

  for (const line of input.conflictLines ?? []) {
    const haystack = `${line.label} ${line.detail ?? ''}`;
    if (tokenMatchesEntry(entry.title, { title: haystack, subtitle: undefined })) {
      return {
        conclusion: line.label,
        reason: line.detail ?? (line.delta ? `影响 ${line.delta}` : '建议查看影响'),
      };
    }
    if (entry.subtitle && tokenMatchesEntry(line.label, { title: entry.subtitle, subtitle: undefined })) {
      return {
        conclusion: line.label,
        reason: line.detail ?? (line.delta ? `影响 ${line.delta}` : '建议查看影响'),
      };
    }
  }

  return null;
}

export function attachTimelineEntryImpacts(
  timeline: WorkbenchTimelineEntry[],
  input: {
    cascadeHints?: CascadeUiHint[];
    cascadeAffected?: CascadeAffectedItem[];
    conflictLines?: WorkbenchConflictLine[];
  },
): Array<WorkbenchTimelineEntry & { impact?: WorkbenchTimelineImpact | null }> {
  return timeline.map((entry) => ({
    ...entry,
    impact: resolveTimelineEntryImpact(entry, input),
  }));
}

export function filterCascadeHintsForDay(
  hints: CascadeUiHint[],
  timelineTitles: string[],
): CascadeUiHint[] {
  if (hints.length === 0) return [];
  const titles = timelineTitles.map((title) => normalizeMatchText(title)).filter(Boolean);
  if (titles.length === 0) return hints.slice(0, 3);

  const matched = hints.filter((hint) => {
    const label = normalizeMatchText(hint.entityLabel);
    if (!label) return false;
    return titles.some((title) => title.includes(label) || label.includes(title.slice(0, 12)));
  });
  return (matched.length > 0 ? matched : hints).slice(0, 5);
}

export function filterCascadeAffectedForDay(
  affected: CascadeAffectedItem[],
  timelineTitles: string[],
): CascadeAffectedItem[] {
  if (affected.length === 0) return [];
  const titles = timelineTitles.map((title) => normalizeMatchText(title)).filter(Boolean);
  if (titles.length === 0) return affected.slice(0, 5);

  const matched = affected.filter((item) => {
    const label = normalizeMatchText(item.entityRef.label);
    if (!label) return false;
    return titles.some((title) => title.includes(label) || label.includes(title.slice(0, 12)));
  });
  return (matched.length > 0 ? matched : affected).slice(0, 5);
}

/** 冲突已在时间轴行内展示时，侧栏不再重复列出 */
export function filterConflictLinesNotOnTimeline(
  conflictLines: WorkbenchConflictLine[],
  timeline: Array<{ impact?: WorkbenchTimelineImpact | null }>,
): WorkbenchConflictLine[] {
  const attachedLabels = new Set(
    timeline
      .map((entry) => entry.impact?.conclusion?.trim())
      .filter((label): label is string => Boolean(label)),
  );
  if (attachedLabels.size === 0) return conflictLines;
  return conflictLines.filter((line) => !attachedLabels.has(line.label));
}

export function buildWorkbenchDayContextSummary(input: {
  executable: boolean;
  conflictLines: WorkbenchConflictLine[];
  decisionProblems: DecisionProblemSummary[];
  cascadeHints: CascadeUiHint[];
}): WorkbenchDayContextSummary | null {
  const hasIssues =
    !input.executable ||
    input.conflictLines.length > 0 ||
    input.decisionProblems.length > 0 ||
    input.cascadeHints.length > 0;

  if (!hasIssues) {
    return null;
  }

  const reasonParts = [
    ...input.cascadeHints.slice(0, 2).map((hint) => firstSentence(hint.message)),
    ...input.decisionProblems.slice(0, 1).map((problem) => problem.title),
  ].filter(Boolean);

  return {
    statusLabel: input.executable ? '可执行，但建议调整' : '当前不可执行',
    statusTone: input.executable ? 'caution' : 'danger',
    headline: input.executable ? '当前可执行，但建议提前出发' : '当前不可执行',
    mainReason: reasonParts.length ? `主要原因：${reasonParts.slice(0, 3).join('、')}` : undefined,
  };
}

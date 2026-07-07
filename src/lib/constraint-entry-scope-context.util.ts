import type { ConstraintImpactPreview } from '@/components/plan-studio/workbench/constraint-console-types';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import {
  collectIssueConstraintIds,
  expandConstraintIdVariants,
} from '@/lib/constraints-check-normalize.util';
import {
  extractContextFromConflictMessage,
  extractRouteContextFromTitle,
} from '@/lib/decision-problem-queue-context.util';
import { resolveRelatedConstraintUiIds } from '@/lib/planning-conflicts-decision.util';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import { apiConstraintIdToUi } from '@/lib/trip-constraints.adapter';
import { coerceDisplayText } from '@/lib/coerce-display-text.util';
import type { TripConstraintsCheckIssue } from '@/types/trip-constraints';

export interface ConstraintScopeLine {
  dayNumbers: number[];
  dayBadge: string | null;
  summary: string;
  source: 'check' | 'conflict' | 'preview' | 'tradeoff';
  severity?: 'must_handle' | 'suggest_adjust' | 'pending_confirm' | string;
}

export interface ConstraintEntryScopeContext {
  lines: ConstraintScopeLine[];
  dayNumbers: number[];
  /** 侧栏一行摘要，如「第 3 天 · 草帽山 → 黑教堂」 */
  hint: string | null;
}

function uniqueSortedDays(days: number[]): number[] {
  return [...new Set(days.filter((day) => Number.isFinite(day) && day > 0))].sort((a, b) => a - b);
}

export function formatConstraintScopeDayBadge(dayNumbers: number[]): string | null {
  if (dayNumbers.length === 0) return null;
  if (dayNumbers.length === 1) return `第 ${dayNumbers[0]} 天`;
  if (dayNumbers.length <= 3) return `第 ${dayNumbers.join('、')} 天`;
  return `第 ${dayNumbers[0]}–${dayNumbers[dayNumbers.length - 1]} 天等 ${dayNumbers.length} 天`;
}

function entryIdVariants(entry: ConstraintListEntry): Set<string> {
  const ids = new Set<string>();
  for (const variant of expandConstraintIdVariants(entry.id)) ids.add(variant);
  ids.add(apiConstraintIdToUi(entry.id));
  return ids;
}

function issueMatchesEntry(issue: TripConstraintsCheckIssue, entryIds: Set<string>): boolean {
  return collectIssueConstraintIds(issue).some((id) => entryIds.has(id));
}

function conflictMatchesEntry(conflict: PlanningConflictItem, entryId: string): boolean {
  return resolveRelatedConstraintUiIds({ conflict }).includes(entryId);
}

function buildScopeLine(input: {
  dayNumbers: number[];
  summary: string;
  source: ConstraintScopeLine['source'];
  severity?: ConstraintScopeLine['severity'];
}): ConstraintScopeLine {
  const dayNumbers = uniqueSortedDays(input.dayNumbers);
  return {
    dayNumbers,
    dayBadge: formatConstraintScopeDayBadge(dayNumbers),
    summary: input.summary.trim(),
    source: input.source,
    severity: input.severity,
  };
}

function scopeLineKey(line: ConstraintScopeLine): string {
  return `${line.dayNumbers.join(',')}|${line.summary}|${line.source}`;
}

function buildHintFromLine(line: ConstraintScopeLine): string {
  if (line.dayBadge && line.summary) return `${line.dayBadge} · ${line.summary}`;
  return line.dayBadge ?? line.summary;
}

function buildHintFromContext(lines: ConstraintScopeLine[]): string | null {
  if (!lines.length) return null;
  return buildHintFromLine(lines[0]!);
}

/** 从 check / conflicts / preview 推断单条约束的影响天次与路线上下文 */
export function resolveConstraintEntryScopeContext(input: {
  entry: ConstraintListEntry;
  checkIssues?: TripConstraintsCheckIssue[];
  conflicts?: PlanningConflictItem[];
  preview?: ConstraintImpactPreview | null;
}): ConstraintEntryScopeContext {
  const { entry, checkIssues, conflicts, preview } = input;
  const entryIds = entryIdVariants(entry);
  const lines: ConstraintScopeLine[] = [];
  const seen = new Set<string>();
  const allDays = new Set<number>();

  const pushLine = (line: ConstraintScopeLine | null) => {
    if (!line?.summary) return;
    const key = scopeLineKey(line);
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(line);
    for (const day of line.dayNumbers) allDays.add(day);
  };

  for (const issue of checkIssues ?? []) {
    if (!issueMatchesEntry(issue, entryIds)) continue;
    const message = coerceDisplayText(issue.message);
    if (!message) continue;

    const fromMessage = extractContextFromConflictMessage(message);
    const routeFromTitle = extractRouteContextFromTitle(message);
    const summary = fromMessage.contextLine ?? routeFromTitle ?? message;

    pushLine(
      buildScopeLine({
        dayNumbers: fromMessage.dayNumbers,
        summary,
        source: issue.issueKind === 'soft_tradeoff' || issue.sacrificed ? 'tradeoff' : 'check',
        severity: issue.severity,
      }),
    );
  }

  for (const conflict of conflicts ?? []) {
    if (!conflictMatchesEntry(conflict, entry.id)) continue;

    const message = conflict.message?.trim() || conflict.title?.trim() || '';
    const fromMessage = extractContextFromConflictMessage(message);
    const affectedDays = uniqueSortedDays([
      ...(conflict.affectedDays ?? []),
      ...(conflict.issue?.affectedDays ?? []),
      ...fromMessage.dayNumbers,
    ]);

    const anchorFrom = conflict.issue?.anchors?.fromPlaceLabel?.trim();
    const anchorTo = conflict.issue?.anchors?.toPlaceLabel?.trim();
    let summary = fromMessage.contextLine ?? extractRouteContextFromTitle(conflict.title);
    if (!summary && anchorFrom && anchorTo) summary = `${anchorFrom} → ${anchorTo}`;
    if (!summary && anchorTo) summary = anchorTo;
    if (!summary) summary = conflict.title.trim();

    pushLine(
      buildScopeLine({
        dayNumbers: affectedDays,
        summary,
        source: 'conflict',
        severity: conflict.priority,
      }),
    );
  }

  if (entry.softSacrificed && entry.softTradeoffMessage?.trim()) {
    const fromMessage = extractContextFromConflictMessage(entry.softTradeoffMessage);
    pushLine(
      buildScopeLine({
        dayNumbers: fromMessage.dayNumbers,
        summary: fromMessage.contextLine ?? entry.softTradeoffMessage.trim(),
        source: 'tradeoff',
      }),
    );
  }

  const previewDays = (preview?.affectedDays ?? [])
    .filter((day) => day.tone !== 'none')
    .map((day) => day.dayNumber);
  if (previewDays.length > 0) {
    const previewSummary =
      preview?.adjustmentSummary?.trim() ||
      preview?.diffBullets?.find((line) => line.trim())?.trim() ||
      '调整此约束可能影响以下天的安排';
    pushLine(
      buildScopeLine({
        dayNumbers: previewDays,
        summary: previewSummary,
        source: 'preview',
      }),
    );
  }

  const dayNumbers = uniqueSortedDays([...allDays]);
  return {
    lines,
    dayNumbers,
    hint: buildHintFromContext(lines),
  };
}

/** 批量计算约束条目影响范围（侧栏 hint + 右栏详情） */
export function indexConstraintEntryScopeContexts(input: {
  entries: ConstraintListEntry[];
  checkIssues?: TripConstraintsCheckIssue[];
  conflicts?: PlanningConflictItem[];
  preview?: ConstraintImpactPreview | null;
  previewEntryId?: string | null;
}): Map<string, ConstraintEntryScopeContext> {
  const map = new Map<string, ConstraintEntryScopeContext>();
  for (const entry of input.entries) {
    map.set(
      entry.id,
      resolveConstraintEntryScopeContext({
        entry,
        checkIssues: input.checkIssues,
        conflicts: input.conflicts,
        preview: input.previewEntryId === entry.id ? input.preview : null,
      }),
    );
  }
  return map;
}

import { useMemo, useState } from 'react';
import { AlertCircle, ChevronRight, ShieldAlert, Sparkles, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { partitionDecisionProblems } from '@/lib/decision-center.util';
import {
  compareDecisionProblemsForQueue,
  resolveDecisionProblemQueueDisplay,
} from '@/lib/decision-problem-queue-display.util';
import { isDecisionPendingAttention } from '@/generated/decision-semantics-contracts';
import { formatImpactScopeHeadline } from '@/lib/impact-scope-i18n.util';
import { PlanObjectSourceBadge } from '@/components/planning-workbench/PlanObjectSourceBadge';
import { isPlanObjectDecisionProblem } from '@/lib/plan-object-source.util';
import {
  workbenchListItemIdle,
  workbenchListItemSelected,
  workbenchQueueDayLabel,
  workbenchQueueEnforcementBadgeClass,
} from '@/components/plan-studio/workbench/workbench-ui';
import {
  formatEvidenceFreshness,
  executionCapabilityLabel,
  primaryEnforcementBadgeClass,
  primaryEnforcementLabel,
  workflowStatusLabel,
  decisionOriginLabel,
} from '@/lib/decision-problem-display.util';
import type { DecisionCenterRecentDecisionSnapshot, DecisionProblemSummary } from '@/types/decision-problem';

export type DecisionProblemListFilter = 'pending' | 'resolved' | 'all';

function problemTypeIcon(type: string) {
  const normalized = type.toUpperCase();
  if (normalized === 'RISK') return ShieldAlert;
  if (normalized === 'PREFERENCE_CONFLICT') return Users;
  if (normalized === 'INFEASIBILITY') return AlertCircle;
  return Sparkles;
}

function formatAffectedScope(
  item: DecisionProblemSummary,
  t: ReturnType<typeof useTranslation>['t'],
  language: string,
): string | null {
  if (item.impactScopeView) {
    const rendered = formatImpactScopeHeadline(item.impactScopeView, t, language);
    if (rendered) return rendered;
  }
  if (item.impactScopeHeadline?.trim()) return item.impactScopeHeadline.trim();
  if (item.affectedScopeSummary?.trim()) return item.affectedScopeSummary.trim();
  if (item.affectedDayNumbers?.length) {
    return t('impact.scope.affectedDays', {
      days: item.affectedDayNumbers.join(language.startsWith('zh') ? '、' : ', '),
    });
  }
  return null;
}

function formatAffectedMembers(item: DecisionProblemSummary): string | null {
  const count = item.affectedMemberIds?.length;
  if (count && count > 0) return `${count} 位成员`;
  return null;
}

function formatWorkflowStatus(
  item: DecisionProblemSummary,
): string | null {
  return workflowStatusLabel(item.workflowStatus ?? item.status);
}

function DecisionProblemListItem({
  item,
  selected,
  onSelect,
  recentDecisions,
  compact = false,
}: {
  item: DecisionProblemSummary;
  selected: boolean;
  onSelect?: (item: DecisionProblemSummary) => void;
  recentDecisions?: DecisionCenterRecentDecisionSnapshot[] | null;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const Icon = problemTypeIcon(item.type);
  const resolved = item.status === 'RESOLVED' || item.status === 'DISMISSED';
  const pendingExecution = (recentDecisions ?? []).some(
    (d) =>
      d.problemId === item.id &&
      isDecisionPendingAttention(d.executionStatus, d.needsRepair),
  );
  const showResolvedBadge = resolved && !pendingExecution;
  const evidenceLabel = formatEvidenceFreshness(item.evidenceValidUntil);
  const scopeLabel = formatAffectedScope(item, t, i18n.language);
  const membersLabel = formatAffectedMembers(item);
  const workflowLabel = formatWorkflowStatus(item);
  const originLabel = decisionOriginLabel(item.detectedBy);
  const queueDisplay = compact ? resolveDecisionProblemQueueDisplay(item) : null;

  if (compact && queueDisplay) {
    const enforcementLabel = primaryEnforcementLabel(item.primaryEnforcement);
    const isBlock = String(item.primaryEnforcement ?? '').trim().toUpperCase() === 'BLOCK';

    return (
      <button
        type="button"
        className={cn(
          'group flex w-full items-start gap-2',
          selected ? workbenchListItemSelected : workbenchListItemIdle,
          showResolvedBadge && 'opacity-60',
        )}
        onClick={() => onSelect?.(item)}
      >
        <div className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-1.5">
            {queueDisplay.dayBadge ? (
              <span className={workbenchQueueDayLabel}>{queueDisplay.dayBadge}</span>
            ) : null}
            {queueDisplay.dayBadge ? (
              <span className="text-[10px] text-border" aria-hidden>
                ·
              </span>
            ) : null}
            <span
              className={cn(
                'shrink-0 rounded px-1 py-0 text-[10px] font-medium leading-none',
                workbenchQueueEnforcementBadgeClass(item.primaryEnforcement),
              )}
            >
              {enforcementLabel}
            </span>
            {pendingExecution ? (
              <span className="text-[10px] text-muted-foreground">执行中</span>
            ) : null}
            {originLabel ? (
              <span className="rounded-full border border-border/60 px-1.5 py-0 text-[10px] text-muted-foreground">
                {originLabel}
              </span>
            ) : null}
            {isPlanObjectDecisionProblem(item) ? <PlanObjectSourceBadge compact /> : null}
          </div>
          <p
            className={cn(
              'mt-1 line-clamp-2 leading-snug text-foreground',
              isBlock ? 'text-xs font-semibold' : 'text-xs font-medium',
            )}
          >
            {queueDisplay.issueTitle}
          </p>
          {queueDisplay.contextLine ? (
            <p className="mt-0.5 line-clamp-1 text-[10px] leading-relaxed text-muted-foreground">
              {queueDisplay.contextLine}
            </p>
          ) : null}
        </div>
        <ChevronRight className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70" />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-xl border bg-card text-left transition-all',
        compact ? 'px-2.5 py-2' : 'px-3.5 py-3',
        selected ? 'ring-2 ring-primary/45 border-primary/40' : 'hover:border-border',
        showResolvedBadge && 'opacity-75',
      )}
      onClick={() => onSelect?.(item)}
    >
      <div className="flex items-start gap-2">
        <Icon
          className={cn('shrink-0 mt-0.5 text-muted-foreground', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')}
          aria-hidden
        />
        <div className={cn('min-w-0 flex-1', compact ? 'space-y-1' : 'space-y-1.5')}>
          <div className="flex flex-wrap items-center gap-1">
            <span
              className={cn(
                'font-medium leading-snug text-foreground',
                compact ? 'text-xs' : 'text-sm',
              )}
            >
              {item.title}
            </span>
            <Badge
              variant="outline"
              className={cn(
                compact ? 'text-[10px]' : 'text-[10px]',
                primaryEnforcementBadgeClass(item.primaryEnforcement),
              )}
            >
              {primaryEnforcementLabel(item.primaryEnforcement)}
            </Badge>
            {item.personaLabel ? (
              <Badge variant="outline" className="text-[10px] font-normal border-border text-gate-confirm-foreground">
                {item.personaLabel}
              </Badge>
            ) : null}
            {workflowLabel ? (
              <Badge variant="outline" className="text-[10px] font-normal">
                {workflowLabel}
              </Badge>
            ) : null}
            {item.executionStatus && item.executionStatus !== 'NONE' ? (
              <Badge variant="outline" className="text-[10px] font-normal border-border text-muted-foreground">
                {item.executionStatus}
              </Badge>
            ) : null}
            {showResolvedBadge ? (
              <Badge variant="outline" className="text-[10px] font-normal">
                {item.status === 'DISMISSED' ? '已忽略' : '已解决'}
              </Badge>
            ) : null}
            {pendingExecution ? (
              <Badge variant="outline" className="text-[10px] font-normal border-border text-gate-confirm-foreground">
                执行中
              </Badge>
            ) : null}
          </div>
          <div
            className={cn(
              'flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground',
              compact ? 'text-[11px]' : 'text-[11px]',
            )}
          >
            {scopeLabel ? <span>{scopeLabel}</span> : null}
            {membersLabel ? <span>{membersLabel}</span> : null}
            {evidenceLabel ? (
              <span className={evidenceLabel === '信息已过期' ? 'text-warning' : undefined}>
                {evidenceLabel}
              </span>
            ) : null}
            {item.optionsCount != null && item.optionsCount > 0 ? (
              <span>{item.optionsCount} 个方案</span>
            ) : null}
          </div>
        </div>
        <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      </div>
    </button>
  );
}

export interface DecisionProblemListProps {
  items: DecisionProblemSummary[];
  selectedId?: string | null;
  onSelect?: (item: DecisionProblemSummary) => void;
  className?: string;
  emptyMessage?: string;
  /** MVP：待处理 / 已解决 / 全部 */
  filterMode?: DecisionProblemListFilter;
  onFilterModeChange?: (mode: DecisionProblemListFilter) => void;
  recentDecisions?: DecisionCenterRecentDecisionSnapshot[] | null;
  /** 工作台左栏决策队列：更小字号与间距 */
  compact?: boolean;
  /** 紧凑队列模式：隐藏待处理/已解决筛选条 */
  hideFilterTabs?: boolean;
}

export function DecisionProblemList({
  items,
  selectedId,
  onSelect,
  className,
  emptyMessage = '暂无待决策问题',
  filterMode: filterModeProp,
  onFilterModeChange,
  recentDecisions,
  compact = false,
  hideFilterTabs = false,
}: DecisionProblemListProps) {
  const [internalFilter, setInternalFilter] = useState<DecisionProblemListFilter>('pending');
  const filterMode = filterModeProp ?? internalFilter;
  const setFilterMode = onFilterModeChange ?? setInternalFilter;

  const { open, resolved } = useMemo(
    () => partitionDecisionProblems(items, recentDecisions),
    [items, recentDecisions],
  );

  const displayItems = useMemo(() => {
    let list: DecisionProblemSummary[];
    if (filterMode === 'pending') list = open;
    else if (filterMode === 'resolved') list = resolved;
    else list = items;

    if (compact) {
      return [...list].sort(compareDecisionProblemsForQueue);
    }
    return list;
  }, [filterMode, open, resolved, items, compact]);

  const filterTabs: { id: DecisionProblemListFilter; label: string; count: number }[] = [
    { id: 'pending', label: '待处理', count: open.length },
    { id: 'resolved', label: '已解决', count: resolved.length },
    { id: 'all', label: '全部', count: items.length },
  ];

  return (
    <div className={cn('space-y-2', className)}>
      {!hideFilterTabs ? (
        <div className="flex flex-wrap gap-1 px-0.5">
          {filterTabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant={filterMode === tab.id ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'rounded-full',
                compact ? 'h-7 px-2.5 text-[11px]' : 'h-7 px-2.5 text-[11px]',
              )}
              onClick={() => setFilterMode(tab.id)}
            >
              {tab.label} {tab.count}
            </Button>
          ))}
        </div>
      ) : null}

      {displayItems.length === 0 ? (
        <p
          className={cn(
            'text-muted-foreground px-1 py-4 text-center',
            compact ? 'text-[11px]' : 'text-sm',
          )}
        >
          {emptyMessage}
        </p>
      ) : (
        <ul className={cn(compact ? 'space-y-1.5' : 'space-y-2')}>
          {displayItems.map((item) => (
            <li key={item.instanceKey ?? item.id}>
              <DecisionProblemListItem
                item={item}
                selected={selectedId === item.id}
                onSelect={onSelect}
                recentDecisions={recentDecisions}
                compact={compact}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 列表项旁展示 executionCapability（选项级） */
export function DecisionOptionCapabilityBadge({
  capability,
}: {
  capability?: string | null;
}) {
  const label = executionCapabilityLabel(capability ?? undefined);
  if (!label) return null;
  return (
    <Badge variant="outline" className="text-[9px] font-normal">
      {label}
    </Badge>
  );
}

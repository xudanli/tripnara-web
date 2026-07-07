import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import { DecisionQueueClusterList } from '@/components/decision-problems/DecisionQueueClusterList';
import { countOpenDecisionProblems, partitionDecisionProblems } from '@/lib/decision-center.util';
import {
  formatDecisionListBadgeLabel,
  formatDecisionQueueEnforcementBadgeLabel,
  formatDecisionQueueProgressLabel,
  formatWorkbenchDecisionQueueHeadline,
  pickListMetaForBadge,
  resolveDecisionListBadgeCount,
  resolveDecisionQueueProgressRatio,
} from '@/lib/decision-list-badge.util';
import { DecisionSurfaceAlignmentDevHint } from './DecisionSurfaceAlignmentDevHint';
import { mapDecisionProblemsForQueueDisplay } from '@/lib/decision-problem-queue-context.util';
import type { DecisionCenterOverview, DecisionProblemSummary } from '@/types/decision-problem';
import {
  workbenchCard,
  workbenchListItemIdle,
  workbenchListItemSelected,
  workbenchPanelTitle,
  workbenchQueueDayLabel,
  workbenchQueueEnforcementBadgeClass,
} from './workbench-ui';

export interface WorkbenchDecisionQueuePanelProps {
  tripId: string;
  items: PlanningConflictItem[];
  selectedConflictId?: string | null;
  onSelectConflict?: (conflictId: string) => void;
  /** decision-problems BFF 列表（可用时优先展示） */
  decisionProblems?: DecisionProblemSummary[];
  /** L1 总览（decision-center/overview） */
  decisionCenterOverview?: DecisionCenterOverview | null;
  decisionCenterOverviewLoading?: boolean;
  /** Gateway activePacks（destination.is / destination.nz） */
  activePacks?: import('@/types/unified-decision').UnifiedDecisionActivePacks | null;
  /** 是否使用 BFF 决策队列（false 时回退 planning-conflicts） */
  useDecisionProblemsBff?: boolean;
  selectedProblemId?: string | null;
  onSelectProblem?: (problemId: string) => void;
  /** hover 决策队列项时预取 detail */
  onPrefetchProblem?: (problemId: string) => void;
  /** Legacy 冲突列表 hover 时预取关联 problem detail */
  onPrefetchConflict?: (conflictId: string) => void;
  /** 行前准备 · 完整规划待办（PlanningConflictsPanel + 重新验证） */
  planningInboxCount?: number;
  onOpenFullPlanningInbox?: () => void;
  onViewDecision?: (decisionId: string) => void;
  /** Gateway 列表 meta（v2 角标） */
  decisionProblemsListMeta?: import('@/types/unified-decision').UnifiedDecisionProblemListMeta | null;
  /** @deprecated 使用 decisionProblemsListMeta.openCount */
  decisionProblemsOpenCount?: number;
  /** planning-conflicts summary.total */
  planningConflictsTotal?: number;
  /** 有待确认编排草案时打开（通常跳转编排行程） */
  onOpenPendingProposal?: () => void;
  /** planning-workbench-snapshot pendingProposalCount */
  pendingProposalCount?: number;
  /** 待确认草案入口文案 */
  pendingProposalTitle?: string;
  className?: string;
}

function priorityLabel(priority: PlanningConflictItem['priority']): string {
  if (priority === 'must_handle') return '阻断';
  if (priority === 'suggest_adjust') return '需调整';
  return '待确认';
}

function PlanningInboxFooter({
  count,
  onOpen,
}: {
  count: number;
  onOpen?: () => void;
}) {
  if (!onOpen || count <= 0) return null;
  return (
    <div className="mt-2 border-t border-border/40 px-0.5 pt-2">
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-0.5 text-[11px] font-medium text-foreground underline-offset-2 hover:underline"
      >
        完整规划待办
        <span className="text-muted-foreground">({count})</span>
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function PendingProposalSection({
  count,
  title,
  onOpen,
}: {
  count: number;
  title: string;
  onOpen?: () => void;
}) {
  if (count <= 0 || !onOpen) return null;

  return (
    <div className="mb-2 space-y-1">
      <p className="px-0.5 text-[10px] font-medium text-muted-foreground">
        待确认草案 · {count}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'group flex w-full items-center gap-2 rounded-lg border border-dashed border-border/60 px-2.5 py-2 text-left hover:bg-muted/10',
        )}
      >
        <span className="min-w-0 flex-1 text-xs font-medium text-foreground">{title}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground/80" />
      </button>
    </div>
  );
}

/** 左侧 · 决策队列（设计稿样式） */
export function WorkbenchDecisionQueuePanel({
  tripId,
  items,
  selectedConflictId,
  onSelectConflict,
  decisionProblems,
  decisionCenterOverview,
  decisionCenterOverviewLoading: _decisionCenterOverviewLoading,
  activePacks: _activePacks,
  useDecisionProblemsBff = false,
  selectedProblemId,
  onSelectProblem,
  onPrefetchProblem,
  onPrefetchConflict,
  planningInboxCount = 0,
  onOpenFullPlanningInbox,
  onViewDecision: _onViewDecision,
  decisionProblemsOpenCount,
  decisionProblemsListMeta,
  planningConflictsTotal,
  onOpenPendingProposal,
  pendingProposalCount = 0,
  pendingProposalTitle = '有待确认的行程草案',
  className,
}: WorkbenchDecisionQueuePanelProps) {
  const queueDecisionProblems = useMemo(
    () =>
      decisionProblems?.length
        ? mapDecisionProblemsForQueueDisplay(decisionProblems)
        : undefined,
    [decisionProblems],
  );

  const pending = items.filter((item) => item.priority !== 'pending_confirm');
  const fallbackOpenCount = countOpenDecisionProblems(
    queueDecisionProblems ?? decisionProblems ?? [],
    decisionCenterOverview?.recentDecisions,
  );
  const badgeMeta = pickListMetaForBadge(decisionProblemsListMeta ?? undefined);
  const badgeCount = resolveDecisionListBadgeCount(
    {
      actionableCount: badgeMeta.actionableCount,
      openCount: decisionProblemsOpenCount ?? badgeMeta.openCount,
    },
    fallbackOpenCount,
  );
  const badgeLabel = formatDecisionListBadgeLabel(
    {
      actionableCount: badgeMeta.actionableCount,
      openCount: decisionProblemsOpenCount ?? badgeMeta.openCount,
    },
    fallbackOpenCount,
  );

  if (useDecisionProblemsBff && queueDecisionProblems) {
    const { open: openProblems, resolved: resolvedProblems } = partitionDecisionProblems(
      queueDecisionProblems,
      decisionCenterOverview?.recentDecisions,
    );
    const enforcementBadgeLabel = formatDecisionQueueEnforcementBadgeLabel(openProblems);
    const progressLabel = formatDecisionQueueProgressLabel({
      openCount: openProblems.length,
      resolvedCount: resolvedProblems.length,
    });
    const progressRatio = resolveDecisionQueueProgressRatio({
      openCount: openProblems.length,
      resolvedCount: resolvedProblems.length,
    });
    const queueHeadline = formatWorkbenchDecisionQueueHeadline(
      openProblems,
      decisionCenterOverview,
      decisionProblemsListMeta,
    );

    return (
      <section className={cn('flex min-h-0 flex-col px-3 pt-2', className)}>
        <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2 px-0.5">
          <h3 className={workbenchPanelTitle}>决策队列</h3>
          {enforcementBadgeLabel ? (
            <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-normal">
              {enforcementBadgeLabel}
            </Badge>
          ) : badgeLabel ? (
            <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-normal">
              {badgeLabel}
            </Badge>
          ) : null}
        </div>
        {queueHeadline ? (
          <p className="mb-1.5 shrink-0 px-0.5 text-[11px] leading-snug text-foreground">{queueHeadline}</p>
        ) : null}
        {progressLabel ? (
          <div className="mb-1.5 shrink-0 px-0.5">
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span>{progressLabel}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70 transition-all"
                style={{ width: `${Math.round(progressRatio * 100)}%` }}
              />
            </div>
          </div>
        ) : null}
        <PendingProposalSection
          count={pendingProposalCount}
          title={pendingProposalTitle}
          onOpen={onOpenPendingProposal}
        />
        <DecisionQueueClusterList
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1"
          items={queueDecisionProblems}
          selectedId={selectedProblemId}
          onSelect={(problemId) => onSelectProblem?.(problemId)}
          onPrefetchProblem={onPrefetchProblem}
        />
        <DecisionSurfaceAlignmentDevHint
          problemsOpenCount={decisionProblemsOpenCount ?? badgeMeta.openCount ?? badgeCount}
          conflictsTotal={planningConflictsTotal}
          overviewOpenCount={
            decisionCenterOverview?.totalOpenProblemCount ??
            decisionCenterOverview?.problemCounts.open
          }
          decisionProblems={queueDecisionProblems}
          planningConflicts={items}
        />
        <PlanningInboxFooter count={planningInboxCount} onOpen={onOpenFullPlanningInbox} />
      </section>
    );
  }

  return (
    <section className={cn('flex min-h-0 flex-col px-3 pt-2', className)}>
      <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2 px-0.5">
        <h3 className={workbenchPanelTitle}>决策队列</h3>
        {pending.length > 0 ? (
          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-normal">
            {pending.length} 待决
          </Badge>
        ) : null}
      </div>

      {pending.length === 0 ? (
        <div className={cn(workbenchCard, 'px-3 py-4 text-center text-xs text-muted-foreground')}>
          当前没有待决冲突
        </div>
      ) : (
        <ul className="space-y-1.5">
          {pending.map((item) => {
            const selected = item.id === selectedConflictId;
            const dayLabel =
              item.affectedDays?.length === 1
                ? `Day ${item.affectedDays[0]}`
                : item.affectedDays?.length
                  ? `Day ${item.affectedDays.join('、')}`
                  : null;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectConflict?.(item.id)}
                  onMouseEnter={() => onPrefetchConflict?.(item.id)}
                  onFocus={() => onPrefetchConflict?.(item.id)}
                  className={cn(
                    'group flex w-full items-start gap-2',
                    selected ? workbenchListItemSelected : workbenchListItemIdle,
                  )}
                >
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {dayLabel ? <span className={workbenchQueueDayLabel}>{dayLabel}</span> : null}
                      {dayLabel ? (
                        <span className="text-[10px] text-border" aria-hidden>
                          ·
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'shrink-0 rounded px-1 py-0 text-[10px] font-medium leading-none',
                          workbenchQueueEnforcementBadgeClass(
                            item.priority === 'must_handle' ? 'BLOCK' : 'REQUIRE_ADJUSTMENT',
                          ),
                        )}
                      >
                        {priorityLabel(item.priority)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-foreground">
                      {item.title}
                    </p>
                    {item.message &&
                    item.message.trim() !== item.title.trim() &&
                    !item.title.includes(item.message.trim().slice(0, 12)) ? (
                      <p className="mt-0.5 line-clamp-1 text-[10px] leading-relaxed text-muted-foreground">
                        {item.message.trim()}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <DecisionSurfaceAlignmentDevHint
        conflictsTotal={planningConflictsTotal ?? pending.length}
        planningConflicts={items}
        decisionProblems={decisionProblems}
        overviewOpenCount={
          decisionCenterOverview?.totalOpenProblemCount ??
          decisionCenterOverview?.problemCounts.open
        }
      />
      <PlanningInboxFooter count={planningInboxCount} onOpen={onOpenFullPlanningInbox} />
    </section>
  );
}

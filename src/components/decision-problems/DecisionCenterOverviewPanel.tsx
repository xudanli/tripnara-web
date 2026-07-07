import { useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  decisionCenterOverviewTone,
  resolveDecisionCenterOverviewPresentation,
} from '@/lib/decision-center-overview.util';
import { DecisionCenterPendingDecisionsStrip } from '@/components/decision-problems/DecisionCenterPendingDecisionsStrip';
import { DecisionCenterActivePacksStrip } from '@/components/decision-problems/DecisionCenterActivePacksStrip';
import { trackDecisionCenterViewed } from '@/utils/plan-studio-decision-analytics';
import type { DecisionCenterOverview } from '@/types/decision-problem';
import type { UnifiedDecisionActivePacks } from '@/generated/unified-decision-contracts';

export interface DecisionCenterOverviewPanelProps {
  tripId?: string;
  overview: DecisionCenterOverview | null | undefined;
  loading?: boolean;
  openProblemCount?: number;
  className?: string;
  onViewDecision?: (decisionId: string) => void;
  /** Gateway decision-center 返回的 activePacks（IS/NZ 等 destination.* layer） */
  activePacks?: UnifiedDecisionActivePacks | null;
  /** 工作台左栏：紧凑字号与间距 */
  compact?: boolean;
}

const TONE_CLASS = {
  success: 'border-gate-allow-border bg-gate-allow/15',
  warning: 'border-border bg-muted/15',
  danger: 'border-gate-reject-border bg-gate-reject/15',
  info: 'border-border bg-muted/20 dark:border-border dark:bg-muted/15',
  muted: 'border-border/70 bg-muted/25',
} as const;

export function DecisionCenterOverviewPanel({
  tripId,
  overview,
  loading,
  openProblemCount,
  className,
  onViewDecision,
  activePacks,
  compact = false,
}: DecisionCenterOverviewPanelProps) {
  const presentation = overview
    ? resolveDecisionCenterOverviewPresentation(overview, openProblemCount)
    : null;

  useEffect(() => {
    if (!tripId || !presentation || loading) return;
    trackDecisionCenterViewed({
      tripId,
      overviewState: presentation.state,
      result: presentation.state,
    });
  }, [tripId, presentation?.state, loading]);

  if (loading && !overview) {
    return (
      <div className={cn('flex items-center gap-2 px-1 py-2 text-[11px] text-muted-foreground', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        加载决策总览…
      </div>
    );
  }

  if (!overview || !presentation) return null;

  const tone = decisionCenterOverviewTone(presentation.state);

  return (
    <div
      className={cn(
        'rounded-xl border',
        compact ? 'space-y-2 px-2.5 py-2' : 'space-y-3 px-3.5 py-3',
        TONE_CLASS[tone],
        className,
      )}
    >
      <div className="flex items-start gap-2">
        {presentation.state === 'PASS' ? (
          <CheckCircle2
            className={cn(
              'mt-0.5 shrink-0 text-gate-allow-foreground',
              compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
            )}
          />
        ) : presentation.state === 'APPLYING' ? (
          <Loader2
            className={cn(
              'mt-0.5 shrink-0 animate-spin text-muted-foreground',
              compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
            )}
          />
        ) : null}
        <div className={cn('min-w-0 flex-1', compact ? 'space-y-1' : 'space-y-1.5')}>
          <p
            className={cn(
              'font-semibold leading-snug text-foreground',
              compact ? 'text-xs' : 'text-[13px]',
            )}
          >
            {presentation.headline}
          </p>
          {presentation.state !== 'PASS' ? (
            <div className="flex flex-wrap gap-1.5">
              {presentation.blockCount > 0 ? (
                <span className="rounded-full border border-gate-reject-border/80 bg-background/50 px-2 py-0.5 text-[10px] text-gate-reject-foreground dark:border-gate-reject-border dark:text-gate-reject-foreground">
                  {presentation.blockCount} 阻断
                </span>
              ) : null}
              {presentation.confirmationCount > 0 ? (
                <span className="rounded-full border border-border/80 bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground dark:border-border dark:text-muted-foreground">
                  {presentation.confirmationCount} 待确认
                </span>
              ) : null}
              {presentation.adjustmentCount > 0 ? (
                <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-foreground">
                  {presentation.adjustmentCount} 需调整
                </span>
              ) : null}
              {presentation.warnCount > 0 ? (
                <span className="rounded-full border border-border/70 bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {presentation.warnCount} 风险
                </span>
              ) : null}
              {presentation.executingCount > 0 ? (
                <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-normal">
                  {presentation.executingCount} 执行中
                </Badge>
              ) : null}
              {presentation.resolvedCount > 0 ? (
                <span className="rounded-full border border-border/70 bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {presentation.resolvedCount} 已解决
                </span>
              ) : null}
              {presentation.occurrenceCount > presentation.openCount ? (
                <span className="rounded-full border border-border/70 bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {presentation.occurrenceCount} 处影响
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {presentation.affectedDayNumbers.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          影响天数 · 第 {presentation.affectedDayNumbers.join('、')} 天
        </p>
      ) : null}

      <DecisionCenterActivePacksStrip activePacks={activePacks} compact={compact} />

      <DecisionCenterPendingDecisionsStrip
        recentDecisions={overview.recentDecisions}
        onViewDecision={onViewDecision}
      />
    </div>
  );
}

import { AlertTriangle, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { isDecisionPendingAttention } from '@/generated/decision-semantics-contracts';
import { recentDecisionSnapshotId } from '@/lib/decision-center.util';
import type { DecisionCenterRecentDecisionSnapshot } from '@/types/decision-problem';

export interface DecisionCenterPendingDecisionsStripProps {
  recentDecisions?: DecisionCenterRecentDecisionSnapshot[] | null;
  onViewDecision?: (decisionId: string) => void;
  className?: string;
}

const STATUS_LABEL: Record<string, string> = {
  APPLYING: '执行中',
  PARTIALLY_APPLIED: '部分成功',
  DATA_STALE: '证据过期',
  FAILED: '执行失败',
  ROLLED_BACK: '已回滚',
};

/** DC-FE-007 — L1 recentDecisions 待处理区（不计入 resolved） */
export function DecisionCenterPendingDecisionsStrip({
  recentDecisions,
  onViewDecision,
  className,
}: DecisionCenterPendingDecisionsStripProps) {
  const pending = (recentDecisions ?? []).filter((d) =>
    isDecisionPendingAttention(d.executionStatus, d.needsRepair),
  );

  if (pending.length === 0) return null;

  return (
    <div className={cn('space-y-2 rounded-lg border border-border bg-muted/15 p-2.5 dark:border-border dark:bg-muted/15', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-foreground">执行待处理</p>
        <Badge variant="outline" className="h-5 border-border bg-background/60 text-[10px] font-normal text-foreground">
          {pending.length}
        </Badge>
      </div>
      <ul className="space-y-1.5">
        {pending.map((decision) => {
          const decisionId = recentDecisionSnapshotId(decision);
          const statusKey = String(decision.executionStatus ?? '').toUpperCase();
          const statusLabel = STATUS_LABEL[statusKey] ?? decision.executionStatus;
          const StatusIcon =
            statusKey === 'APPLYING' ? Loader2 : statusKey === 'FAILED' ? AlertTriangle : Clock;
          const iconSpin = statusKey === 'APPLYING';
          return (
            <li key={decisionId}>
              <button
                type="button"
                className="group flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2 text-left transition-colors hover:border-border hover:bg-background dark:border-border"
                onClick={() => onViewDecision?.(decisionId)}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-gate-confirm-foreground dark:bg-muted/20 dark:text-gate-confirm-foreground">
                  <StatusIcon className={cn('h-3.5 w-3.5', iconSpin && 'animate-spin')} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-xs font-medium text-foreground">
                      {decision.title ?? decisionId}
                    </span>
                    {statusLabel ? (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-normal">
                        {statusLabel}
                      </Badge>
                    ) : null}
                    {decision.needsRepair ? (
                      <Badge variant="outline" className="h-4 border-border px-1.5 text-[9px] text-gate-confirm-foreground">
                        需修复
                      </Badge>
                    ) : null}
                  </div>
                  {decision.problemId ? (
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {decision.problemId}
                    </p>
                  ) : null}
                </div>
                {onViewDecision ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

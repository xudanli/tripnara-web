import { Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlanningDecisionClusterSummary } from '@/dto/frontend-planning-decision-pack.types';
import {
  clusterDiagnosticTotal,
  sortDecisionClusterSummaries,
} from '@/dto/frontend-planning-decision-card.util';
import { workbenchCardFlat, workbenchScrollable } from '../workbench-ui';

export interface PlanningDecisionClusterQueueStripProps {
  clusters?: PlanningDecisionClusterSummary[];
  activeProposalId?: string | null;
  loading?: boolean;
  onOpenActiveProposal?: () => void;
  className?: string;
}

/** 快照 copilot.decisionClusters → 队列徽章，点击加载 activeProposal */
export function PlanningDecisionClusterQueueStrip({
  clusters,
  activeProposalId,
  loading = false,
  onOpenActiveProposal,
  className,
}: PlanningDecisionClusterQueueStripProps) {
  const sorted = sortDecisionClusterSummaries(clusters ?? []);
  const hasPendingProposal = Boolean(activeProposalId);
  if (!loading && sorted.length === 0 && !hasPendingProposal) return null;

  const diagnosticTotal = clusterDiagnosticTotal(sorted);

  return (
    <section className={cn(workbenchCardFlat, 'p-3', className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <p className="text-xs font-semibold text-foreground">待确认决策</p>
        </div>
        {diagnosticTotal > 0 ? (
          <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] tabular-nums">
            {diagnosticTotal} 项诊断
          </Badge>
        ) : hasPendingProposal ? (
          <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">
            待确认
          </Badge>
        ) : null}
      </div>

      {loading ? (
        <p className="text-[10px] text-muted-foreground">加载决策队列…</p>
      ) : sorted.length === 0 && hasPendingProposal ? (
        <p className="text-[11px] text-muted-foreground">
          有未确认的编排草案，点下方打开查看。
        </p>
      ) : (
        <ul className={cn('space-y-1.5', workbenchScrollable)}>
          {sorted.map((cluster) => (
            <li key={cluster.id}>
              <button
                type="button"
                className="flex w-full items-start justify-between gap-2 rounded-lg border border-border/55 bg-card px-2.5 py-2 text-left transition-colors hover:bg-muted/15"
                disabled={!activeProposalId || !onOpenActiveProposal}
                onClick={() => onOpenActiveProposal?.()}
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground">{cluster.title}</p>
                  {cluster.dayNumbers?.length ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      第 {cluster.dayNumbers.join('、')} 天
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {cluster.diagnosticCount != null && cluster.diagnosticCount > 0 ? (
                    <Badge variant="outline" className="h-4 rounded-full px-1.5 text-[9px] tabular-nums">
                      {cluster.diagnosticCount}
                    </Badge>
                  ) : null}
                  {cluster.processingLabel ? (
                    <span className="text-[9px] text-muted-foreground">{cluster.processingLabel}</span>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {activeProposalId && onOpenActiveProposal ? (
        <button
          type="button"
          className="mt-2 w-full rounded-md border border-dashed border-border/60 py-1.5 text-[10px] font-medium text-foreground hover:bg-muted/10"
          onClick={() => onOpenActiveProposal()}
        >
          打开完整决策草案
        </button>
      ) : null}
    </section>
  );
}

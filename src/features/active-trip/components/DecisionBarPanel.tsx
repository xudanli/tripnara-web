import { useState } from 'react';
import { AlertTriangle, GitBranch, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ActiveTripDashboard } from '@/types/active-trip-dashboard';
import { useActiveTripDecisionEvent } from '../hooks/useActiveTripDashboard';

type DecisionBarPanelProps = {
  dashboard: ActiveTripDashboard;
  className?: string;
};

/** Decision 条 · Rollback propose / confirm */
export function DecisionBarPanel({ dashboard, className }: DecisionBarPanelProps) {
  const [reason, setReason] = useState('');
  const mutation = useActiveTripDecisionEvent(dashboard.trip.tripId);

  const { viewer, pendingRollback } = dashboard;
  const showBar =
    pendingRollback?.status === 'pending_member_confirm' ||
    viewer.canProposeRollback ||
    viewer.awaitingViewerAction === 'confirm_rollback_proposal';

  if (!showBar && !pendingRollback) return null;

  const run = async (
    body: Parameters<typeof mutation.mutateAsync>[0]
  ) => {
    try {
      await mutation.mutateAsync(body);
      toast.success('决策已更新');
      setReason('');
    } catch {
      toast.error('决策操作失败');
    }
  };

  return (
    <section
      className={cn(
        'rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3.5 text-sm',
        className
      )}
      aria-label="Decision 决策条"
    >
      <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
        <GitBranch className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden />
        路线决策 · Rollback
      </h3>

      {pendingRollback?.status === 'pending_member_confirm' && (
        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <div>
              <p className="font-medium text-foreground">队长发起路线 rollback 提案</p>
              <p className="mt-1 text-muted-foreground">{pendingRollback.reasonZh}</p>
            </div>
          </div>
          {viewer.role === 'member' && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={mutation.isPending}
                onClick={() =>
                  void run({
                    type: 'route_rollback',
                    action: 'confirm',
                    proposalId: pendingRollback.proposalId,
                  })
                }
              >
                {mutation.isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : null}
                确认 rollback
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() =>
                  void run({
                    type: 'route_rollback',
                    action: 'protest',
                    proposalId: pendingRollback.proposalId,
                  })
                }
              >
                异议 / 拒绝
              </Button>
            </div>
          )}
          {viewer.role === 'captain' && (
            <Badge variant="outline" className="text-[10px] font-normal">
              等待队员确认
            </Badge>
          )}
        </div>
      )}

      {viewer.canProposeRollback && !pendingRollback && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">说明 rollback 原因后提交全队确认流程。</p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例：D3 涉水窗口关闭，需改线至备用 hut…"
            rows={2}
            className="text-sm"
          />
          <Button
            size="sm"
            disabled={mutation.isPending || reason.trim().length < 4}
            onClick={() =>
              void run({
                type: 'route_rollback',
                action: 'propose',
                planBRef: 'rain-shelter-detour-v2',
                reasonZh: reason.trim(),
              })
            }
          >
            {mutation.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : null}
            发起 Rollback 提案
          </Button>
        </div>
      )}
    </section>
  );
}

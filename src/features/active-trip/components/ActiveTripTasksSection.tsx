import { CheckCircle2, ListChecks, RotateCcw, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ActiveTripDashboard } from '@/types/active-trip-dashboard';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';
import { collaborativeTasksApi } from '@/api/collaborative-tasks';
import { decisionDnaApi } from '@/api/decision-dna';
import { useQueryClient } from '@tanstack/react-query';
import { triggerDecisionDnaConsentNudge } from '@/lib/decision-dna-consent-nudge';
import { activeTripQueryKey, decisionReplayQueryKey } from '../hooks/useActiveTripDashboard';
import { useState } from 'react';

const STATUS_LABELS: Record<CollaborativeTaskView['status'], string> = {
  pending: '待确认',
  confirmed: '已确认',
  rolled_back: '已回滚',
  timed_out: '已超时',
};

type ActiveTripTasksSectionProps = {
  dashboard: ActiveTripDashboard;
  className?: string;
};

function TaskRow({
  task,
  tripId,
  viewerUserId,
  highlight,
  onDone,
}: {
  task: CollaborativeTaskView;
  tripId: string;
  viewerUserId: string;
  highlight: boolean;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const isAssignee = task.assigneeUserId === viewerUserId;
  const canAct = task.status === 'pending' && (isAssignee || highlight);

  const run = async (action: 'confirm' | 'rollback' | 'ack_timeout') => {
    setPending(true);
    try {
      await collaborativeTasksApi.postEvent(tripId, task.id, { action });
      toast.success(action === 'confirm' ? '任务已确认' : action === 'rollback' ? '已回滚' : '已记录超时');
      if (action === 'rollback') {
        void triggerDecisionDnaConsentNudge(() => decisionDnaApi.getConsent());
      }
      onDone();
    } catch {
      toast.error('任务更新失败');
    } finally {
      setPending(false);
    }
  };

  return (
    <li
      className={cn(
        'rounded-lg border px-3 py-2.5',
        highlight ? 'border-primary/40 bg-primary/5' : 'border-border/60'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{task.title}</p>
          {task.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>
          )}
          {task.assigneeLabel && (
            <p className="mt-1 text-xs text-muted-foreground">负责人 · {task.assigneeLabel}</p>
          )}
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
          {STATUS_LABELS[task.status]}
        </Badge>
      </div>

      {canAct && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={pending} onClick={() => void run('confirm')}>
            <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />
            确认
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={pending} onClick={() => void run('rollback')}>
            <RotateCcw className="mr-1 h-3 w-3" aria-hidden />
            回滚
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={pending} onClick={() => void run('ack_timeout')}>
            <Timer className="mr-1 h-3 w-3" aria-hidden />
            超时
          </Button>
        </div>
      )}
    </li>
  );
}

/** 行前/行中协同任务 · 聚合 dashboard 数据 */
export function ActiveTripTasksSection({ dashboard, className }: ActiveTripTasksSectionProps) {
  const qc = useQueryClient();
  const { collaborativeTasks, taskSummary, viewer, trip } = dashboard;
  const showCta = viewer.awaitingViewerAction === 'complete_assigned_task';

  if (!collaborativeTasks.length) return null;

  const refetchActive = () => {
    void qc.invalidateQueries({ queryKey: activeTripQueryKey(trip.tripId) });
    void qc.invalidateQueries({ queryKey: decisionReplayQueryKey(trip.tripId) });
  };

  return (
    <section
      className={cn('rounded-xl border border-border bg-card px-4 py-3.5 text-sm shadow-sm', className)}
      aria-label="协同任务"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
            <ListChecks className="h-4 w-4 text-primary" aria-hidden />
            协同任务
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            待办 {taskSummary.pending} · 已确认 {taskSummary.confirmed} · 共 {taskSummary.total}
          </p>
        </div>
        {showCta && (
          <Badge className="bg-primary/90 text-[10px] font-normal">待你完成 {taskSummary.assignedToViewer} 项</Badge>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {collaborativeTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            tripId={trip.tripId}
            viewerUserId={viewer.userId}
            highlight={
              showCta &&
              task.status === 'pending' &&
              task.assigneeUserId === viewer.userId
            }
            onDone={refetchActive}
          />
        ))}
      </ul>
    </section>
  );
}

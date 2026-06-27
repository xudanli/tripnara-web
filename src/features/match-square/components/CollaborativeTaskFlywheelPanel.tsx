import { useMemo } from 'react';
import { CheckCircle2, Loader2, RotateCcw, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  CollaborativeTaskFlywheelMetadata,
  CollaborativeTaskView,
} from '@/types/collaborative-task-flywheel';
import {
  useCollaborativeTaskEvent,
  useCollaborativeTasks,
} from '../hooks/useCollaborativeTasks';
import { decisionDnaApi } from '@/api/decision-dna';
import { triggerDecisionDnaConsentNudge } from '@/lib/decision-dna-consent-nudge';

const STATUS_LABELS: Record<CollaborativeTaskView['status'], string> = {
  pending: '待确认',
  confirmed: '已确认',
  rolled_back: '已回滚',
  timed_out: '已超时',
};

type CollaborativeTaskFlywheelPanelProps = {
  tripId: string;
  /** Phase 1：只读；Phase 2：允许 confirm / rollback */
  interactive?: boolean;
  /** 从 GET /trips/:id metadata 直读 */
  metadataFlywheel?: CollaborativeTaskFlywheelMetadata | null;
  className?: string;
};

function TaskCard({
  task,
  interactive,
  tripId,
  onMutated,
}: {
  task: CollaborativeTaskView;
  interactive: boolean;
  tripId: string;
  onMutated: () => void;
}) {
  const eventMutation = useCollaborativeTaskEvent(tripId);

  const runEvent = async (action: 'confirm' | 'rollback' | 'ack_timeout') => {
    try {
      await eventMutation.mutateAsync({ taskId: task.id, body: { action } });
      toast.success(action === 'confirm' ? '任务已确认' : action === 'rollback' ? '任务已回滚' : '已记录超时');
      if (action === 'rollback') {
        void triggerDecisionDnaConsentNudge(() => decisionDnaApi.getConsent());
      }
      onMutated();
    } catch {
      toast.error('任务状态更新失败');
    }
  };

  const pending = task.status === 'pending';

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
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

      {interactive && pending && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={eventMutation.isPending}
            onClick={() => void runEvent('confirm')}
          >
            <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />
            确认
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={eventMutation.isPending}
            onClick={() => void runEvent('rollback')}
          >
            <RotateCcw className="mr-1 h-3 w-3" aria-hidden />
            回滚修订
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            disabled={eventMutation.isPending}
            onClick={() => void runEvent('ack_timeout')}
          >
            <Timer className="mr-1 h-3 w-3" aria-hidden />
            标记超时
          </Button>
        </div>
      )}

      {(task.behaviorLog?.length ?? 0) > 0 && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          行为日志 {task.behaviorLog!.length} 条
        </p>
      )}
    </div>
  );
}

/** §3.13 · 行中协同任务飞轮 */
export function CollaborativeTaskFlywheelPanel({
  tripId,
  interactive = false,
  metadataFlywheel,
  className,
}: CollaborativeTaskFlywheelPanelProps) {
  const { data, isLoading, refetch } = useCollaborativeTasks(tripId, {
    enabled: Boolean(tripId),
  });

  const flywheel = data?.flywheel ?? metadataFlywheel ?? null;
  const tasks = useMemo(() => {
    if (data?.tasks?.length) return data.tasks;
    if (metadataFlywheel?.tasks?.length) return metadataFlywheel.tasks;
    return flywheel?.tasks ?? [];
  }, [data?.tasks, flywheel?.tasks, metadataFlywheel?.tasks]);

  if (isLoading && !tasks.length) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        加载协同任务…
      </div>
    );
  }

  if (!tasks.length) return null;

  return (
    <section
      className={cn('rounded-xl border border-border bg-card px-4 py-3.5 text-sm shadow-sm', className)}
      aria-label="协同任务飞轮"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">待确认的协作事项</h3>
        <Badge variant="outline" className="text-[10px] font-normal tabular-nums">
          {tasks.length} 条
        </Badge>
      </div>
      {flywheel?.dispatchedAt && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          派发于 {new Date(flywheel.dispatchedAt).toLocaleString('zh-CN')}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            tripId={tripId}
            interactive={interactive}
            onMutated={() => void refetch()}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * route_and_run：ui_display.open_world_discovery
 * provisional POI ≠ 已落地 placeId — 核实任务 + 留白说明，勿当作普通 POI 导航。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  applyOpenWorldVerificationDiscardStub,
  applyOpenWorldVerificationMarkVerified,
  openWorldVerificationErrorMessage,
} from '@/lib/open-world-discovery-writeback';
import {
  constraintTagLabel,
  countDoneVerificationTasks,
  countPendingVerificationTasks,
  isVerificationTaskActionable,
  priorityLabel,
  sortVerificationTasks,
  statusLabel,
} from '@/lib/open-world-discovery-ui';
import type {
  OpenWorldDiscoveryPayload,
  OpenWorldVerificationTask,
} from '@/types/open-world-discovery';
import { CheckCircle2, Compass, Loader2, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';

export interface OpenWorldDiscoveryPanelProps {
  discovery: OpenWorldDiscoveryPayload;
  disabled?: boolean;
  className?: string;
}

type BusyAction = 'mark_verified' | 'discard_stub';

const PRIORITY_STYLES: Record<string, string> = {
  P0: 'border-gate-reject-border/35 bg-gate-reject/45 dark:bg-gate-reject/20',
  P1: 'border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20',
};

function VerificationTaskRow({
  task,
  disabled,
  busyAction,
  onMarkVerified,
  onDiscard,
}: {
  task: OpenWorldVerificationTask;
  disabled?: boolean;
  busyAction: BusyAction | null;
  onMarkVerified: (task: OpenWorldVerificationTask) => void;
  onDiscard: (task: OpenWorldVerificationTask) => void;
}) {
  const actionable = isVerificationTaskActionable(task);
  const priority = String(task.priority);
  const rowStyle = PRIORITY_STYLES[priority] ?? 'border-border/70 bg-muted/15';
  const isDone = task.status === 'done';
  const isBusy = busyAction != null;

  return (
    <div
      className={cn(
        'rounded-lg border border-dashed px-3 py-2.5',
        rowStyle,
        isDone && 'opacity-80 border-solid'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {isDone ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-gate-allow-foreground shrink-0" aria-hidden />
            ) : priority === 'P0' ? (
              <ShieldAlert className="h-3.5 w-3.5 text-gate-reject-foreground shrink-0" aria-hidden />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden />
            )}
            <span className="text-sm font-medium text-foreground">{task.title_zh}</span>
            {!isDone ? (
              <Badge variant="outline" className="text-[10px] h-5 border-dashed">
                待核实
              </Badge>
            ) : null}
            <Badge variant="outline" className="text-[10px] h-5">
              {priorityLabel(task.priority)}
            </Badge>
            <Badge
              variant={isDone ? 'secondary' : 'outline'}
              className={cn(
                'text-[10px] h-5',
                isDone && 'border-gate-allow-border/30 text-gate-allow-foreground dark:text-gate-allow-foreground'
              )}
            >
              {statusLabel(task.status)}
            </Badge>
          </div>
          {task.description_zh ? (
            <p className="text-xs text-muted-foreground leading-relaxed">{task.description_zh}</p>
          ) : null}
          {task.constraint_tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {task.constraint_tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] h-5 font-normal">
                  {constraintTagLabel(tag)}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        {actionable ? (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={disabled || isBusy}
              onClick={() => onMarkVerified(task)}
            >
              {busyAction === 'mark_verified' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : null}
              {task.cta_label_zh?.trim() || '标记已核实'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-destructive"
              disabled={disabled || isBusy}
              onClick={() => onDiscard(task)}
            >
              {busyAction === 'discard_stub' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              )}
              丢弃占位
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function OpenWorldDiscoveryPanel({
  discovery,
  disabled,
  className,
}: OpenWorldDiscoveryPanelProps) {
  const [localDiscovery, setLocalDiscovery] = useState(discovery);
  const [busy, setBusy] = useState<{ taskId: string; action: BusyAction } | null>(null);

  useEffect(() => {
    setLocalDiscovery(discovery);
  }, [discovery]);

  const tasks = useMemo(
    () => sortVerificationTasks(localDiscovery.verification_tasks),
    [localDiscovery.verification_tasks]
  );

  const pendingCount = countPendingVerificationTasks(localDiscovery);
  const doneCount = countDoneVerificationTasks(localDiscovery);

  const applyVerification = useCallback(
    async (task: OpenWorldVerificationTask, action: BusyAction) => {
      setBusy({ taskId: task.task_id, action });
      try {
        const result =
          action === 'mark_verified'
            ? await applyOpenWorldVerificationMarkVerified({ discovery: localDiscovery, task })
            : await applyOpenWorldVerificationDiscardStub({ discovery: localDiscovery, task });

        if (result.status === 'REJECTED') {
          toast.error(
            openWorldVerificationErrorMessage(
              result,
              action === 'mark_verified' ? '核实失败' : '丢弃失败'
            )
          );
          return;
        }

        if (result.open_world_discovery) {
          setLocalDiscovery(result.open_world_discovery);
        }
        toast.success(
          action === 'mark_verified'
            ? result.updated_stub?.status === 'promoted'
              ? '已核实并提升为正式 POI'
              : '已标记核实'
            : '已丢弃占位 stub'
        );
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : action === 'mark_verified'
              ? '核实回写失败，请稍后重试'
              : '丢弃失败，请稍后重试';
        toast.error(msg);
      } finally {
        setBusy(null);
      }
    },
    [localDiscovery]
  );

  if (!tasks.length) return null;

  return (
    <Card className={cn('border-border/80 bg-card/60', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" aria-hidden />
          开放世界核实
          {localDiscovery.sparse_profile_id ? (
            <Badge variant="outline" className="text-[10px] h-5 font-normal">
              {localDiscovery.sparse_profile_id}
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription className="text-xs space-y-1.5">
          <span className="block text-muted-foreground">
            稀疏区 provisional stub 须出发前核实；勿当作已落地 POI 一键导航。
          </span>
          <span>
            提及 {localDiscovery.mention_count} 处 · stub {localDiscovery.stub_count} 个 · 已核实{' '}
            {doneCount}/{tasks.length}
            {pendingCount > 0 ? ` · 待办 ${pendingCount}` : ''}
          </span>
          {localDiscovery.intentional_slack_summary_zh ? (
            <span className="block rounded-md border border-dashed border-border/30 bg-muted/15 px-2 py-1.5 text-foreground/85 leading-relaxed dark:bg-muted/15">
              {localDiscovery.intentional_slack_summary_zh}
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task) => (
          <VerificationTaskRow
            key={task.task_id}
            task={task}
            disabled={disabled}
            busyAction={busy?.taskId === task.task_id ? busy.action : null}
            onMarkVerified={(t) => applyVerification(t, 'mark_verified')}
            onDiscard={(t) => applyVerification(t, 'discard_stub')}
          />
        ))}
      </CardContent>
    </Card>
  );
}

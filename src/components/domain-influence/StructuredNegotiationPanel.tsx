import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { Clock, Handshake, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useDomainNegotiationTasks } from '@/hooks/useDomainNegotiationTasks';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import {
  crossLevelBadgeClass,
  CROSS_LEVEL_LABEL,
  domainPanelHeader,
  domainPanelShell,
  negotiationStatusClass,
} from './domain-influence-ui';
import {
  workbenchCardFlat,
  workbenchListItemIdle,
  workbenchListItemSelected,
} from '@/components/plan-studio/workbench/workbench-ui';
import { findNegotiationTaskForSelection } from '@/lib/collab-negotiation-selection.util';
import { PreferenceRoundDiscussionPanel } from './PreferenceRoundDiscussionPanel';
import { VoiceGuardBanner } from './VoiceGuardBanner';

function TaskListItem({
  task,
  selected,
  onSelect,
}: {
  task: DomainNegotiationTask;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left',
        selected ? workbenchListItemSelected : workbenchListItemIdle,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium truncate">{task.title}</span>
        <Badge variant="outline" className={cn('shrink-0 text-[10px] font-normal', negotiationStatusClass(task.status))}>
          {task.statusLabel}
        </Badge>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
        <Badge variant="outline" className={cn('text-[9px] px-1 py-0 font-normal', crossLevelBadgeClass(task.crossLevel))}>
          {CROSS_LEVEL_LABEL[task.crossLevel]}
        </Badge>
        {task.closesAt ? (
          <span className="inline-flex items-center gap-0.5 tabular-nums">
            <Clock className="h-3 w-3" />
            {format(new Date(task.closesAt), 'MM/dd HH:mm')}
          </span>
        ) : null}
        {task.status === 'in_discussion' && task.activeRoundId ? (
          <span className="text-gate-confirm-foreground">讨论进行中</span>
        ) : null}
      </div>
    </button>
  );
}

interface StructuredNegotiationPanelProps {
  tripId: string;
  className?: string;
  /** 深链或 Agent 导航传入的轮次 ID */
  initialRoundId?: string | null;
  /** 深链传入的领域，用于刷新后恢复左侧任务选中 */
  initialRoundDomain?: string | null;
  /** 协作中心决策队列 · 精确选中 negotiation task id */
  initialNegotiationTaskId?: string | null;
  /** 弹窗/深链场景：允许同步 roundId 到 URL（不要求 tab=team） */
  allowUrlSync?: boolean;
  /** 协作中心布局：隐藏左侧任务列表，仅展示讨论主舞台 */
  hideTaskList?: boolean;
  /** 协作中心主舞台增强（进度轴 / 选项对比 / 底栏） */
  collabStage?: boolean;
  onStartVote?: () => void;
  onGenerateCompromise?: () => void;
  onDiscussWithAssistant?: () => void;
  voteActionDisabled?: boolean;
}

function findTaskForRound(
  tasks: DomainNegotiationTask[],
  roundId: string | null | undefined,
  roundDomain: string | null | undefined,
  negotiationTaskId?: string | null,
): DomainNegotiationTask | undefined {
  return findNegotiationTaskForSelection(tasks, {
    negotiationTaskId,
    roundId,
    roundDomain,
  });
}

export function StructuredNegotiationPanel({
  tripId,
  className,
  initialRoundId,
  initialRoundDomain,
  initialNegotiationTaskId,
  allowUrlSync = false,
  hideTaskList = false,
  collabStage = false,
  onStartVote,
  onGenerateCompromise,
  onDiscussWithAssistant,
  voteActionDisabled,
}: StructuredNegotiationPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: tasks = [], isLoading, refetch, isFetching } = useDomainNegotiationTasks(tripId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedRoundId, setFocusedRoundId] = useState<string | null>(initialRoundId ?? null);
  const restoredFromUrlRef = useRef(false);

  const isCollabCenterActive =
    searchParams.get('collab') === '1' || searchParams.get('tab') === 'team';
  const canSyncRoundToUrl = allowUrlSync || isCollabCenterActive;
  const isCollabQueueDriven = hideTaskList && collabStage;
  const urlRoundId = initialRoundId ?? searchParams.get('roundId');
  const urlRoundDomain = initialRoundDomain ?? searchParams.get('roundDomain');
  const urlNegotiationTaskId =
    initialNegotiationTaskId ?? searchParams.get('negotiationTaskId');

  const syncRoundToUrl = (roundId: string | null, domain?: string | null, taskId?: string | null) => {
    if (!canSyncRoundToUrl) return;
    const next = new URLSearchParams(searchParams);
    if (roundId) next.set('roundId', roundId);
    else next.delete('roundId');
    if (domain) next.set('roundDomain', domain);
    else next.delete('roundDomain');
    if (taskId) next.set('negotiationTaskId', taskId);
    else next.delete('negotiationTaskId');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!tasks.length) return;

    const roundId = initialRoundId ?? searchParams.get('roundId');
    const roundDomain = initialRoundDomain ?? searchParams.get('roundDomain');
    const negotiationTaskId =
      initialNegotiationTaskId ?? searchParams.get('negotiationTaskId');
    const match = findTaskForRound(tasks, roundId, roundDomain, negotiationTaskId);

    if (match) {
      setSelectedId(match.id);
      const effectiveRoundId =
        match.status === 'in_discussion' ? (roundId ?? match.activeRoundId ?? null) : null;
      setFocusedRoundId(effectiveRoundId);
      if (canSyncRoundToUrl && roundId && !effectiveRoundId) {
        syncRoundToUrl(null, null);
      }
      restoredFromUrlRef.current = true;
      return;
    }

    if (roundId && canSyncRoundToUrl) {
      syncRoundToUrl(null, null);
    }

    if (!restoredFromUrlRef.current && tasks[0]) {
      setSelectedId(tasks[0].id);
      setFocusedRoundId(
        tasks[0].status === 'in_discussion' ? (tasks[0].activeRoundId ?? null) : null,
      );
      restoredFromUrlRef.current = true;
    }
  }, [initialRoundId, initialRoundDomain, initialNegotiationTaskId, tasks, searchParams, canSyncRoundToUrl]);

  useEffect(() => {
    const onSelectRound = (event: Event) => {
      const detail = (event as CustomEvent<{ tripId?: string; roundId?: string; domain?: string }>).detail;
      if (detail?.tripId !== tripId) return;
      void refetch();
      if (!detail.roundId) return;
      setFocusedRoundId(detail.roundId);
      const match = findTaskForRound(tasks, detail.roundId, detail.domain ?? null, null);
      if (match) {
        setSelectedId(match.id);
        syncRoundToUrl(detail.roundId, match.domain, match.id);
      }
    };
    window.addEventListener('plan-studio:select-preference-round', onSelectRound);
    return () => window.removeEventListener('plan-studio:select-preference-round', onSelectRound);
  }, [tripId, tasks, refetch, searchParams, setSearchParams]);

  const selectedTask = useMemo(() => {
    if (isCollabQueueDriven) {
      const match = findTaskForRound(
        tasks,
        urlRoundId,
        urlRoundDomain,
        urlNegotiationTaskId,
      );
      if (match) return match;
    }
    return tasks.find((t) => t.id === selectedId) ?? tasks[0] ?? null;
  }, [
    tasks,
    selectedId,
    isCollabQueueDriven,
    urlRoundId,
    urlRoundDomain,
    urlNegotiationTaskId,
  ]);

  const activeRoundId = useMemo(() => {
    if (!selectedTask || selectedTask.status !== 'in_discussion') return null;
    if (isCollabQueueDriven) {
      return urlRoundId ?? selectedTask.activeRoundId ?? null;
    }
    return focusedRoundId ?? selectedTask.activeRoundId ?? null;
  }, [selectedTask, isCollabQueueDriven, urlRoundId, focusedRoundId]);

  useEffect(() => {
    if (isCollabQueueDriven) return;
    if (!focusedRoundId && selectedTask?.activeRoundId) {
      setFocusedRoundId(selectedTask.activeRoundId);
    }
  }, [isCollabQueueDriven, selectedTask?.activeRoundId, focusedRoundId]);

  const handleSelectTask = (task: DomainNegotiationTask) => {
    setSelectedId(task.id);
    const roundId = task.status === 'in_discussion' ? (task.activeRoundId ?? null) : null;
    setFocusedRoundId(roundId);
    syncRoundToUrl(roundId, task.domain, task.id);
    if (task.status === 'in_discussion' && !task.activeRoundId) {
      void refetch();
    }
  };

  useEffect(() => {
    if (!selectedTask || selectedTask.status !== 'in_discussion' || selectedTask.activeRoundId) return;
    void refetch();
  }, [selectedTask?.id, selectedTask?.status, selectedTask?.activeRoundId, refetch]);

  useEffect(() => {
    if (isCollabQueueDriven) return;
    if (!selectedTask?.activeRoundId) return;
    setFocusedRoundId((prev) => prev ?? selectedTask.activeRoundId ?? null);
  }, [isCollabQueueDriven, selectedTask?.activeRoundId]);

  useEffect(() => {
    if (!canSyncRoundToUrl || isCollabQueueDriven) return;
    if (!selectedTask || !activeRoundId) return;
    if (searchParams.get('roundId') === activeRoundId) return;
    syncRoundToUrl(activeRoundId, selectedTask.domain, selectedTask.id);
  }, [canSyncRoundToUrl, isCollabQueueDriven, selectedTask, activeRoundId, searchParams, setSearchParams]);

  if (isLoading) {
    return (
      <div className={cn('flex justify-center py-10', className)}>
        <Spinner className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <section className={cn(domainPanelShell, className)}>
        <div className={cn(domainPanelHeader, 'flex items-center justify-between gap-2')}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-muted/40">
              <Handshake className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">结构化协商</h3>
              <p className="text-xs text-muted-foreground">Round Robin 偏好分享 · 中/高交叉领域</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={cn('mr-1 h-3.5 w-3.5', isFetching && 'animate-spin')} />
            刷新
          </Button>
        </div>
        <div className="px-5 py-6 space-y-2 text-sm text-muted-foreground">
          <p>暂无可协商的中/高交叉领域任务。</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>常见可进列表：目的地、住宿、活动、餐饮</li>
            <li>大交通、购物等低交叉领域不会出现在此列表</li>
            <li>需至少 1 人认领领域后，任务才会进入「讨论中」并开启偏好轮次</li>
            <li>行程成员需 ≥ 2 人</li>
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className={cn(collabStage ? workbenchCardFlat : domainPanelShell, className)}>
      {!isCollabQueueDriven ? (
        <div className={cn(domainPanelHeader, 'flex items-center justify-between gap-2')}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-muted/40">
              <Handshake className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">结构化协商</h3>
              <p className="text-xs text-muted-foreground">Round Robin 偏好分享 · 中/高交叉领域</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={cn('mr-1 h-3.5 w-3.5', isFetching && 'animate-spin')} />
            刷新
          </Button>
        </div>
      ) : null}

      <div className={cn(isCollabQueueDriven ? 'px-4 pt-3' : 'px-5 pt-4', hideTaskList && !isCollabQueueDriven && 'pt-0')}>
        <VoiceGuardBanner tripId={tripId} />
      </div>

      <div
        className={cn(
          isCollabQueueDriven ? 'p-4 pt-2' : 'gap-4 p-5 pt-3',
          hideTaskList && !isCollabQueueDriven ? 'block' : !isCollabQueueDriven ? 'grid lg:grid-cols-[minmax(200px,260px)_1fr]' : 'block',
        )}
      >
        {!hideTaskList ? (
          <ul className="space-y-2" aria-label="协商任务列表">
            {tasks.map((task) => (
              <li key={task.id}>
                <TaskListItem
                  task={task}
                  selected={selectedTask?.id === task.id}
                  onSelect={() => handleSelectTask(task)}
                />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="min-h-[200px]">
          {selectedTask ? (
            <PreferenceRoundDiscussionPanel
              tripId={tripId}
              task={selectedTask}
              roundId={activeRoundId}
              onRequestTaskRefresh={() => void refetch()}
              onRefresh={() => void refetch()}
              refreshing={isFetching}
              collabStage={collabStage}
              onStartVote={onStartVote}
              onGenerateCompromise={onGenerateCompromise}
              onDiscussWithAssistant={onDiscussWithAssistant}
              voteActionDisabled={voteActionDisabled}
            />
          ) : (
            <p className="text-sm text-muted-foreground">选择左侧任务查看讨论区</p>
          )}
        </div>
      </div>
    </section>
  );
}

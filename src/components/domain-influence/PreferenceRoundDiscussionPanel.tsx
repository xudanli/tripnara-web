import { useState } from 'react';
import { format } from 'date-fns';
import { Clock, MessageSquare, Mic, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePreferenceRound } from '@/hooks/usePreferenceRound';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { PreferenceRoundUtterance } from '@/types/process-fairness';
import { HeardVoteForm } from './HeardVoteForm';
import { DomainIcon, negotiationStatusClass } from './domain-influence-ui';
import { NegotiationDomainClaimEntry } from './NegotiationDomainClaimEntry';
import { CollabNegotiationStageView } from '@/components/team-collaboration/widgets/CollabNegotiationStageView';
import { workbenchInsetPanel } from '@/components/plan-studio/workbench/workbench-ui';

function roundStatusClass(status: string): string {
  switch (status) {
    case 'closed':
      return 'bg-gate-allow/40 text-gate-allow-foreground border-gate-allow-border';
    case 'synthesizing':
      return 'bg-gate-confirm/30 text-gate-confirm-foreground border-gate-confirm-border';
    default:
      return 'bg-muted/40 text-muted-foreground border-border';
  }
}

function UtteranceBubble({ utterance }: { utterance: PreferenceRoundUtterance }) {
  const isVoice = utterance.modality === 'voice';
  const isMedia = utterance.modality === 'image' || utterance.modality === 'link';

  return (
    <div className={cn(workbenchInsetPanel, 'px-3 py-2')}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-sm font-medium">{utterance.displayName}</span>
          {utterance.viaProxy ? (
            <Badge variant="outline" className="px-1 py-0 text-[9px] font-normal">
              代述
            </Badge>
          ) : null}
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {format(new Date(utterance.createdAt), 'HH:mm')}
        </span>
      </div>
      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {isVoice ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Mic className="h-3.5 w-3.5" />
            语音发言
            {utterance.content ? (
              <a href={utterance.content} target="_blank" rel="noreferrer" className="underline">
                播放
              </a>
            ) : null}
          </span>
        ) : isMedia ? (
          <a href={utterance.content} target="_blank" rel="noreferrer" className="underline">
            {utterance.modality === 'image' ? '查看图片' : '打开链接'}
          </a>
        ) : (
          utterance.content
        )}
      </div>
      {utterance.reason ? (
        <p className="mt-1.5 text-xs text-muted-foreground">理由：{utterance.reason}</p>
      ) : null}
    </div>
  );
}

interface PreferenceRoundDiscussionPanelProps {
  tripId: string;
  task: DomainNegotiationTask;
  roundId: string | null;
  className?: string;
  onRequestTaskRefresh?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  collabStage?: boolean;
  onStartVote?: () => void;
  onGenerateCompromise?: () => void;
  onDiscussWithAssistant?: () => void;
  voteActionDisabled?: boolean;
}

export function PreferenceRoundDiscussionPanel({
  tripId,
  task,
  roundId,
  className,
  onRequestTaskRefresh,
  onRefresh,
  refreshing,
  collabStage = false,
  onStartVote,
  onGenerateCompromise,
  onDiscussWithAssistant,
  voteActionDisabled,
}: PreferenceRoundDiscussionPanelProps) {
  const { user } = useAuth();
  const { detail, loading, submitting, submitUtterance, submitHeardVotes, reload } =
    usePreferenceRound(tripId, roundId);
  const [content, setContent] = useState('');
  const [reason, setReason] = useState('');

  if (collabStage) {
    if (loading && roundId && !detail) {
      return (
        <div className={cn('flex justify-center py-12', className)}>
          <Spinner className="h-5 w-5 text-muted-foreground" />
        </div>
      );
    }

    return (
      <CollabNegotiationStageView
        tripId={tripId}
        task={task}
        detail={detail}
        roundId={roundId}
        submitting={submitting}
        currentUserId={user?.id}
        onRequestTaskRefresh={onRequestTaskRefresh}
        onRefresh={onRefresh ?? (() => void reload())}
        refreshing={refreshing}
        onSubmitUtterance={async (payload) => {
          await submitUtterance({
            modality: 'text',
            content: payload.content,
            reason: payload.reason,
          });
        }}
        onSubmitHeardVotes={(votes) => void submitHeardVotes({ votes })}
        onStartVote={onStartVote}
        onGenerateCompromise={onGenerateCompromise}
        onDiscussWithAssistant={onDiscussWithAssistant}
        voteActionDisabled={voteActionDisabled}
        className={className}
      />
    );
  }

  if (!roundId) {
    return (
      <div className={cn(workbenchInsetPanel, 'p-4', className)}>
        <TaskSummary task={task} />
        <p className="mt-3 text-sm text-muted-foreground">
          {task.status === 'in_discussion'
            ? '正在为你准备偏好分享轮次…（成员 ≥ 2 时，刷新任务列表即可获取讨论区）'
            : task.status === 'pending'
              ? '该领域尚无人认领。认领领域负责人后，将开启 Round Robin 偏好分享。'
              : '选择「讨论中」的任务查看 Round Robin 发言区。'}
        </p>
        {task.status === 'pending' ? (
          <NegotiationDomainClaimEntry
            tripId={tripId}
            domain={task.domain}
            domainLabel={task.title}
            onClaimed={onRequestTaskRefresh}
          />
        ) : null}
        {task.status === 'in_discussion' && onRequestTaskRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => onRequestTaskRefresh()}
          >
            刷新任务列表
          </Button>
        ) : null}
      </div>
    );
  }

  if (loading && !detail) {
    return (
      <div className={cn('flex justify-center py-12', className)}>
        <Spinner className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={cn(workbenchInsetPanel, 'p-4', className)}>
        <TaskSummary task={task} />
        <p className="mt-3 text-sm text-muted-foreground">无法加载讨论区，请稍后刷新。</p>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void reload()}>
          重试
        </Button>
      </div>
    );
  }

  const handleSubmitUtterance = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const result = await submitUtterance({
      modality: 'text',
      content: trimmed,
      reason: reason.trim() || undefined,
    });
    if (result) {
      setContent('');
      setReason('');
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <TaskSummary task={task} />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn('text-[10px] font-normal', roundStatusClass(detail.status))}>
          {detail.statusLabel}
        </Badge>
        {detail.currentSpeakerDisplayName && detail.status === 'collecting' ? (
          <span className="text-xs text-muted-foreground">
            当前发言：<span className="font-medium text-foreground">{detail.currentSpeakerDisplayName}</span>
          </span>
        ) : null}
        {detail.closesAt ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground">
            <Clock className="h-3 w-3" />
            截止 {format(new Date(detail.closesAt), 'MM/dd HH:mm')}
          </span>
        ) : null}
      </div>

      <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1" aria-label="发言记录">
        {detail.utterances.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">尚无发言，轮到你了就开始吧。</p>
        ) : (
          detail.utterances.map((u) => <UtteranceBubble key={u.id} utterance={u} />)
        )}
      </div>

      {detail.status === 'collecting' && detail.canSpeak ? (
        <div className={cn(workbenchInsetPanel, 'space-y-2 p-2.5')}>
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            轮到你发言了
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="分享你的偏好…"
            rows={2}
            disabled={submitting}
            className="min-h-0 resize-none"
          />
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="可选：补充理由"
            rows={1}
            disabled={submitting}
            className="min-h-0 resize-none"
          />
          <Button
            type="button"
            size="sm"
            disabled={!content.trim() || submitting}
            onClick={() => void handleSubmitUtterance()}
          >
            {submitting ? '提交中…' : '提交发言'}
          </Button>
        </div>
      ) : detail.status === 'collecting' ? (
        <p className="text-xs text-muted-foreground">
          {detail.currentSpeakerDisplayName
            ? `等待 ${detail.currentSpeakerDisplayName} 发言…`
            : '依次发言中，请等待轮到你。'}
        </p>
      ) : null}

      {detail.status === 'synthesizing' ? (
        <div className={cn(workbenchInsetPanel, 'p-3')}>
          <h4 className="mb-3 text-sm font-semibold">你被听见了吗？</h4>
          <HeardVoteForm
            detail={detail}
            currentUserId={user?.id}
            submitting={submitting}
            onSubmit={(votes) => void submitHeardVotes({ votes })}
          />
        </div>
      ) : null}

      {detail.status === 'closed' && detail.heardRates?.length ? (
        <div className={cn(workbenchInsetPanel, 'space-y-2 p-3')}>
          <h4 className="text-sm font-semibold">被听见率</h4>
          <ul className="space-y-1">
            {detail.heardRates.map((hr) => (
              <li key={hr.userId} className="flex justify-between text-sm">
                <span>{hr.displayName}</span>
                <span className="font-medium tabular-nums">{Math.round(hr.heardRate * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {detail.interventions.length > 0 ? (
        <div className="space-y-2">
          {detail.interventions.map((item) => (
            <div
              key={item.targetUserId}
              className="rounded-lg border border-gate-confirm-border bg-gate-confirm/15 px-3 py-2 text-sm"
            >
              {item.messageCN}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TaskSummary({ task }: { task: DomainNegotiationTask }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <DomainIcon domain={task.domain} className="text-muted-foreground" />
        <h4 className="text-sm font-semibold tracking-tight">{task.title}</h4>
        <Badge variant="outline" className={cn('text-[10px] font-normal', negotiationStatusClass(task.status))}>
          {task.statusLabel}
        </Badge>
      </div>
      {task.description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>
      ) : null}
      {task.leaderDisplayName || task.endorsementSummary ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {task.leaderDisplayName ? <span>负责人：{task.leaderDisplayName}</span> : null}
          {task.endorsementSummary ? <span>{task.endorsementSummary}</span> : null}
          {typeof task.claimCount === 'number' ? <span>{task.claimCount} 人认领</span> : null}
        </div>
      ) : null}
    </div>
  );
}

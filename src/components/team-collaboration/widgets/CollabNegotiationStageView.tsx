import { useState } from 'react';
import { format } from 'date-fns';
import { Bot, ChevronRight, MessageSquare, RefreshCw, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { WISH_CATEGORY_LABELS } from '@/lib/wishlist-model';
import { CROSS_LEVEL_LABEL, negotiationStatusClass } from '@/components/domain-influence/domain-influence-ui';
import { NegotiationDomainClaimEntry } from '@/components/domain-influence/NegotiationDomainClaimEntry';
import { HeardVoteForm } from '@/components/domain-influence/HeardVoteForm';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { PreferenceRoundDetail, PreferenceRoundUtterance } from '@/types/process-fairness';
import { workbenchInsetPanel } from '@/components/plan-studio/workbench/workbench-ui';
import { CollabNegotiationProgressTimeline } from './CollabNegotiationProgressTimeline';
import { CollabSpeakerOrderBar } from './CollabSpeakerOrderBar';
import { CollabOptionCompareTable } from './CollabOptionCompareTable';
import { CollabNegotiationActionBar } from './CollabNegotiationActionBar';
import { CollabNegotiationTopicHeader } from './CollabNegotiationTopicHeader';
import { buildNegotiationOptions, buildSpeakerSlots } from '@/lib/collab-negotiation-stage';
import { isDecisionProblemNegotiationTask } from '@/lib/collab-negotiation-selection.util';
import { CollabDecisionProblemFollowUpPanel } from '@/components/team-collaboration/widgets/CollabDecisionProblemFollowUpPanel';

function UtteranceRow({ utterance }: { utterance: PreferenceRoundUtterance }) {
  return (
    <div className={cn(workbenchInsetPanel, 'px-3 py-2')}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{utterance.displayName}</span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {format(new Date(utterance.createdAt), 'HH:mm')}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{utterance.content}</p>
      {utterance.reason ? (
        <p className="mt-1 text-xs text-muted-foreground">理由：{utterance.reason}</p>
      ) : null}
    </div>
  );
}

export interface CollabNegotiationStageViewProps {
  tripId: string;
  task: DomainNegotiationTask;
  detail: PreferenceRoundDetail | null;
  roundId: string | null;
  submitting?: boolean;
  currentUserId?: string;
  onRequestTaskRefresh?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onSubmitUtterance?: (payload: { content: string; reason?: string }) => void | Promise<void>;
  onSubmitHeardVotes?: (votes: Array<{ targetUserId: string; heard: boolean }>) => void | Promise<void>;
  onStartVote?: () => void;
  onGenerateCompromise?: () => void;
  onDiscussWithAssistant?: () => void;
  onReachConsensus?: () => void;
  voteActionDisabled?: boolean;
  className?: string;
}

export function CollabNegotiationStageView({
  tripId,
  task,
  detail,
  roundId,
  submitting,
  currentUserId,
  onRequestTaskRefresh,
  onRefresh,
  refreshing,
  onSubmitUtterance,
  onSubmitHeardVotes,
  onStartVote,
  onGenerateCompromise,
  onDiscussWithAssistant,
  onReachConsensus,
  voteActionDisabled,
  className,
}: CollabNegotiationStageViewProps) {
  const [content, setContent] = useState('');
  const [reason, setReason] = useState('');
  const [showFullRecord, setShowFullRecord] = useState(false);

  const speakerSlots = buildSpeakerSlots(detail);
  const options = buildNegotiationOptions(detail, task);

  const handleSubmitUtterance = async () => {
    const trimmed = content.trim();
    if (!trimmed || !onSubmitUtterance) return;
    await onSubmitUtterance({ content: trimmed, reason: reason.trim() || undefined });
    setContent('');
    setReason('');
  };

  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary">结构化协商主舞台</p>
          <CollabNegotiationTopicHeader task={task} detail={detail} className="mt-2" />
        </div>
        {onRefresh ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
            disabled={refreshing}
            onClick={onRefresh}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </Button>
        ) : null}
      </div>

      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground">结构化协商进度</h4>
        <CollabNegotiationProgressTimeline task={task} detail={detail} variant="stage" />
      </section>

      {!roundId ? (
        isDecisionProblemNegotiationTask(task) ? (
          <CollabDecisionProblemFollowUpPanel tripId={tripId} task={task} />
        ) : (
        <div className={cn(workbenchInsetPanel, 'space-y-3 p-4')}>
          <p className="text-sm text-muted-foreground">
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
            <Button type="button" variant="outline" size="sm" onClick={onRequestTaskRefresh}>
              刷新任务列表
            </Button>
          ) : null}
        </div>
        )
      ) : null}

      {roundId && detail ? (
        <>
          {speakerSlots.length > 0 ? (
            <CollabSpeakerOrderBar detail={detail} variant="stage" />
          ) : null}

          {options.length > 0 ? (
            <CollabOptionCompareTable task={task} detail={detail} variant="cards" />
          ) : null}

          {detail.utterances.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">讨论动态</h4>
              <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                {detail.utterances.slice(-4).map((u) => (
                  <UtteranceRow key={u.id} utterance={u} />
                ))}
              </div>
            </div>
          ) : null}

          {detail.interventions.length > 0 ? (
            <div className="space-y-2">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Bot className="h-3.5 w-3.5 text-primary" />
                AI Nara 干预
              </h4>
              {detail.interventions.map((item) => (
                <div
                  key={item.targetUserId}
                  className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm leading-relaxed"
                >
                  <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-primary">
                    <Sparkles className="h-3 w-3" />
                    AI Nara
                  </p>
                  {item.messageCN}
                </div>
              ))}
            </div>
          ) : null}

          {detail.status === 'collecting' && detail.canSpeak ? (
            <div className={cn(workbenchInsetPanel, 'space-y-2 p-3')}>
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
            <div className={cn(workbenchInsetPanel, 'p-4')}>
              <h4 className="mb-3 text-sm font-semibold">你被听见了吗？</h4>
              <HeardVoteForm
                detail={detail}
                currentUserId={currentUserId}
                submitting={submitting}
                onSubmit={(votes) => void onSubmitHeardVotes?.(votes)}
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

          {detail.utterances.length > 4 ? (
            <div className="space-y-2">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1 py-1 text-xs font-medium text-primary hover:underline"
                onClick={() => setShowFullRecord((v) => !v)}
              >
                {showFullRecord ? '收起协商记录' : '查看完整协商记录'}
                <ChevronRight
                  className={cn('h-3.5 w-3.5 transition-transform', showFullRecord && 'rotate-90')}
                />
              </button>
              {showFullRecord ? (
                <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1" aria-label="发言记录">
                  {detail.utterances.map((u) => (
                    <UtteranceRow key={u.id} utterance={u} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {detail.closesAt ? (
            <p className="text-center text-[10px] text-muted-foreground tabular-nums">
              截止 {format(new Date(detail.closesAt), 'MM/dd HH:mm')}
              {' · '}
              <Badge
                variant="outline"
                className={cn('h-5 align-middle text-[10px] font-normal', negotiationStatusClass(task.status))}
              >
                {detail.statusLabel}
              </Badge>
              {' · '}
              {WISH_CATEGORY_LABELS[task.domain] ?? task.domain}
              {' · '}
              {CROSS_LEVEL_LABEL[task.crossLevel]}
            </p>
          ) : null}
        </>
      ) : null}

      <CollabNegotiationActionBar
        onStartVote={onStartVote}
        onGenerateCompromise={onGenerateCompromise}
        onDiscussWithAssistant={onDiscussWithAssistant}
        onReachConsensus={onReachConsensus}
        voteDisabled={voteActionDisabled}
      />
    </div>
  );
}

import { ArrowRight, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildAiConflictPoints,
  buildAiNextSteps,
} from '@/lib/collab-decisions-dashboard.util';
import { useCollabOverview } from '@/hooks/useCollabOverview';
import { workbenchInsetPanel } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';

interface CollabAiSuggestionsPanelProps {
  tripId: string;
  activeTask?: DomainNegotiationTask | null;
  onStartNegotiation?: () => void;
  onStartVote?: () => void;
  onGenerateCompromise?: () => void;
  onDiscussWithAssistant?: () => void;
  className?: string;
}

export function CollabAiSuggestionsPanel({
  tripId,
  activeTask,
  onStartVote,
  onGenerateCompromise,
  onDiscussWithAssistant,
  className,
}: CollabAiSuggestionsPanelProps) {
  const { negotiationTasks, votes, friction } = useCollabOverview(tripId);
  const openVote = votes.find((v) => v.status === 'open');

  const conflictPoints = buildAiConflictPoints({
    tasks: negotiationTasks,
    alerts: friction?.highRiskAlerts,
    openVote,
  });

  const nextSteps = buildAiNextSteps({ activeTask, openVote });

  const insight = activeTask
    ? `「${activeTask.title}」正在协商，主要矛盾可能在体验强度与安全/预算之间。`
    : openVote
      ? `投票「${openVote.title}」进行中，建议先对比中间方案再定稿。`
      : friction?.highRiskAlerts?.[0]
        ? `${friction.highRiskAlerts[0].summary}`
        : '从决策队列选择议题，AI 将协助梳理冲突与妥协路径。';

  return (
    <CollabWidgetCard title="AI 协作建议" className={className} compact>
      <div className={cn(workbenchInsetPanel, 'mb-3 p-3')}>
        <div className="flex gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-foreground">{insight}</p>
        </div>
      </div>

      <div className="mb-3">
        <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">主要矛盾点</p>
        <ul className="space-y-1">
          {conflictPoints.map((point) => (
            <li key={point} className="flex items-center gap-1.5 text-[11px] text-foreground">
              <span className="h-1 w-1 shrink-0 rounded-full bg-primary" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-3">
        <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">AI 推荐下一步</p>
        <ol className="space-y-1.5">
          {nextSteps.map((step, index) => (
            <li key={step} className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {onGenerateCompromise ? (
          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={onGenerateCompromise}>
            生成妥协方案
          </Button>
        ) : null}
        {onStartVote && openVote ? (
          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={onStartVote}>
            发起投票
          </Button>
        ) : null}
        {onDiscussWithAssistant ? (
          <Button type="button" size="sm" className="h-7 gap-1 text-[10px]" onClick={onDiscussWithAssistant}>
            <MessageSquare className="h-3 w-3" />
            与 Nara 讨论
          </Button>
        ) : null}
      </div>
    </CollabWidgetCard>
  );
}

/** 右侧栏 · AI 推荐下一步独立卡片 */
export function CollabAiNextStepsCard({
  tripId,
  activeTask,
  className,
}: {
  tripId: string;
  activeTask?: DomainNegotiationTask | null;
  className?: string;
}) {
  const { votes } = useCollabOverview(tripId);
  const openVote = votes.find((v) => v.status === 'open');
  const nextSteps = buildAiNextSteps({ activeTask, openVote });

  return (
    <CollabWidgetCard title="AI 推荐下一步" className={className} compact>
      <ol className="space-y-2">
        {nextSteps.map((step, index) => (
          <li key={step} className="flex items-start gap-2 text-xs text-muted-foreground">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </CollabWidgetCard>
  );
}

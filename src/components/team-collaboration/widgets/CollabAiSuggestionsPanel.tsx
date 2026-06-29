import { MessageSquare, Handshake, Vote, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCollabOverview } from '@/hooks/useCollabOverview';
import { workbenchInsightPanel } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';

interface CollabAiSuggestionsPanelProps {
  tripId: string;
  onStartNegotiation?: () => void;
  onStartVote?: () => void;
  onGenerateCompromise?: () => void;
  onDiscussWithAssistant?: () => void;
  className?: string;
}

export function CollabAiSuggestionsPanel({
  tripId,
  onStartNegotiation,
  onStartVote,
  onGenerateCompromise,
  onDiscussWithAssistant,
  className,
}: CollabAiSuggestionsPanelProps) {
  const { negotiationTasks, votes, friction, pendingItems } = useCollabOverview(tripId);

  const inDiscussion = negotiationTasks.find((t) => t.status === 'in_discussion');
  const openVote = votes.find((v) => v.status === 'open');
  const topAlert = friction?.highRiskAlerts?.[0];

  const insight = inDiscussion
    ? `「${inDiscussion.title}」正在协商中，建议在澄清观点后再发起投票。`
    : topAlert
      ? `${topAlert.domainLabel}存在${topAlert.memberAName}与${topAlert.memberBName}的分歧：${topAlert.summary}`
      : pendingItems.length > 0
        ? `团队有 ${pendingItems.length} 项待决事项，建议优先处理高优先级议题。`
        : '当前协作状态稳定，可继续完善行程细节。';

  const nextSteps = [
    inDiscussion ? '汇总当前选项的支持率与主要顾虑' : '从待决队列选择一项开启协商',
    openVote && !openVote.myBallotSubmitted ? '提交你的投票意向' : '必要时发起新一轮投票',
    topAlert ? `针对${topAlert.domainLabel}生成妥协方案` : '与 AI 讨论下一步节奏',
  ];

  return (
    <CollabWidgetCard title="AI 协作建议" className={className}>
      <div className={cn(workbenchInsightPanel, 'mb-3 p-3')}>
        <div className="flex gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gate-suggest-foreground" />
          <p className="text-xs leading-relaxed text-foreground">{insight}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {onStartNegotiation ? (
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={onStartNegotiation}>
            <Handshake className="h-3.5 w-3.5" />
            开始协商
          </Button>
        ) : null}
        {onStartVote && openVote ? (
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={onStartVote}>
            <Vote className="h-3.5 w-3.5" />
            参与投票
          </Button>
        ) : null}
        {onGenerateCompromise ? (
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={onGenerateCompromise}>
            <Handshake className="h-3.5 w-3.5" />
            生成妥协
          </Button>
        ) : null}
        {onDiscussWithAssistant ? (
          <Button type="button" size="sm" className="h-8 gap-1 text-xs" onClick={onDiscussWithAssistant}>
            <MessageSquare className="h-3.5 w-3.5" />
            与 Nara 讨论
          </Button>
        ) : null}
      </div>

      <ol className="list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
        {nextSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </CollabWidgetCard>
  );
}

import { Vote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { SilentVoteDetail } from '@/types/silent-votes';
import { SILENT_VOTE_STATUS_LABEL } from '@/lib/silent-vote-labels';
import { workbenchInsetPanel } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';

interface CollabTeamVoteLeanWidgetProps {
  votes: SilentVoteDetail[];
  onOpenVote?: (voteId: string) => void;
  className?: string;
}

export function CollabTeamVoteLeanWidget({
  votes,
  onOpenVote,
  className,
}: CollabTeamVoteLeanWidgetProps) {
  const openVote = votes.find((v) => v.status === 'open') ?? votes[0];
  const distribution = openVote?.aggregate.optionDistribution ?? [];

  return (
    <CollabWidgetCard
      title="团队投票"
      description="成员倾向分布（匿名）"
      className={className}
      compact
    >
      {!openVote ? (
        <p className="text-xs text-muted-foreground">暂无进行中的投票，可在主舞台发起投票。</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{openVote.title}</p>
              <Badge variant="outline" className="mt-1 h-5 text-[10px] font-normal">
                {SILENT_VOTE_STATUS_LABEL[openVote.status]}
              </Badge>
            </div>
            <Vote className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>

          {distribution.length > 0 ? (
            <ul className="space-y-2.5">
              {distribution.map((item) => (
                <li key={item.optionId}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate font-medium text-foreground">{item.label}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {Math.round(item.share * 100)}%
                    </span>
                  </div>
                  <Progress value={Math.round(item.share * 100)} className="h-1.5" />
                </li>
              ))}
            </ul>
          ) : (
            <div className={cn(workbenchInsetPanel, 'p-3 text-xs text-muted-foreground')}>
              {openVote.options.map((opt, index) => (
                <div key={opt.id} className="flex items-center justify-between py-1">
                  <span>方案 {String.fromCharCode(65 + index)}</span>
                  <span>待投票</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">
            已参与 {openVote.aggregate.submittedCount}/{openVote.aggregate.eligibleCount} 人
          </p>

          {onOpenVote ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 w-full text-xs"
              onClick={() => onOpenVote(openVote.id)}
            >
              {openVote.myBallotSubmitted ? '查看投票详情' : '参与投票'}
            </Button>
          ) : null}
        </div>
      )}
    </CollabWidgetCard>
  );
}

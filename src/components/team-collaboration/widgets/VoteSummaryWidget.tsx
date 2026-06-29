import { Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { SilentVoteDetail } from '@/types/silent-votes';
import { CollabWidgetCard } from './CollabWidgetCard';

interface VoteSummaryWidgetProps {
  votes: SilentVoteDetail[];
  onViewAll?: () => void;
  onFeaturedVoteClick?: (voteId: string) => void;
}

export function VoteSummaryWidget({ votes, onViewAll, onFeaturedVoteClick }: VoteSummaryWidgetProps) {
  const openVotes = votes.filter((v) => v.status === 'open');
  const featured = openVotes[0];

  return (
    <CollabWidgetCard
      title="团队投票摘要"
      action={
        onViewAll ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            全部
          </Button>
        ) : null
      }
    >
      {!featured ? (
        <p className="text-xs text-muted-foreground">暂无进行中的投票。</p>
      ) : (
        <button
          type="button"
          className="w-full space-y-2 rounded-lg text-left transition-colors hover:bg-muted/30 disabled:cursor-default"
          onClick={() => onFeaturedVoteClick?.(featured.id)}
          disabled={!onFeaturedVoteClick}
        >
          <div className="flex items-start gap-2 px-1 pt-1">
            <Vote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">{featured.title}</p>
          </div>
          <div className="px-1 text-[10px] text-muted-foreground">
            参与率 {Math.round((featured.aggregate?.participationRate ?? 0) * 100)}%
          </div>
          {featured.options?.slice(0, 2).map((opt) => {
            const dist = featured.aggregate?.optionDistribution?.find((d) => d.optionId === opt.id);
            const share = dist ? Math.round(dist.share * 100) : 0;
            return (
              <div key={opt.id} className="px-1">
                <div className="mb-0.5 flex justify-between text-[10px]">
                  <span className="truncate text-muted-foreground">{opt.label}</span>
                  <span className="tabular-nums">{share}%</span>
                </div>
                <Progress value={share} className="h-1" />
              </div>
            );
          })}
        </button>
      )}
    </CollabWidgetCard>
  );
}

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WishSummary } from '@/types/trip-wishes';
import { CollabWidgetCard } from './CollabWidgetCard';

interface WishSummaryWidgetProps {
  summary: WishSummary | null;
  onViewAll?: () => void;
}

export function WishSummaryWidget({ summary, onViewAll }: WishSummaryWidgetProps) {
  const mine = summary?.mineCount ?? 0;
  const team = summary?.teamCount ?? 0;

  return (
    <CollabWidgetCard
      title="私密想法摘要"
      action={
        onViewAll ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            查看
          </Button>
        ) : null
      }
    >
      <div className="flex items-start gap-2">
        <Heart className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1 text-xs">
          <p className="text-foreground">
            我的心愿 <span className="font-semibold tabular-nums">{mine}</span>
            {' · '}
            团队心愿 <span className="font-semibold tabular-nums">{team}</span>
          </p>
          {summary?.agentEligibleCount ? (
            <p className="text-muted-foreground">
              {summary.agentEligibleCount} 条可纳入行程优化
            </p>
          ) : (
            <p className="text-muted-foreground">记录心愿后 AI 会帮你对齐节奏与预算。</p>
          )}
        </div>
      </div>
    </CollabWidgetCard>
  );
}

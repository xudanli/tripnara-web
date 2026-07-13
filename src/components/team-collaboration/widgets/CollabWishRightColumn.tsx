import type { TeamWishItem, TripWishItem, WishSummary } from '@/types/trip-wishes';
import { CollabWishAiInsightsRow } from './CollabWishAiInsightsRow';
import { CollabWishImpactPanel } from './CollabWishImpactPanel';
import { CollabWishListPanel } from './CollabWishListPanel';
import { cn } from '@/lib/utils';

interface CollabWishRightColumnProps {
  summary: WishSummary | null;
  mine: TripWishItem[];
  team: TeamWishItem[];
  loading?: boolean;
  userDisplayName?: string;
  highlightWishId?: string | null;
  onAskAssistant?: () => void;
  onDeleteMine?: (wishId: string) => void | Promise<void>;
  className?: string;
}

export function CollabWishRightColumn({
  summary,
  mine,
  team,
  loading,
  userDisplayName,
  highlightWishId,
  onAskAssistant,
  onDeleteMine,
  className,
}: CollabWishRightColumnProps) {
  return (
    <div className={cn('flex min-h-0 flex-col gap-1.5', className)}>
      <CollabWishListPanel
        mine={mine}
        team={team}
        loading={loading}
        userDisplayName={userDisplayName}
        highlightWishId={highlightWishId}
        onDeleteMine={onDeleteMine}
      />
      <CollabWishAiInsightsRow
        mine={mine}
        team={team}
        summary={summary}
        onAskAssistant={onAskAssistant}
        variant="stacked"
      />
      <CollabWishImpactPanel
        summary={summary}
        mine={mine}
        team={team}
        loading={loading}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { TeamWishItem, TripWishItem } from '@/types/trip-wishes';
import {
  wishSegmentList,
  wishSegmentTrigger,
} from '@/components/wishlist/wishlist-ui';
import { CollabWidgetCard } from './CollabWidgetCard';
import { CollabWishTableRow } from './CollabWishTableRow';
import { WishEmptyState } from '@/components/wishlist/WishItemCard';

type ListView = 'mine' | 'team';
type TeamFilter = 'all' | 'signed' | 'anonymous' | 'high';

interface CollabWishListPanelProps {
  mine: TripWishItem[];
  team: TeamWishItem[];
  loading?: boolean;
  userDisplayName?: string;
  highlightWishId?: string | null;
  onDeleteMine?: (wishId: string) => void | Promise<void>;
  className?: string;
}

const TEAM_FILTER_TABS: { value: TeamFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'signed', label: '公开' },
  { value: 'anonymous', label: '匿名' },
  { value: 'high', label: '高影响' },
];

export function CollabWishListPanel({
  mine,
  team,
  loading,
  userDisplayName,
  highlightWishId,
  onDeleteMine,
  className,
}: CollabWishListPanelProps) {
  const [listView, setListView] = useState<ListView>('mine');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');

  useEffect(() => {
    if (!highlightWishId) return;
    if (mine.some((w) => w.id === highlightWishId)) setListView('mine');
    else if (team.some((w) => w.id === highlightWishId)) setListView('team');
  }, [highlightWishId, mine, team]);

  const filteredTeam = useMemo(() => {
    let items = team;
    if (teamFilter === 'signed') items = items.filter((w) => w.visibility === 'signed');
    if (teamFilter === 'anonymous') items = items.filter((w) => w.visibility === 'anonymous');
    if (teamFilter === 'high') items = items.filter((w) => w.importance >= 4);
    return items;
  }, [team, teamFilter]);

  const activeItems = listView === 'mine' ? mine : filteredTeam;
  const preview = activeItems.slice(0, 8);

  return (
    <CollabWidgetCard title="心愿列表" compact className={className}>
      <Tabs value={listView} onValueChange={(v) => setListView(v as ListView)}>
        <TabsList className={cn(wishSegmentList, 'mb-1.5 h-7')}>
          <TabsTrigger value="mine" className={cn('h-6 px-2.5 text-[11px]', wishSegmentTrigger)}>
            我的心愿
            <span className="ml-1 tabular-nums text-muted-foreground">{mine.length}</span>
          </TabsTrigger>
          <TabsTrigger value="team" className={cn('h-6 gap-1 px-2.5 text-[11px]', wishSegmentTrigger)}>
            <Users className="h-3 w-3" />
            团队心愿
            <span className="ml-1 tabular-nums text-muted-foreground">{team.length}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {listView === 'team' ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {TEAM_FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setTeamFilter(tab.value)}
              className={cn(
                'rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
                teamFilter === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-5 w-5" />
        </div>
      ) : activeItems.length === 0 ? (
        listView === 'mine' ? (
          <WishEmptyState />
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {team.length === 0
              ? '邀请成员后可见团队心愿，或将心愿设为「匿名」/「公开」'
              : '当前筛选下暂无心愿'}
          </p>
        )
      ) : (
        <div className="rounded-md border border-border/60">
          {preview.map((wish) => (
            <CollabWishTableRow
              key={wish.id}
              wish={wish}
              teamWallView={listView === 'team'}
              authorName={userDisplayName}
              highlighted={wish.id === highlightWishId}
              onDelete={
                listView === 'mine' && onDeleteMine
                  ? () => void onDeleteMine(wish.id)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {activeItems.length > preview.length ? (
        <button
          type="button"
          className="mt-2 flex w-full items-center justify-center gap-0.5 text-[10px] text-primary hover:underline"
        >
          查看全部 {activeItems.length} 条心愿
          <ChevronRight className="h-3 w-3" />
        </button>
      ) : null}
    </CollabWidgetCard>
  );
}

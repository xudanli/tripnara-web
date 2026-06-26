import { useCallback, useState } from 'react';
import { Heart, LayoutGrid, PenLine, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useTripWishes } from '@/hooks/useTripWishes';
import type { WishDraft } from '@/lib/wish-draft';
import { WishCardPicker } from './WishCardPicker';
import { WishFreeForm } from './WishFreeForm';
import { WishInspirationGallery } from './WishInspirationGallery';
import { WishEmptyState, WishItemCard } from './WishItemCard';
import {
  wishEmptyBox,
  wishInputTabsList,
  wishPanel,
  wishPanelBody,
  wishPanelHeader,
  wishSegmentList,
  wishSegmentTrigger,
} from './wishlist-ui';

type InputMode = 'cards' | 'free' | 'inspiration';

interface PrivateWishlistPanelProps {
  tripId: string;
  destinationLabel?: string;
  userDisplayName?: string;
  className?: string;
  onSummaryChange?: () => void;
  /** 嵌入居中弹窗时隐藏外层卡片与标题 */
  embedded?: boolean;
}

export function PrivateWishlistPanel({
  tripId,
  destinationLabel = '冰岛',
  userDisplayName = '我',
  className,
  onSummaryChange,
  embedded = false,
}: PrivateWishlistPanelProps) {
  const {
    mine,
    team,
    summary,
    loading,
    submitting,
    createFreeText,
    createFromCard,
    createFromInspiration,
    createFromVoice,
    updateWish,
    archiveWish,
  } = useTripWishes(tripId);

  const [inputMode, setInputMode] = useState<InputMode>('free');
  const [listView, setListView] = useState<'mine' | 'team'>('mine');

  const afterMutation = useCallback(() => {
    onSummaryChange?.();
  }, [onSummaryChange]);

  const handleSubmit = useCallback(
    async (draft: WishDraft) => {
      if (draft.voiceTranscriptId) {
        await createFromVoice({
          voiceTranscriptId: draft.voiceTranscriptId,
          text: draft.text,
          category: draft.category,
          importance: draft.importance,
          visibility: draft.visibility,
        });
      } else if (draft.cardId) {
        await createFromCard(draft.cardId, {
          text: draft.text,
          importance: draft.importance,
          visibility: draft.visibility,
        });
      } else if (draft.inspirationAssetId) {
        await createFromInspiration({
          inspirationAssetId: draft.inspirationAssetId,
          visibility: draft.visibility,
          importance: draft.importance,
          textOverride: draft.text,
        });
      } else {
        await createFreeText({
          category: draft.category,
          text: draft.text,
          importance: draft.importance,
          visibility: draft.visibility,
        });
      }
      afterMutation();
    },
    [
      createFreeText,
      createFromCard,
      createFromInspiration,
      createFromVoice,
      afterMutation,
    ],
  );

  const mineCount = summary?.mineCount ?? mine.length;

  return (
    <section className={cn(embedded ? 'overflow-hidden' : wishPanel, className)}>
      {!embedded ? (
        <div className={wishPanelHeader}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </span>
                <h2 className="text-base font-semibold tracking-tight">我的心愿单</h2>
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                记录个人偏好，规划时 AI 会参考；默认仅自己可见
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {destinationLabel}
              </Badge>
              <Badge variant="secondary" className="font-normal">
                {mineCount} 条心愿
              </Badge>
              {summary && summary.privateCount > 0 ? (
                <Badge variant="secondary" className="font-normal">
                  {summary.privateCount} 条私密
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className={cn('grid gap-0 lg:grid-cols-2', embedded ? 'lg:gap-6' : 'lg:divide-x')}>
        <div className={embedded ? 'min-w-0 space-y-4' : wishPanelBody}>
          <Tabs
            value={inputMode}
            onValueChange={(v) => setInputMode(v as InputMode)}
            className="space-y-4"
          >
            <TabsList className={wishInputTabsList}>
              <TabsTrigger value="cards" className={cn('gap-1', wishSegmentTrigger)}>
                <LayoutGrid className="h-3.5 w-3.5" />
                推荐卡片
              </TabsTrigger>
              <TabsTrigger value="free" className={cn('gap-1', wishSegmentTrigger)}>
                <PenLine className="h-3.5 w-3.5" />
                自由表达
              </TabsTrigger>
              <TabsTrigger value="inspiration" className={cn('gap-1', wishSegmentTrigger)}>
                <Heart className="h-3.5 w-3.5" />
                灵感浏览
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cards" className="mt-0">
              <WishCardPicker tripId={tripId} onSubmit={handleSubmit} submitting={submitting} />
            </TabsContent>
            <TabsContent value="free" className="mt-0">
              <WishFreeForm tripId={tripId} onSubmit={handleSubmit} submitting={submitting} />
            </TabsContent>
            <TabsContent value="inspiration" className="mt-0">
              <WishInspirationGallery
                tripId={tripId}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className={embedded ? 'min-w-0 space-y-4' : wishPanelBody}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <Tabs value={listView} onValueChange={(v) => setListView(v as 'mine' | 'team')}>
              <TabsList className={cn(wishSegmentList, 'h-8')}>
                <TabsTrigger value="mine" className={cn('h-7 px-3', wishSegmentTrigger)}>
                  我的心愿
                </TabsTrigger>
                <TabsTrigger value="team" className={cn('h-7 gap-1 px-3', wishSegmentTrigger)}>
                  <Users className="h-3 w-3" />
                  团队心愿
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {loading ? <Spinner className="h-4 w-4" /> : null}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-6 w-6" />
            </div>
          ) : listView === 'mine' ? (
            mine.length === 0 ? (
              <WishEmptyState />
            ) : (
              <ul className="space-y-3">
                {mine.map((wish) => (
                  <li key={wish.id}>
                    <WishItemCard
                      wish={wish}
                      onVisibilityChange={async (v) => {
                        await updateWish(wish.id, { visibility: v });
                        afterMutation();
                      }}
                      onDelete={async () => {
                        await archiveWish(wish.id);
                        afterMutation();
                      }}
                    />
                  </li>
                ))}
              </ul>
            )
          ) : team.length === 0 ? (
            <div className={wishEmptyBox}>
              <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">团队心愿为空</p>
              <p className="mt-1 text-xs text-muted-foreground">
                将心愿设为「匿名」或「署名」后，队友可见
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {team.map((wish) => (
                <li key={wish.id}>
                  <WishItemCard wish={wish} displayName={userDisplayName} teamWallView />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

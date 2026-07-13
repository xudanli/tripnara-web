import type { ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { CollabWishTableRow } from '@/components/team-collaboration/widgets/CollabWishTableRow';
import { CollabWidgetCard } from '@/components/team-collaboration/widgets/CollabWidgetCard';
import { collabDashboardGrid, collabDashboardSpan, collabPageStack } from '@/components/team-collaboration/collab-dashboard-layout';
import type { TeamWishItem, TripWishItem, WishCategory, WishSummary, WishVisibility } from '@/types/trip-wishes';
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
  /** 协作中心三列布局 */
  collabCenterLayout?: boolean;
  /** 协作中心顶栏（统计 + AI 摘要） */
  renderCollabHeader?: (ctx: {
    summary: WishSummary | null;
    mine: TripWishItem[];
    team: TeamWishItem[];
    loading: boolean;
  }) => ReactNode;
  /** 协作中心右侧栏 */
  renderCollabSidebar?: (ctx: {
    summary: WishSummary | null;
    mine: TripWishItem[];
    team: TeamWishItem[];
    loading: boolean;
    onDeleteMine: (wishId: string) => Promise<void>;
  }) => ReactNode;
  /** 协作中心底部全宽区 */
  renderCollabFooter?: (ctx: {
    summary: WishSummary | null;
    mine: TripWishItem[];
    team: TeamWishItem[];
    loading: boolean;
  }) => ReactNode;
  /** URL 深链 ?wishId= */
  highlightWishId?: string | null;
  onHighlightWishConsumed?: () => void;
  /** 协作中心：表单区 ref，供顶部 CTA 滚动定位 */
  formSectionRef?: RefObject<HTMLDivElement | null>;
  onWishSubmit?: (payload: { visibility: WishVisibility; category: WishCategory }) => void;
}

export function PrivateWishlistPanel({
  tripId,
  destinationLabel = '冰岛',
  userDisplayName = '我',
  className,
  onSummaryChange,
  embedded = false,
  collabCenterLayout = false,
  renderCollabHeader,
  renderCollabSidebar,
  renderCollabFooter,
  highlightWishId,
  onHighlightWishConsumed,
  onWishSubmit,
  formSectionRef,
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
  const highlightHandledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!highlightWishId || loading) return;
    if (highlightHandledRef.current === highlightWishId) return;

    const inMine = mine.some((w) => w.id === highlightWishId);
    const inTeam = team.some((w) => w.id === highlightWishId);
    if (!inMine && !inTeam) return;

    highlightHandledRef.current = highlightWishId;
    setListView(inMine ? 'mine' : 'team');
    onHighlightWishConsumed?.();

    window.requestAnimationFrame(() => {
      document
        .getElementById(`wish-item-${highlightWishId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [highlightWishId, loading, mine, team, onHighlightWishConsumed]);

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
      onWishSubmit?.({ visibility: draft.visibility, category: draft.category });
      afterMutation();
    },
    [
      createFreeText,
      createFromCard,
      createFromInspiration,
      createFromVoice,
      afterMutation,
      onWishSubmit,
    ],
  );

  const mineCount = summary?.mineCount ?? mine.length;
  const includedWishIds = new Set(
    summary?.impactByDay?.flatMap((day) => day.wishIds) ?? [],
  );

  const formInner = (
    <div className={collabCenterLayout ? 'flex min-h-0 flex-1 flex-col' : undefined}>
      <Tabs
        value={inputMode}
        onValueChange={(v) => setInputMode(v as InputMode)}
        className={cn(
          collabCenterLayout ? 'flex min-h-0 flex-1 flex-col' : 'space-y-4',
        )}
      >
        {!collabCenterLayout ? (
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
        ) : null}

        {!collabCenterLayout ? (
          <>
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
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <WishFreeForm
              tripId={tripId}
              onSubmit={handleSubmit}
              submitting={submitting}
              collabMode
            />
          </div>
        )}
      </Tabs>
    </div>
  );

  const formSection = (
    <div
      ref={formSectionRef}
      className={
        collabCenterLayout
          ? 'flex h-full min-h-0 min-w-0 flex-col'
          : embedded
            ? 'min-w-0 space-y-4'
            : wishPanelBody
      }
    >
      {collabCenterLayout ? (
        <CollabWidgetCard title="录入心愿" compact className="shrink-0 !p-2.5">
          {formInner}
        </CollabWidgetCard>
      ) : (
        formInner
      )}
    </div>
  );

  const listInner = (
    <>
      {!collabCenterLayout || loading ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          {!collabCenterLayout ? (
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
          ) : null}
          {loading ? <Spinner className="h-4 w-4" /> : null}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : collabCenterLayout || listView === 'mine' ? (
        <>
          {mine.length === 0 ? (
            <WishEmptyState />
          ) : collabCenterLayout ? (
            <>
              <div className="rounded-md border border-border/60">
                {mine.slice(0, 6).map((wish) => (
                  <div key={wish.id} id={`wish-item-${wish.id}`}>
                    <CollabWishTableRow
                      wish={wish}
                      highlighted={wish.id === highlightWishId}
                      onDelete={async () => {
                        await archiveWish(wish.id);
                        afterMutation();
                      }}
                    />
                  </div>
                ))}
              </div>
              {mine.length > 6 ? (
                <p className="mt-2 text-center text-[10px] text-primary">
                  查看全部 {mine.length} 条心愿 →
                </p>
              ) : null}
            </>
          ) : (
            <ul
              className={cn(
                'space-y-1.5',
                collabCenterLayout &&
                  'max-h-[min(140px,22vh)] overflow-y-auto pr-0.5 scrollbar-auto-hide',
              )}
            >
              {mine.map((wish) => (
                <li key={wish.id} id={`wish-item-${wish.id}`}>
                  <WishItemCard
                    wish={wish}
                    highlighted={wish.id === highlightWishId}
                    collabLayout={collabCenterLayout}
                    includedInPlan={includedWishIds.has(wish.id)}
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
          )}
          {!collabCenterLayout && team.length > 0 ? (
            <div className="mt-6 space-y-3 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-foreground">团队心愿</h3>
                <button
                  type="button"
                  className="text-[10px] text-primary hover:underline"
                  onClick={() => setListView('team')}
                >
                  查看全部团队心愿 ({team.length}条)
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {team.slice(0, 4).map((wish) => (
                  <WishItemCard
                    key={wish.id}
                    wish={wish}
                    displayName={userDisplayName}
                    teamWallView
                    collabLayout
                    compact
                    highlighted={wish.id === highlightWishId}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : team.length === 0 ? (
        <div className={wishEmptyBox}>
          <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">团队心愿为空</p>
          <p className="mt-1 text-xs text-muted-foreground">
            邀请成员后可见团队心愿，或将心愿设为「匿名」/「署名」
          </p>
        </div>
      ) : collabCenterLayout ? (
        <div className="rounded-md border border-border/60">
          {team.map((wish) => (
            <div key={wish.id} id={`wish-item-${wish.id}`}>
              <CollabWishTableRow
                wish={wish}
                teamWallView
                authorName={userDisplayName}
                highlighted={wish.id === highlightWishId}
              />
            </div>
          ))}
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {team.map((wish) => (
            <li key={wish.id} id={`wish-item-${wish.id}`}>
              <WishItemCard
                wish={wish}
                displayName={userDisplayName}
                teamWallView
                collabLayout={collabCenterLayout}
                compact={collabCenterLayout}
                highlighted={wish.id === highlightWishId}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const listSection = (
    <div
      className={
        collabCenterLayout
          ? 'flex h-full min-h-0 min-w-0 flex-col'
          : embedded
            ? 'min-w-0 space-y-4'
            : wishPanelBody
      }
    >
      {collabCenterLayout ? (
        <CollabWidgetCard title="我的心愿" compact className="min-h-0 flex-1">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-0.5 scrollbar-auto-hide">
            {listInner}
          </div>
        </CollabWidgetCard>
      ) : (
        <>
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
            <>
              {mine.length === 0 ? (
                <WishEmptyState />
              ) : (
                <ul className="space-y-1.5">
                  {mine.map((wish) => (
                    <li key={wish.id} id={`wish-item-${wish.id}`}>
                      <WishItemCard
                        wish={wish}
                        highlighted={wish.id === highlightWishId}
                        collabLayout={false}
                        includedInPlan={includedWishIds.has(wish.id)}
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
              )}
            </>
          ) : team.length === 0 ? (
            <div className={wishEmptyBox}>
              <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">团队心愿为空</p>
              <p className="mt-1 text-xs text-muted-foreground">
                邀请成员后可见团队心愿，或将心愿设为「匿名」/「署名」
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {team.map((wish) => (
                <li key={wish.id} id={`wish-item-${wish.id}`}>
                  <WishItemCard
                    wish={wish}
                    displayName={userDisplayName}
                    teamWallView
                    collabLayout={false}
                    highlighted={wish.id === highlightWishId}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );

  const handleDeleteMine = useCallback(
    async (wishId: string) => {
      await archiveWish(wishId);
      afterMutation();
    },
    [archiveWish, afterMutation],
  );

  const wishCtx = {
    summary,
    mine,
    team,
    loading,
    onDeleteMine: handleDeleteMine,
  };

  if (collabCenterLayout) {
    return (
      <section className={cn(collabPageStack, className)}>
        {renderCollabHeader ? renderCollabHeader(wishCtx) : null}
        <div className={cn(collabDashboardGrid, 'items-start')}>
          <div className={cn(collabDashboardSpan({ md: 6, lg: 4 }), 'flex min-h-0 flex-col')}>
            {formSection}
          </div>
          {renderCollabSidebar ? (
            <div className={cn(collabDashboardSpan({ md: 6, lg: 8 }), 'flex min-h-0 flex-col')}>
              {renderCollabSidebar(wishCtx)}
            </div>
          ) : null}
        </div>
        {renderCollabFooter ? renderCollabFooter(wishCtx) : null}
      </section>
    );
  }

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
        {formSection}
        {listSection}
      </div>
    </section>
  );
}
